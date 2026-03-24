package com.timekeeper.controller;

import com.timekeeper.dto.request.PdfReportRequest;
import com.timekeeper.dto.response.ApiResponse;
import com.timekeeper.dto.response.ReportResponse;
import com.timekeeper.entity.Employee;
import com.timekeeper.service.PdfReportService;
import com.timekeeper.service.ReportService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "Reports", description = "Team utilization, project effort, and PDF export reports")
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final PdfReportService pdfReportService;

    @GetMapping("/team-utilization")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ReportResponse.TeamUtilizationReport>> getTeamUtilization(
            @AuthenticationPrincipal Employee currentUser,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate) {
        ReportResponse.TeamUtilizationReport report =
                reportService.getTeamUtilization(currentUser.getId(), weekStartDate);
        return ResponseEntity.ok(ApiResponse.success(report));
    }

    @GetMapping("/employee-timesheet")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ReportResponse.EmployeeTimesheetReport>> getEmployeeTimesheetReport(
            @AuthenticationPrincipal Employee currentUser,
            @RequestParam String employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate) {
        String role = currentUser.getRole().name();
        ReportResponse.EmployeeTimesheetReport report =
                reportService.getEmployeeTimesheetReport(currentUser.getId(), role, employeeId, weekStartDate);
        return ResponseEntity.ok(ApiResponse.success(report));
    }

    @GetMapping("/project-effort")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ReportResponse.ProjectEffortReport>> getProjectEffort(
            @RequestParam String projectId) {
        ReportResponse.ProjectEffortReport report = reportService.getProjectEffort(projectId);
        return ResponseEntity.ok(ApiResponse.success(report));
    }

    @GetMapping("/department-utilization")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<ReportResponse.DepartmentUtilization>>> getDepartmentUtilization(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate) {
        if (weekStartDate == null) weekStartDate = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        List<ReportResponse.DepartmentUtilization> result =
                reportService.getDepartmentUtilization(weekStartDate);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/export-pdf")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> exportPdfReport(@RequestBody PdfReportRequest request) {
        try {
            byte[] pdf = pdfReportService.generateOrgReport(request);
            String filename = "timekeeper-report.pdf";
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .body(pdf);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
