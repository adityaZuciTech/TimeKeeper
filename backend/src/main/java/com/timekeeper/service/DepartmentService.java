package com.timekeeper.service;

import com.timekeeper.dto.request.CreateDepartmentRequest;
import com.timekeeper.dto.response.DepartmentResponse;
import com.timekeeper.entity.Department;
import com.timekeeper.exception.BusinessException;
import com.timekeeper.exception.ResourceNotFoundException;
import com.timekeeper.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public DepartmentResponse create(CreateDepartmentRequest request) {
        if (departmentRepository.existsByName(request.getName())) {
            throw new BusinessException("Department with this name already exists");
        }
        Department dept = Department.builder()
                .name(request.getName())
                .description(request.getDescription())
                .status(Department.DepartmentStatus.ACTIVE)
                .build();
        dept = departmentRepository.save(dept);
        return toResponse(dept);
    }

    public DepartmentResponse getById(String id) {
        return departmentRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + id));
    }

    public List<DepartmentResponse> getAll() {
        return departmentRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public DepartmentResponse update(String id, CreateDepartmentRequest request) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + id));
        dept.setName(request.getName());
        if (request.getDescription() != null) dept.setDescription(request.getDescription());
        dept = departmentRepository.save(dept);
        return toResponse(dept);
    }

    public DepartmentResponse updateStatus(String id, Department.DepartmentStatus status) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + id));
        dept.setStatus(status);
        dept = departmentRepository.save(dept);
        return toResponse(dept);
    }

    private DepartmentResponse toResponse(Department dept) {
        return DepartmentResponse.builder()
                .id(dept.getId())
                .name(dept.getName())
                .description(dept.getDescription())
                .status(dept.getStatus().name())
                .build();
    }
}
