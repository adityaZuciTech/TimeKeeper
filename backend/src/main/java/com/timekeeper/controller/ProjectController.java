package com.timekeeper.controller;

import com.timekeeper.dto.request.CreateProjectRequest;
import com.timekeeper.dto.request.UpdateProjectRequest;
import com.timekeeper.dto.response.ApiResponse;
import com.timekeeper.dto.response.ProjectResponse;
import com.timekeeper.entity.Project;
import com.timekeeper.service.ProjectService;
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

@Tag(name = "Projects", description = "Project management")
@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ProjectResponse>> create(
            @Valid @RequestBody CreateProjectRequest request) {
        ProjectResponse response = projectService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<ApiResponse<Map<String, List<ProjectResponse>>>> getAll(
            @RequestParam(required = false) String departmentId,
            @RequestParam(required = false) String status) {
        List<ProjectResponse> projects = projectService.getAll(departmentId, status);
        return ResponseEntity.ok(ApiResponse.success(Map.of("projects", projects)));
    }

    @GetMapping("/{projectId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<ApiResponse<ProjectResponse>> getById(@PathVariable String projectId) {
        return ResponseEntity.ok(ApiResponse.success(projectService.getById(projectId)));
    }

    @PutMapping("/{projectId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ProjectResponse>> update(
            @PathVariable String projectId,
            @RequestBody UpdateProjectRequest request) {
        return ResponseEntity.ok(ApiResponse.success(projectService.update(projectId, request)));
    }

    @PatchMapping("/{projectId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ProjectResponse>> updateStatus(
            @PathVariable String projectId,
            @RequestBody Map<String, String> body) {
        Project.ProjectStatus status = Project.ProjectStatus.valueOf(body.get("status").toUpperCase());
        return ResponseEntity.ok(ApiResponse.success(projectService.updateStatus(projectId, status)));
    }
}
