package com.timekeeper.service;

import com.timekeeper.dto.request.CreateLeaveRequest;
import com.timekeeper.dto.request.LeaveActionRequest;
import com.timekeeper.entity.Department;
import com.timekeeper.entity.Employee;
import com.timekeeper.entity.Leave;
import com.timekeeper.exception.BusinessException;
import org.springframework.security.access.AccessDeniedException;
import com.timekeeper.repository.EmployeeRepository;
import com.timekeeper.repository.HolidayRepository;
import com.timekeeper.repository.LeaveRepository;
import com.timekeeper.service.impl.LeaveServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveServiceTest {

    @Mock LeaveRepository leaveRepository;
    @Mock EmployeeRepository employeeRepository;
    @Mock HolidayRepository holidayRepository;
    @Mock NotificationService notificationService;

    @InjectMocks LeaveServiceImpl leaveService;

    private Employee employee;

    @BeforeEach
    void setUp() {
        Department dept = new Department();
        dept.setId("dept_01");
        dept.setName("Engineering");

        employee = new Employee();
        employee.setId("emp_001");
        employee.setName("Bob Jones");
        employee.setEmail("bob@example.com");
        employee.setDepartment(dept);
        employee.setRole(Employee.Role.EMPLOYEE);
    }

    @Test
    void applyLeave_validFutureDate_createsLeave() {
        LocalDate start = LocalDate.now().plusDays(3);
        LocalDate end   = start.plusDays(1);

        CreateLeaveRequest req = new CreateLeaveRequest();
        req.setStartDate(start);
        req.setEndDate(end);
        req.setLeaveType(Leave.LeaveType.VACATION);
        req.setReason("Family event");

        when(leaveRepository.findPendingOrApprovedOverlapping(any(), any(), any())).thenReturn(List.of());
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(employeeRepository.findById("emp_001")).thenReturn(Optional.of(employee));
        when(leaveRepository.save(any(Leave.class))).thenAnswer(inv -> {
            Leave l = inv.getArgument(0);
            l.setId("leave_001");
            l.setStatus(Leave.LeaveStatus.PENDING);
            return l;
        });

        var response = leaveService.applyLeave("emp_001", req);

        assertThat(response.getId()).isEqualTo("leave_001");
        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.getEmployeeId()).isEqualTo("emp_001");
    }

    @Test
    void applyLeave_pastDate_isAllowed() {
        // Past-date leave is now allowed (sick leave use case)
        LocalDate start = LocalDate.now().minusDays(2);
        LocalDate end   = LocalDate.now().minusDays(1);

        CreateLeaveRequest req = new CreateLeaveRequest();
        req.setStartDate(start);
        req.setEndDate(end);
        req.setLeaveType(Leave.LeaveType.SICK);
        req.setReason("Was ill");

        when(leaveRepository.findPendingOrApprovedOverlapping(any(), any(), any())).thenReturn(List.of());
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(employeeRepository.findById("emp_001")).thenReturn(Optional.of(employee));
        when(leaveRepository.save(any(Leave.class))).thenAnswer(inv -> {
            Leave l = inv.getArgument(0);
            l.setId("leave_002");
            l.setStatus(Leave.LeaveStatus.PENDING);
            return l;
        });

        // Should NOT throw, past-date is now permitted
        assertThatNoException().isThrownBy(() -> leaveService.applyLeave("emp_001", req));
    }

    @Test
    void applyLeave_endBeforeStart_throwsBusinessException() {
        CreateLeaveRequest req = new CreateLeaveRequest();
        req.setStartDate(LocalDate.now().plusDays(5));
        req.setEndDate(LocalDate.now().plusDays(3));
        req.setLeaveType(Leave.LeaveType.VACATION);

        assertThatThrownBy(() -> leaveService.applyLeave("emp_001", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("End date must be on or after start date");
    }

    @Test
    void applyLeave_overlappingWithExistingLeave_throwsBusinessException() {
        LocalDate start = LocalDate.now().plusDays(2);
        LocalDate end   = start.plusDays(2);

        CreateLeaveRequest req = new CreateLeaveRequest();
        req.setStartDate(start);
        req.setEndDate(end);
        req.setLeaveType(Leave.LeaveType.VACATION);

        Leave existing = new Leave();
        when(leaveRepository.findPendingOrApprovedOverlapping(any(), any(), any())).thenReturn(List.of(existing));

        assertThatThrownBy(() -> leaveService.applyLeave("emp_001", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("overlapping");
    }

    @Test
    void approveLeave_pendingLeave_setsApprovedStatus() {
        // Set up a manager employee for the approver lookup
        Employee manager = new Employee();
        manager.setId("manager_001");
        manager.setRole(Employee.Role.MANAGER);
        // employee's managerId must match the approver for the scope check
        employee.setManagerId("manager_001");

        Leave leave = new Leave();
        leave.setId("leave_001");
        leave.setEmployee(employee);
        leave.setStatus(Leave.LeaveStatus.PENDING);
        leave.setStartDate(LocalDate.now().plusDays(1));
        leave.setEndDate(LocalDate.now().plusDays(2));
        leave.setLeaveType(Leave.LeaveType.VACATION);

        when(leaveRepository.findById("leave_001")).thenReturn(Optional.of(leave));
        when(leaveRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(employeeRepository.findById("manager_001")).thenReturn(Optional.of(manager));
        when(employeeRepository.findAllById(any())).thenReturn(List.of());

        var response = leaveService.approveLeave("leave_001", "manager_001", null);

        assertThat(response.getStatus()).isEqualTo("APPROVED");
        verify(leaveRepository).save(argThat(l -> l.getStatus() == Leave.LeaveStatus.APPROVED
                && "manager_001".equals(l.getApprovedBy())));
    }

    @Test
    void approveLeave_alreadyApproved_throwsBusinessException() {
        Leave leave = new Leave();
        leave.setId("leave_001");
        leave.setEmployee(employee);
        leave.setStatus(Leave.LeaveStatus.APPROVED);

        when(leaveRepository.findById("leave_001")).thenReturn(Optional.of(leave));

        assertThatThrownBy(() -> leaveService.approveLeave("leave_001", "manager_001", null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Only PENDING leaves can be approved");
    }

    // ── LV-11: reject with note stores reason and sets REJECTED status ──────────
    @Test
    void rejectLeave_withNote_setsRejectionReasonAndStatus() {
        Employee admin = new Employee();
        admin.setId("admin_001");
        admin.setRole(Employee.Role.ADMIN);

        Leave leave = new Leave();
        leave.setId("leave_001");
        leave.setEmployee(employee);
        leave.setStatus(Leave.LeaveStatus.PENDING);
        leave.setStartDate(LocalDate.now().plusDays(5));
        leave.setEndDate(LocalDate.now().plusDays(7));
        leave.setLeaveType(Leave.LeaveType.VACATION);

        LeaveActionRequest request = new LeaveActionRequest();
        request.setNote("Insufficient coverage");

        when(leaveRepository.findById("leave_001")).thenReturn(Optional.of(leave));
        when(leaveRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(employeeRepository.findById("admin_001")).thenReturn(Optional.of(admin));
        when(employeeRepository.findAllById(any())).thenReturn(List.of());

        var response = leaveService.rejectLeave("leave_001", "admin_001", request);

        assertThat(response.getStatus()).isEqualTo("REJECTED");
        assertThat(response.getRejectionReason()).isEqualTo("Insufficient coverage");
        verify(leaveRepository).save(argThat(l ->
                l.getStatus() == Leave.LeaveStatus.REJECTED
                && "Insufficient coverage".equals(l.getRejectionReason())));
    }

    // ── LV-12: manager rejects leave for employee who is not their direct report ─
    @Test
    void rejectLeave_managerForNonDirectReport_throwsAccessDeniedException() {
        Employee manager2 = new Employee();
        manager2.setId("manager_002");
        manager2.setRole(Employee.Role.MANAGER);

        employee.setManagerId("manager_001"); // employee's real manager is manager_001

        Leave leave = new Leave();
        leave.setId("leave_001");
        leave.setEmployee(employee);
        leave.setStatus(Leave.LeaveStatus.PENDING);
        leave.setStartDate(LocalDate.now().plusDays(5));
        leave.setEndDate(LocalDate.now().plusDays(7));
        leave.setLeaveType(Leave.LeaveType.VACATION);

        when(leaveRepository.findById("leave_001")).thenReturn(Optional.of(leave));
        when(employeeRepository.findById("manager_002")).thenReturn(Optional.of(manager2));

        assertThatThrownBy(() -> leaveService.rejectLeave("leave_001", "manager_002", new LeaveActionRequest()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Managers can only reject leaves for their direct reports");
    }
}
