package com.timekeeper.service;

import com.timekeeper.dto.request.CreateEmployeeRequest;
import com.timekeeper.dto.request.UpdateEmployeeRequest;
import com.timekeeper.dto.response.EmployeeResponse;
import com.timekeeper.entity.Department;
import com.timekeeper.entity.Employee;
import com.timekeeper.exception.BusinessException;
import com.timekeeper.exception.ResourceNotFoundException;
import com.timekeeper.repository.DepartmentRepository;
import com.timekeeper.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;

    public EmployeeResponse create(CreateEmployeeRequest request) {
        if (employeeRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("Email already registered: " + request.getEmail());
        }

        Department department = null;
        if (request.getDepartmentId() != null) {
            department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + request.getDepartmentId()));
        }

        Employee employee = Employee.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .department(department)
                .managerId(request.getManagerId())
                .status(Employee.EmployeeStatus.ACTIVE)
                .build();

        if (request.getManagerId() != null && department != null) {
            Employee manager = employeeRepository.findById(request.getManagerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Manager not found: " + request.getManagerId()));
            if (manager.getDepartment() != null && !manager.getDepartment().getId().equals(department.getId())) {
                throw new BusinessException("Manager must belong to the same department as the employee");
            }
        }

        employee = employeeRepository.save(employee);
        return toResponse(employee);
    }

    public EmployeeResponse getById(String id) {
        return employeeRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + id));
    }

    public List<EmployeeResponse> getAll(String departmentId, String status) {
        List<Employee> employees;
        if (departmentId != null && status != null) {
            employees = employeeRepository.findByDepartmentIdAndStatus(
                    departmentId, Employee.EmployeeStatus.valueOf(status));
        } else if (departmentId != null) {
            employees = employeeRepository.findByDepartmentId(departmentId);
        } else if (status != null) {
            employees = employeeRepository.findByStatus(Employee.EmployeeStatus.valueOf(status));
        } else {
            employees = employeeRepository.findAll();
        }
        return employees.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public EmployeeResponse update(String id, UpdateEmployeeRequest request) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + id));

        if (request.getName() != null) employee.setName(request.getName());
        if (request.getRole() != null) employee.setRole(request.getRole());
        if (request.getManagerId() != null) employee.setManagerId(request.getManagerId());

        if (request.getDepartmentId() != null) {
            Department department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + request.getDepartmentId()));
            employee.setDepartment(department);
        }

        // Validate manager belongs to same department
        String resolvedManagerId = request.getManagerId() != null ? request.getManagerId() : employee.getManagerId();
        Department resolvedDept = employee.getDepartment();
        if (resolvedManagerId != null && resolvedDept != null) {
            Employee manager = employeeRepository.findById(resolvedManagerId)
                    .orElseThrow(() -> new ResourceNotFoundException("Manager not found: " + resolvedManagerId));
            if (manager.getDepartment() != null && !manager.getDepartment().getId().equals(resolvedDept.getId())) {
                throw new BusinessException("Manager must belong to the same department as the employee");
            }
        }

        employee = employeeRepository.save(employee);
        return toResponse(employee);
    }

    public EmployeeResponse updateStatus(String id, Employee.EmployeeStatus status) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + id));
        employee.setStatus(status);
        employee = employeeRepository.save(employee);
        return toResponse(employee);
    }

    public List<EmployeeResponse> getTeam(String managerId) {
        return employeeRepository.findByManagerId(managerId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<EmployeeResponse> getDepartmentEmployees(String departmentId) {
        return employeeRepository.findByDepartmentId(departmentId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public EmployeeResponse toResponse(Employee employee) {
        return EmployeeResponse.builder()
                .id(employee.getId())
                .name(employee.getName())
                .email(employee.getEmail())
                .role(employee.getRole().name())
                .departmentId(employee.getDepartment() != null ? employee.getDepartment().getId() : null)
                .departmentName(employee.getDepartment() != null ? employee.getDepartment().getName() : null)
                .managerId(employee.getManagerId())
                .status(employee.getStatus().name())
                .build();
    }
}
