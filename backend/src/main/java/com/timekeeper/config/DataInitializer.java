package com.timekeeper.config;

import com.timekeeper.entity.Department;
import com.timekeeper.entity.Employee;
import com.timekeeper.entity.Project;
import com.timekeeper.entity.TimeEntry;
import com.timekeeper.entity.Timesheet;
import com.timekeeper.repository.DepartmentRepository;
import com.timekeeper.repository.EmployeeRepository;
import com.timekeeper.repository.ProjectRepository;
import com.timekeeper.repository.TimeEntryRepository;
import com.timekeeper.repository.TimesheetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;
    private final ProjectRepository projectRepository;
    private final TimesheetRepository timesheetRepository;
    private final TimeEntryRepository timeEntryRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (employeeRepository.count() > 0) return;

        log.info("Seeding initial data...");

        // Departments
        Department engineering = Department.builder()
                .id("dep_01").name("Engineering").description("Software engineering team")
                .status(Department.DepartmentStatus.ACTIVE).build();
        Department design = Department.builder()
                .id("dep_02").name("Design").description("UI/UX design team")
                .status(Department.DepartmentStatus.ACTIVE).build();
        Department marketing = Department.builder()
                .id("dep_03").name("Marketing").description("Marketing team")
                .status(Department.DepartmentStatus.ACTIVE).build();
        departmentRepository.save(engineering);
        departmentRepository.save(design);
        departmentRepository.save(marketing);

        // Admin
        Employee admin = Employee.builder()
                .id("usr_001").name("Admin User").email("admin@timekeeper.app")
                .password(passwordEncoder.encode("Admin123!")).role(Employee.Role.ADMIN)
                .department(engineering).status(Employee.EmployeeStatus.ACTIVE).build();
        employeeRepository.save(admin);

        // Manager
        Employee manager = Employee.builder()
                .id("usr_002").name("Sarah Manager").email("manager@timekeeper.app")
                .password(passwordEncoder.encode("Manager123!")).role(Employee.Role.MANAGER)
                .department(engineering).status(Employee.EmployeeStatus.ACTIVE).build();
        employeeRepository.save(manager);

        // Employees
        Employee emp1 = Employee.builder()
                .id("usr_003").name("John Developer").email("john@timekeeper.app")
                .password(passwordEncoder.encode("Employee123!")).role(Employee.Role.EMPLOYEE)
                .department(engineering).managerId("usr_002").status(Employee.EmployeeStatus.ACTIVE).build();
        employeeRepository.save(emp1);

        Employee emp2 = Employee.builder()
                .id("usr_004").name("Alex QA").email("alex@timekeeper.app")
                .password(passwordEncoder.encode("Employee123!")).role(Employee.Role.EMPLOYEE)
                .department(engineering).managerId("usr_002").status(Employee.EmployeeStatus.ACTIVE).build();
        employeeRepository.save(emp2);

        // Projects
        Project alpha = Project.builder()
                .id("prj_001").name("Project Alpha").clientName("Acme Corp")
                .department(engineering).startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 12, 31)).status(Project.ProjectStatus.ACTIVE).build();
        projectRepository.save(alpha);

        Project beta = Project.builder()
                .id("prj_002").name("Project Beta").clientName("Globex Inc")
                .department(engineering).startDate(LocalDate.of(2026, 2, 1))
                .endDate(LocalDate.of(2026, 8, 31)).status(Project.ProjectStatus.ACTIVE).build();
        projectRepository.save(beta);

        Project gamma = Project.builder()
                .id("prj_003").name("Design Revamp").clientName("Internal")
                .department(design).startDate(LocalDate.of(2026, 3, 1))
                .endDate(LocalDate.of(2026, 6, 30)).status(Project.ProjectStatus.ON_HOLD).build();
        projectRepository.save(gamma);

        log.info("Seed data created successfully.");
        log.info("Admin: admin@timekeeper.app / Admin123!");
        log.info("Manager: manager@timekeeper.app / Manager123!");
        log.info("Employee: john@timekeeper.app / Employee123!");

        // ── Seed 5 timesheet records ─────────────────────────────────────────
        log.info("Seeding timesheet records...");

        // Timesheet 1 – John, week Feb 09 (SUBMITTED)
        Timesheet ts1 = timesheetRepository.save(Timesheet.builder()
                .id("ts_seed_01").employee(emp1)
                .weekStartDate(LocalDate.of(2026, 2, 9)).weekEndDate(LocalDate.of(2026, 2, 15))
                .status(Timesheet.TimesheetStatus.SUBMITTED)
                .createdAt(LocalDateTime.of(2026, 2, 9, 9, 0)).build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s01_1").timesheet(ts1)
                .project(alpha).day(TimeEntry.DayOfWeek.MONDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0))
                .hoursLogged(new BigDecimal("8.00")).description("Sprint planning & dev").build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s01_2").timesheet(ts1)
                .project(alpha).day(TimeEntry.DayOfWeek.TUESDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 30))
                .hoursLogged(new BigDecimal("8.50")).description("Feature development").build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s01_3").timesheet(ts1)
                .project(beta).day(TimeEntry.DayOfWeek.WEDNESDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0))
                .hoursLogged(new BigDecimal("8.00")).description("API integration").build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s01_4").timesheet(ts1)
                .project(alpha).day(TimeEntry.DayOfWeek.THURSDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(18, 0))
                .hoursLogged(new BigDecimal("9.00")).description("Bug fixes").build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s01_5").timesheet(ts1)
                .project(alpha).day(TimeEntry.DayOfWeek.FRIDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(16, 0))
                .hoursLogged(new BigDecimal("7.00")).description("Code review & docs").build());

        // Timesheet 2 – John, week Feb 16 (SUBMITTED)
        Timesheet ts2 = timesheetRepository.save(Timesheet.builder()
                .id("ts_seed_02").employee(emp1)
                .weekStartDate(LocalDate.of(2026, 2, 16)).weekEndDate(LocalDate.of(2026, 2, 22))
                .status(Timesheet.TimesheetStatus.SUBMITTED)
                .createdAt(LocalDateTime.of(2026, 2, 16, 9, 0)).build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s02_1").timesheet(ts2)
                .project(alpha).day(TimeEntry.DayOfWeek.MONDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0))
                .hoursLogged(new BigDecimal("8.00")).description("Backend development").build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s02_2").timesheet(ts2)
                .project(beta).day(TimeEntry.DayOfWeek.TUESDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0))
                .hoursLogged(new BigDecimal("8.00")).description("Unit testing").build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s02_3").timesheet(ts2)
                .project(alpha).day(TimeEntry.DayOfWeek.WEDNESDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0))
                .hoursLogged(new BigDecimal("8.00")).description("Feature implementation").build());

        // Timesheet 3 – Alex QA, week Mar 02 (SUBMITTED)
        Timesheet ts3 = timesheetRepository.save(Timesheet.builder()
                .id("ts_seed_03").employee(emp2)
                .weekStartDate(LocalDate.of(2026, 3, 2)).weekEndDate(LocalDate.of(2026, 3, 8))
                .status(Timesheet.TimesheetStatus.SUBMITTED)
                .createdAt(LocalDateTime.of(2026, 3, 2, 9, 0)).build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s03_1").timesheet(ts3)
                .project(beta).day(TimeEntry.DayOfWeek.MONDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0))
                .hoursLogged(new BigDecimal("8.00")).description("QA testing cycle 1").build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s03_2").timesheet(ts3)
                .project(beta).day(TimeEntry.DayOfWeek.TUESDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 30))
                .hoursLogged(new BigDecimal("8.50")).description("Regression testing").build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s03_3").timesheet(ts3)
                .project(alpha).day(TimeEntry.DayOfWeek.WEDNESDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0))
                .hoursLogged(new BigDecimal("8.00")).description("Integration test review").build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s03_4").timesheet(ts3)
                .project(beta).day(TimeEntry.DayOfWeek.THURSDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0))
                .hoursLogged(new BigDecimal("8.00")).description("Test case documentation").build());

        // Timesheet 4 – Sarah Manager, week Mar 09 (SUBMITTED)
        Timesheet ts4 = timesheetRepository.save(Timesheet.builder()
                .id("ts_seed_04").employee(manager)
                .weekStartDate(LocalDate.of(2026, 3, 9)).weekEndDate(LocalDate.of(2026, 3, 15))
                .status(Timesheet.TimesheetStatus.SUBMITTED)
                .createdAt(LocalDateTime.of(2026, 3, 9, 9, 0)).build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s04_1").timesheet(ts4)
                .project(alpha).day(TimeEntry.DayOfWeek.MONDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0))
                .hoursLogged(new BigDecimal("8.00")).description("Team standup & sprint review").build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s04_2").timesheet(ts4)
                .project(alpha).day(TimeEntry.DayOfWeek.TUESDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(18, 0))
                .hoursLogged(new BigDecimal("9.00")).description("Stakeholder meeting & planning").build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s04_3").timesheet(ts4)
                .project(beta).day(TimeEntry.DayOfWeek.WEDNESDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0))
                .hoursLogged(new BigDecimal("8.00")).description("Project Beta coordination").build());

        // Timesheet 5 – John, week Mar 09 (DRAFT)
        Timesheet ts5 = timesheetRepository.save(Timesheet.builder()
                .id("ts_seed_05").employee(emp1)
                .weekStartDate(LocalDate.of(2026, 3, 9)).weekEndDate(LocalDate.of(2026, 3, 15))
                .status(Timesheet.TimesheetStatus.DRAFT)
                .createdAt(LocalDateTime.of(2026, 3, 9, 9, 0)).build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s05_1").timesheet(ts5)
                .project(alpha).day(TimeEntry.DayOfWeek.MONDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0))
                .hoursLogged(new BigDecimal("8.00")).description("New feature kickoff").build());
        timeEntryRepository.save(TimeEntry.builder().id("te_s05_2").timesheet(ts5)
                .project(alpha).day(TimeEntry.DayOfWeek.TUESDAY).entryType(TimeEntry.EntryType.WORK)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(17, 0))
                .hoursLogged(new BigDecimal("8.00")).description("Implementation in progress").build());

        log.info("Timesheet seed data created: 5 timesheets with time entries.");
    }
}
