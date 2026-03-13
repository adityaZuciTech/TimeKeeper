package com.timekeeper.service;

import com.timekeeper.dto.request.CreateProjectRequest;
import com.timekeeper.dto.request.UpdateProjectRequest;
import com.timekeeper.dto.response.ProjectResponse;
import com.timekeeper.entity.Department;
import com.timekeeper.entity.Project;
import com.timekeeper.exception.BusinessException;
import com.timekeeper.exception.ResourceNotFoundException;
import com.timekeeper.repository.DepartmentRepository;
import com.timekeeper.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final DepartmentRepository departmentRepository;

    public ProjectResponse create(CreateProjectRequest request) {
        Department department = null;
        if (request.getDepartmentId() != null) {
            department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + request.getDepartmentId()));
        }

        Project project = Project.builder()
                .name(request.getName())
                .clientName(request.getClientName())
                .department(department)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(Project.ProjectStatus.ACTIVE)
                .build();

        project = projectRepository.save(project);
        return toResponse(project);
    }

    public ProjectResponse getById(String id) {
        return projectRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + id));
    }

    public List<ProjectResponse> getAll(String departmentId, String status) {
        List<Project> projects;
        if (departmentId != null && status != null) {
            projects = projectRepository.findByDepartmentIdAndStatus(
                    departmentId, Project.ProjectStatus.valueOf(status));
        } else if (departmentId != null) {
            projects = projectRepository.findByDepartmentId(departmentId);
        } else if (status != null) {
            projects = projectRepository.findByStatus(Project.ProjectStatus.valueOf(status));
        } else {
            projects = projectRepository.findAll();
        }
        return projects.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<ProjectResponse> getActiveProjects() {
        return projectRepository.findByStatus(Project.ProjectStatus.ACTIVE).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ProjectResponse update(String id, UpdateProjectRequest request) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + id));

        if (request.getName() != null) project.setName(request.getName());
        if (request.getClientName() != null) project.setClientName(request.getClientName());
        if (request.getStartDate() != null) project.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) project.setEndDate(request.getEndDate());
        if (request.getStatus() != null) project.setStatus(request.getStatus());

        if (request.getDepartmentId() != null) {
            Department department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + request.getDepartmentId()));
            project.setDepartment(department);
        }

        project = projectRepository.save(project);
        return toResponse(project);
    }

    public ProjectResponse updateStatus(String id, Project.ProjectStatus status) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + id));
        project.setStatus(status);
        project = projectRepository.save(project);
        return toResponse(project);
    }

    ProjectResponse toResponse(Project project) {
        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .clientName(project.getClientName())
                .departmentId(project.getDepartment() != null ? project.getDepartment().getId() : null)
                .departmentName(project.getDepartment() != null ? project.getDepartment().getName() : null)
                .startDate(project.getStartDate())
                .endDate(project.getEndDate())
                .status(project.getStatus().name())
                .build();
    }
}
