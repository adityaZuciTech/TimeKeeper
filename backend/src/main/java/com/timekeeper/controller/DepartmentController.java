package com.timekeeper.controller;

import com.timekeeper.dto.request.CreateDepartmentRequest;
import com.timekeeper.dto.response.ApiResponse;
import com.timekeeper.dto.response.DepartmentResponse;
import com.timekeeper.dto.response.EmployeeResponse;
import com.timekeeper.entity.Department;
import com.timekeeper.service.DepartmentService;
import com.timekeeper.service.EmployeeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Departments", description = "Department CRUD and employee listing")
@RestController
@RequestMapping("/api/v1/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;
    private final EmployeeService employeeService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> create(
            @Valid @RequestBody CreateDepartmentRequest request) {
        DepartmentResponse response = departmentService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<ApiResponse<Map<String, List<DepartmentResponse>>>> getAll() {
        List<DepartmentResponse> departments = departmentService.getAll();
        return ResponseEntity.ok(ApiResponse.success(Map.of("departments", departments)));
    }

    @GetMapping("/{departmentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> getById(@PathVariable String departmentId) {
        return ResponseEntity.ok(ApiResponse.success(departmentService.getById(departmentId)));
    }

    @PutMapping("/{departmentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> update(
            @PathVariable String departmentId,
            @Valid @RequestBody CreateDepartmentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(departmentService.update(departmentId, request)));
    }

    @PatchMapping("/{departmentId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> updateStatus(
            @PathVariable String departmentId,
            @RequestBody Map<String, String> body) {
        Department.DepartmentStatus status = Department.DepartmentStatus.valueOf(body.get("status").toUpperCase());
        return ResponseEntity.ok(ApiResponse.success(departmentService.updateStatus(departmentId, status)));
    }

    @GetMapping("/{departmentId}/employees")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDepartmentEmployees(
            @PathVariable String departmentId) {
        List<EmployeeResponse> employees = employeeService.getDepartmentEmployees(departmentId);
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "departmentId", departmentId,
                "employees", employees
        )));
    }
}
