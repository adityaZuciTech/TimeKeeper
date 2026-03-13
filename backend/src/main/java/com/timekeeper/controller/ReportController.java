package com.timekeeper.controller;

import com.timekeeper.dto.response.ApiResponse;
import com.timekeeper.entity.Employee;
import com.timekeeper.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/team-utilization")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ReportService.TeamUtilizationReport>> getTeamUtilization(
            @AuthenticationPrincipal Employee currentUser,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate) {
        ReportService.TeamUtilizationReport report =
                reportService.getTeamUtilization(currentUser.getId(), weekStartDate);
        return ResponseEntity.ok(ApiResponse.success(report));
    }

    @GetMapping("/employee-timesheet")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ReportService.EmployeeTimesheetReport>> getEmployeeTimesheetReport(
            @RequestParam String employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate) {
        ReportService.EmployeeTimesheetReport report =
                reportService.getEmployeeTimesheetReport(employeeId, weekStartDate);
        return ResponseEntity.ok(ApiResponse.success(report));
    }

    @GetMapping("/project-effort")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ReportService.ProjectEffortReport>> getProjectEffort(
            @RequestParam String projectId) {
        ReportService.ProjectEffortReport report = reportService.getProjectEffort(projectId);
        return ResponseEntity.ok(ApiResponse.success(report));
    }

    @GetMapping("/department-utilization")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<ReportService.DepartmentUtilization>>> getDepartmentUtilization(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate) {
        if (weekStartDate == null) weekStartDate = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        List<ReportService.DepartmentUtilization> result =
                reportService.getDepartmentUtilization(weekStartDate);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
