package com.timekeeper.service.impl;

import com.timekeeper.dto.request.CreateLeaveRequest;
import com.timekeeper.dto.request.LeaveActionRequest;
import com.timekeeper.dto.response.LeaveResponse;
import com.timekeeper.entity.Employee;
import com.timekeeper.entity.Holiday;
import com.timekeeper.entity.Leave;
import com.timekeeper.exception.BusinessException;
import com.timekeeper.exception.ResourceNotFoundException;
import com.timekeeper.entity.Notification;
import com.timekeeper.repository.EmployeeRepository;
import com.timekeeper.repository.HolidayRepository;
import com.timekeeper.repository.LeaveRepository;
import com.timekeeper.service.LeaveService;
import com.timekeeper.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeaveServiceImpl implements LeaveService {

    private final LeaveRepository leaveRepository;
    private final EmployeeRepository employeeRepository;
    private final HolidayRepository holidayRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public LeaveResponse applyLeave(String employeeId, CreateLeaveRequest request) {
        LocalDate today = LocalDate.now();

        // Validate end date >= start date
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BusinessException("End date must be on or after start date");
        }

        // Validate at least 1 day
        long days = ChronoUnit.DAYS.between(request.getStartDate(), request.getEndDate()) + 1;
        if (days < 1) {
            throw new BusinessException("Leave must be at least 1 day");
        }

        // Check for overlapping leaves
        List<Leave> overlapping = leaveRepository.findPendingOrApprovedOverlapping(
                employeeId, request.getStartDate(), request.getEndDate());
        if (!overlapping.isEmpty()) {
            throw new BusinessException("You already have a leave request overlapping with these dates");
        }

        // Check if start or end date falls on a declared holiday
        List<Holiday> holidays = holidayRepository.findByDateBetween(
                request.getStartDate(), request.getEndDate());
        if (!holidays.isEmpty()) {
            List<String> holidayNames = holidays.stream().map(Holiday::getName).collect(Collectors.toList());
            log.info("Leave applied that includes holiday dates: {}", holidayNames);
        }

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        Leave leave = Leave.builder()
                .employee(employee)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .leaveType(request.getLeaveType())
                .reason(request.getReason())
                .build();

        leave = leaveRepository.save(leave);
        log.info("Leave applied: {} by {}", leave.getId(), employeeId);

        String managerId = employee.getManagerId();
        if (managerId != null) {
            notificationService.create(managerId,
                    "Leave Request",
                    employee.getName() + " has requested leave from " + leave.getStartDate() + " to " + leave.getEndDate(),
                    Notification.NotificationType.LEAVE_APPLIED,
                    Notification.NotificationSection.LEAVE);
        }

        return toResponse(leave);
    }

    @Override
    public List<LeaveResponse> getMyLeaves(String employeeId) {
        List<Leave> leaves = leaveRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
        Map<String, String> approverNames = resolveApproverNames(leaves);
        return leaves.stream().map(l -> toResponse(l, approverNames)).collect(Collectors.toList());
    }

    @Override
    public List<LeaveResponse> getTeamLeaves(String managerId) {
        List<Leave> leaves = leaveRepository.findTeamLeavesByManagerId(managerId);
        Map<String, String> approverNames = resolveApproverNames(leaves);
        return leaves.stream().map(l -> toResponse(l, approverNames)).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public LeaveResponse approveLeave(String leaveId, String approverId, LeaveActionRequest request) {
        Leave leave = leaveRepository.findById(leaveId)
                .orElseThrow(() -> new ResourceNotFoundException("Leave not found: " + leaveId));

        if (leave.getStatus() != Leave.LeaveStatus.PENDING) {
            throw new BusinessException("Only PENDING leaves can be approved");
        }

        // MANAGER can only approve leaves of their own direct reports
        Employee approver = employeeRepository.findById(approverId)
                .orElseThrow(() -> new ResourceNotFoundException("Approver not found"));
        if (approver.getRole() == Employee.Role.MANAGER) {
            String employeeManagerId = leave.getEmployee().getManagerId();
            if (!approverId.equals(employeeManagerId)) {
                throw new AccessDeniedException("Managers can only approve leaves for their direct reports");
            }
        }

        leave.setStatus(Leave.LeaveStatus.APPROVED);
        leave.setApprovedBy(approverId);
        leave = leaveRepository.save(leave);
        log.info("Leave {} approved by {}", leaveId, approverId);

        notificationService.create(leave.getEmployee().getId(),
                "Leave Approved",
                "Your leave request from " + leave.getStartDate() + " to " + leave.getEndDate() + " has been approved.",
                Notification.NotificationType.LEAVE_APPROVED,
                Notification.NotificationSection.LEAVE);

        return toResponse(leave, resolveApproverNames(List.of(leave)));
    }

    @Override
    @Transactional
    public LeaveResponse rejectLeave(String leaveId, String approverId, LeaveActionRequest request) {
        Leave leave = leaveRepository.findById(leaveId)
                .orElseThrow(() -> new ResourceNotFoundException("Leave not found: " + leaveId));

        if (leave.getStatus() != Leave.LeaveStatus.PENDING) {
            throw new BusinessException("Only PENDING leaves can be rejected");
        }

        // MANAGER can only reject leaves of their own direct reports
        Employee approver = employeeRepository.findById(approverId)
                .orElseThrow(() -> new ResourceNotFoundException("Approver not found"));
        if (approver.getRole() == Employee.Role.MANAGER) {
            String employeeManagerId = leave.getEmployee().getManagerId();
            if (!approverId.equals(employeeManagerId)) {
                throw new AccessDeniedException("Managers can only reject leaves for their direct reports");
            }
        }

        leave.setStatus(Leave.LeaveStatus.REJECTED);
        leave.setApprovedBy(approverId);
        if (request != null && request.getNote() != null) {
            leave.setRejectionReason(request.getNote());
        }
        leave = leaveRepository.save(leave);
        log.info("Leave {} rejected by {}", leaveId, approverId);

        notificationService.create(leave.getEmployee().getId(),
                "Leave Rejected",
                "Your leave request from " + leave.getStartDate() + " to " + leave.getEndDate() + " has been rejected.",
                Notification.NotificationType.LEAVE_REJECTED,
                Notification.NotificationSection.LEAVE);

        return toResponse(leave, resolveApproverNames(List.of(leave)));
    }

    /**
     * Batch-resolve approver display names from a list of leaves.
     * Avoids 1 DB query per leave (N+1).
     */
    private Map<String, String> resolveApproverNames(List<Leave> leaves) {
        Set<String> approverIds = leaves.stream()
                .map(Leave::getApprovedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (approverIds.isEmpty()) return Map.of();

        return employeeRepository.findAllById(approverIds).stream()
                .collect(Collectors.toMap(Employee::getId, Employee::getName));
    }

    private LeaveResponse toResponse(Leave leave) {
        return toResponse(leave, Map.of());
    }

    private LeaveResponse toResponse(Leave leave, Map<String, String> approverNames) {
        Employee emp = leave.getEmployee();
        String approvedByName = leave.getApprovedBy() != null
                ? approverNames.get(leave.getApprovedBy()) : null;

        long totalDays = ChronoUnit.DAYS.between(leave.getStartDate(), leave.getEndDate()) + 1;

        return LeaveResponse.builder()
                .id(leave.getId())
                .employeeId(emp.getId())
                .employeeName(emp.getName())
                .employeeDepartment(emp.getDepartment() != null ? emp.getDepartment().getName() : null)
                .startDate(leave.getStartDate())
                .endDate(leave.getEndDate())
                .totalDays((int) totalDays)
                .leaveType(leave.getLeaveType().name())
                .status(leave.getStatus().name())
                .reason(leave.getReason())
                .approvedBy(leave.getApprovedBy())
                .approvedByName(approvedByName)
                .rejectionReason(leave.getRejectionReason())
                .createdAt(leave.getCreatedAt())
                .build();
    }
}
