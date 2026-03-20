package com.timekeeper.service;

import com.timekeeper.dto.request.ChangePasswordRequest;
import com.timekeeper.dto.request.LoginRequest;
import com.timekeeper.dto.response.LoginResponse;
import com.timekeeper.entity.Employee;
import com.timekeeper.repository.EmployeeRepository;
import com.timekeeper.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock AuthenticationManager authenticationManager;
    @Mock JwtService jwtService;
    @Mock EmployeeRepository employeeRepository;
    @Mock PasswordEncoder passwordEncoder;

    @InjectMocks AuthService authService;

    private Employee testEmployee;

    @BeforeEach
    void setUp() {
        testEmployee = new Employee();
        testEmployee.setId("emp_001");
        testEmployee.setName("Alice Smith");
        testEmployee.setEmail("alice@example.com");
        testEmployee.setPassword("encodedPassword");
        testEmployee.setRole(Employee.Role.EMPLOYEE);
    }

    @Test
    void login_validCredentials_returnsToken() {
        var authToken = new UsernamePasswordAuthenticationToken(testEmployee, null, testEmployee.getAuthorities());
        when(authenticationManager.authenticate(any())).thenReturn(authToken);
        when(jwtService.generateToken(testEmployee)).thenReturn("jwt-token-abc");

        LoginRequest request = new LoginRequest();
        request.setEmail("alice@example.com");
        request.setPassword("password123");

        LoginResponse response = authService.login(request);

        assertThat(response.getToken()).isEqualTo("jwt-token-abc");
        assertThat(response.getEmail()).isEqualTo("alice@example.com");
        assertThat(response.getName()).isEqualTo("Alice Smith");
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    void login_badCredentials_throws() {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("bad creds"));

        LoginRequest request = new LoginRequest();
        request.setEmail("alice@example.com");
        request.setPassword("wrong");

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void changePassword_correctCurrentPassword_updatesSuccessfully() {
        when(employeeRepository.findById("emp_001")).thenReturn(Optional.of(testEmployee));
        when(passwordEncoder.matches("oldPass", "encodedPassword")).thenReturn(true);
        when(passwordEncoder.encode("newPass8chars")).thenReturn("newlyEncodedPassword");

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldPass");
        request.setNewPassword("newPass8chars");

        authService.changePassword("emp_001", request);

        verify(employeeRepository).save(argThat(e -> e.getPassword().equals("newlyEncodedPassword")));
    }

    @Test
    void changePassword_wrongCurrentPassword_throwsBusinessException() {
        when(employeeRepository.findById("emp_001")).thenReturn(Optional.of(testEmployee));
        when(passwordEncoder.matches("wrong", "encodedPassword")).thenReturn(false);

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("wrong");
        request.setNewPassword("newPass8chars");

        assertThatThrownBy(() -> authService.changePassword("emp_001", request))
                .hasMessage("Current password is incorrect");
    }

    @Test
    void changePassword_employeeNotFound_throwsResourceNotFoundException() {
        when(employeeRepository.findById("nonexistent")).thenReturn(Optional.empty());

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("any");
        request.setNewPassword("anyPass8c");

        assertThatThrownBy(() -> authService.changePassword("nonexistent", request))
                .hasMessage("Employee not found");
    }
}
