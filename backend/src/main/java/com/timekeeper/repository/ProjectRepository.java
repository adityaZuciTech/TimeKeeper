package com.timekeeper.repository;

import com.timekeeper.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, String> {
    List<Project> findByStatus(Project.ProjectStatus status);
    List<Project> findByDepartmentId(String departmentId);
    List<Project> findByDepartmentIdAndStatus(String departmentId, Project.ProjectStatus status);
}
