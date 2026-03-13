package com.timekeeper.config;

import com.timekeeper.entity.Department;
import com.timekeeper.entity.Employee;
import com.timekeeper.entity.Project;
import com.timekeeper.repository.DepartmentRepository;
import com.timekeeper.repository.EmployeeRepository;
import com.timekeeper.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;
    private final ProjectRepository projectRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (employeeRepository.count() > 0) return;

        log.info("Seeding initial data...");

        // Departments
        Department engineering = Department.builder()
                .id("dep_01")
                .name("Engineering")
                .description("Software engineering team")
                .status(Department.DepartmentStatus.ACTIVE)
                .build();

        Department design = Department.builder()
                .id("dep_02")
                .name("Design")
                .description("UI/UX design team")
                .status(Department.DepartmentStatus.ACTIVE)
                .build();

        Department marketing = Department.builder()
                .id("dep_03")
                .name("Marketing")
                .description("Marketing team")
                .status(Department.DepartmentStatus.ACTIVE)
                .build();

        departmentRepository.save(engineering);
        departmentRepository.save(design);
        departmentRepository.save(marketing);

        // Admin
        Employee admin = Employee.builder()
                .id("usr_001")
                .name("Admin User")
                .email("admin@timekeeper.app")
                .password(passwordEncoder.encode("Admin123!"))
                .role(Employee.Role.ADMIN)
                .department(engineering)
                .status(Employee.EmployeeStatus.ACTIVE)
                .build();
        employeeRepository.save(admin);

        // Manager
        Employee manager = Employee.builder()
                .id("usr_002")
                .name("Sarah Manager")
                .email("manager@timekeeper.app")
                .password(passwordEncoder.encode("Manager123!"))
                .role(Employee.Role.MANAGER)
                .department(engineering)
                .status(Employee.EmployeeStatus.ACTIVE)
                .build();
        employeeRepository.save(manager);

        // Employees
        Employee emp1 = Employee.builder()
                .id("usr_003")
                .name("John Developer")
                .email("john@timekeeper.app")
                .password(passwordEncoder.encode("Employee123!"))
                .role(Employee.Role.EMPLOYEE)
                .department(engineering)
                .managerId("usr_002")
                .status(Employee.EmployeeStatus.ACTIVE)
                .build();
        employeeRepository.save(emp1);

        Employee emp2 = Employee.builder()
                .id("usr_004")
                .name("Alex QA")
                .email("alex@timekeeper.app")
                .password(passwordEncoder.encode("Employee123!"))
                .role(Employee.Role.EMPLOYEE)
                .department(engineering)
                .managerId("usr_002")
                .status(Employee.EmployeeStatus.ACTIVE)
                .build();
        employeeRepository.save(emp2);

        // Projects
        Project alpha = Project.builder()
                .id("prj_001")
                .name("Project Alpha")
                .clientName("Acme Corp")
                .department(engineering)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .status(Project.ProjectStatus.ACTIVE)
                .build();
        projectRepository.save(alpha);

        Project beta = Project.builder()
                .id("prj_002")
                .name("Project Beta")
                .clientName("Globex Inc")
                .department(engineering)
                .startDate(LocalDate.of(2026, 2, 1))
                .endDate(LocalDate.of(2026, 8, 31))
                .status(Project.ProjectStatus.ACTIVE)
                .build();
        projectRepository.save(beta);

        Project gamma = Project.builder()
                .id("prj_003")
                .name("Design Revamp")
                .clientName("Internal")
                .department(design)
                .startDate(LocalDate.of(2026, 3, 1))
                .endDate(LocalDate.of(2026, 6, 30))
                .status(Project.ProjectStatus.ON_HOLD)
                .build();
        projectRepository.save(gamma);

        log.info("Seed data created successfully.");
        log.info("Admin: admin@timekeeper.app / Admin123!");
        log.info("Manager: manager@timekeeper.app / Manager123!");
        log.info("Employee: john@timekeeper.app / Employee123!");
    }
}
