package com.timekeeper.repository;

import com.timekeeper.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, String> {
    List<Department> findByStatus(Department.DepartmentStatus status);
    boolean existsByName(String name);
}
