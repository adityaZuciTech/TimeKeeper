package com.timekeeper.service;

import com.timekeeper.dto.request.ChangePasswordRequest;
import com.timekeeper.dto.request.LoginRequest;
import com.timekeeper.dto.response.LoginResponse;
import com.timekeeper.entity.Employee;
import com.timekeeper.exception.BusinessException;
import com.timekeeper.repository.EmployeeRepository;
import com.timekeeper.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService implements IAuthService {

    private final EmployeeRepository employeeRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;

    public LoginResponse login(LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        // Reuse the principal already loaded by AuthenticationManager — no second DB call
        Employee employee = (Employee) auth.getPrincipal();

        String token = jwtService.generateToken(employee);

        return LoginResponse.builder()
                .token(token)
                .id(employee.getId())
                .name(employee.getName())
                .email(employee.getEmail())
                .role(employee.getRole().name())
                .departmentId(employee.getDepartment() != null ? employee.getDepartment().getId() : null)
                .departmentName(employee.getDepartment() != null ? employee.getDepartment().getName() : null)
                .managerId(employee.getManagerId())
                .build();
    }

    public void changePassword(String employeeId, ChangePasswordRequest request) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new BusinessException("Employee not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), employee.getPassword())) {
            log.warn("[CHANGE PASSWORD] Incorrect current password attempt for employee id={} email={}",
                    employeeId, employee.getEmail());
            throw new BusinessException("Current password is incorrect");
        }

        employee.setPassword(passwordEncoder.encode(request.getNewPassword()));
        employeeRepository.save(employee);
        log.info("[CHANGE PASSWORD] Password updated successfully for employee id={} email={}",
                employeeId, employee.getEmail());
    }
}
