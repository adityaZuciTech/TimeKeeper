package com.timekeeper.service;

import com.timekeeper.dto.request.CreateEmployeeRequest;
import com.timekeeper.dto.response.EmployeeResponse;
import com.timekeeper.entity.Department;
import com.timekeeper.entity.Employee;
import com.timekeeper.exception.BusinessException;
import com.timekeeper.repository.DepartmentRepository;
import com.timekeeper.repository.EmployeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {

    @Mock EmployeeRepository employeeRepository;
    @Mock DepartmentRepository departmentRepository;
    @Mock PasswordEncoder passwordEncoder;

    @InjectMocks EmployeeService employeeService;

    private Department dept;

    @BeforeEach
    void setUp() {
        dept = new Department();
        dept.setId("dept_01");
        dept.setName("Engineering");
    }

    // ── EMP-01: create valid employee → ACTIVE ────────────────────────────────
    @Test
    void create_validRequest_returnsActiveEmployee() {
        when(employeeRepository.existsByEmail("alice@example.com")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("hashed_password");
        when(departmentRepository.findById("dept_01")).thenReturn(Optional.of(dept));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(inv -> {
            Employee e = inv.getArgument(0);
            e.setId("emp_new");
            return e;
        });

        CreateEmployeeRequest req = new CreateEmployeeRequest();
        req.setName("Alice Smith");
        req.setEmail("alice@example.com");
        req.setPassword("password123");
        req.setRole(Employee.Role.EMPLOYEE);
        req.setDepartmentId("dept_01");

        EmployeeResponse response = employeeService.create(req);

        assertThat(response.getId()).isEqualTo("emp_new");
        assertThat(response.getStatus()).isEqualTo("ACTIVE");
        assertThat(response.getEmail()).isEqualTo("alice@example.com");
        assertThat(response.getDepartmentId()).isEqualTo("dept_01");
    }

    // ── EMP-02: duplicate email throws BusinessException ──────────────────────
    @Test
    void create_duplicateEmail_throwsBusinessException() {
        when(employeeRepository.existsByEmail("alice@example.com")).thenReturn(true);

        CreateEmployeeRequest req = new CreateEmployeeRequest();
        req.setName("Alice Smith");
        req.setEmail("alice@example.com");
        req.setPassword("password123");
        req.setRole(Employee.Role.EMPLOYEE);

        assertThatThrownBy(() -> employeeService.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Email already registered");
    }

    // ── EMP-03: manager from different department blocks creation ─────────────
    @Test
    void create_managerFromDifferentDepartment_throwsBusinessException() {
        Department otherDept = new Department();
        otherDept.setId("dept_02");
        otherDept.setName("Finance");

        Employee manager = new Employee();
        manager.setId("mgr_001");
        manager.setRole(Employee.Role.MANAGER);
        manager.setDepartment(otherDept); // belongs to Finance, not Engineering

        when(employeeRepository.existsByEmail(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("hashed_password");
        when(departmentRepository.findById("dept_01")).thenReturn(Optional.of(dept));
        when(employeeRepository.findById("mgr_001")).thenReturn(Optional.of(manager));

        CreateEmployeeRequest req = new CreateEmployeeRequest();
        req.setName("Bob Jones");
        req.setEmail("bob@example.com");
        req.setPassword("password123");
        req.setRole(Employee.Role.EMPLOYEE);
        req.setDepartmentId("dept_01");
        req.setManagerId("mgr_001");

        assertThatThrownBy(() -> employeeService.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Manager must belong to the same department");
    }

    // ── EMP-07: deactivate employee sets status to INACTIVE ───────────────────
    @Test
    void updateStatus_deactivatesEmployee() {
        Employee active = new Employee();
        active.setId("emp_001");
        active.setName("Carol White");
        active.setEmail("carol@example.com");
        active.setRole(Employee.Role.EMPLOYEE);
        active.setStatus(Employee.EmployeeStatus.ACTIVE);
        active.setDepartment(dept);

        when(employeeRepository.findById("emp_001")).thenReturn(Optional.of(active));
        when(employeeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        EmployeeResponse response = employeeService.updateStatus("emp_001", Employee.EmployeeStatus.INACTIVE);

        assertThat(response.getStatus()).isEqualTo("INACTIVE");
        verify(employeeRepository).save(argThat(e -> e.getStatus() == Employee.EmployeeStatus.INACTIVE));
    }

    // ── EMP-08: reactivate employee sets status back to ACTIVE ────────────────
    @Test
    void updateStatus_reactivatesEmployee() {
        Employee inactive = new Employee();
        inactive.setId("emp_002");
        inactive.setName("Dave Brown");
        inactive.setEmail("dave@example.com");
        inactive.setRole(Employee.Role.EMPLOYEE);
        inactive.setStatus(Employee.EmployeeStatus.INACTIVE);
        inactive.setDepartment(dept);

        when(employeeRepository.findById("emp_002")).thenReturn(Optional.of(inactive));
        when(employeeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        EmployeeResponse response = employeeService.updateStatus("emp_002", Employee.EmployeeStatus.ACTIVE);

        assertThat(response.getStatus()).isEqualTo("ACTIVE");
        verify(employeeRepository).save(argThat(e -> e.getStatus() == Employee.EmployeeStatus.ACTIVE));
    }
}
