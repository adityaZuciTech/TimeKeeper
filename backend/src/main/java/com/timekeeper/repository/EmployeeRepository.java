package com.timekeeper.repository;

import com.timekeeper.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, String> {
    Optional<Employee> findByEmail(String email);
    boolean existsByEmail(String email);
    List<Employee> findByDepartmentId(String departmentId);
    long countByDepartmentId(String departmentId);
    List<Employee> findByManagerId(String managerId);
    List<Employee> findByStatus(Employee.EmployeeStatus status);
    List<Employee> findByDepartmentIdAndStatus(String departmentId, Employee.EmployeeStatus status);
    List<Employee> findByRole(Employee.Role role);
}
