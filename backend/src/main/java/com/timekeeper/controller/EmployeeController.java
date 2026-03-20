package com.timekeeper.controller;

import com.timekeeper.dto.request.CreateEmployeeRequest;
import com.timekeeper.dto.request.UpdateEmployeeRequest;
import com.timekeeper.dto.response.ApiResponse;
import com.timekeeper.dto.response.EmployeeResponse;
import com.timekeeper.entity.Employee;
import com.timekeeper.service.EmployeeService;
import com.timekeeper.service.TimesheetService;
import com.timekeeper.dto.response.TimesheetResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;
    private final TimesheetService timesheetService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EmployeeResponse>> create(
            @Valid @RequestBody CreateEmployeeRequest request) {
        EmployeeResponse response = employeeService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, List<EmployeeResponse>>>> getAll(
            @RequestParam(required = false) String departmentId,
            @RequestParam(required = false) String status) {
        List<EmployeeResponse> employees = employeeService.getAll(departmentId, status);
        return ResponseEntity.ok(ApiResponse.success(Map.of("employees", employees)));
    }

    @GetMapping("/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<ApiResponse<EmployeeResponse>> getById(
            @PathVariable String employeeId,
            @AuthenticationPrincipal Employee currentUser) {
        // Employees can only view their own profile
        if (currentUser.getRole() == Employee.Role.EMPLOYEE
                && !currentUser.getId().equals(employeeId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Access denied"));
        }
        return ResponseEntity.ok(ApiResponse.success(employeeService.getById(employeeId)));
    }

    @PutMapping("/{employeeId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EmployeeResponse>> update(
            @PathVariable String employeeId,
            @Valid @RequestBody UpdateEmployeeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(employeeService.update(employeeId, request)));
    }

    @PatchMapping("/{employeeId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EmployeeResponse>> updateStatus(
            @PathVariable String employeeId,
            @RequestBody Map<String, String> body) {
        Employee.EmployeeStatus status = Employee.EmployeeStatus.valueOf(body.get("status").toUpperCase());
        return ResponseEntity.ok(ApiResponse.success(employeeService.updateStatus(employeeId, status)));
    }

    // Manager: get team
    @GetMapping("/{managerId}/team")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Map<String, List<EmployeeResponse>>>> getTeam(
            @PathVariable String managerId) {
        List<EmployeeResponse> team = employeeService.getTeam(managerId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("team", team)));
    }

    // View timesheets of a specific employee (manager/admin)
    @GetMapping("/{employeeId}/timesheets")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Map<String, List<TimesheetResponse>>>> getEmployeeTimesheets(
            @PathVariable String employeeId) {
        List<TimesheetResponse> timesheets = timesheetService.getAllTimesheets(employeeId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("timesheets", timesheets)));
    }
}
