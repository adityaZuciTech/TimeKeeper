package com.timekeeper.service;

import com.timekeeper.entity.*;
import com.timekeeper.repository.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final EmployeeRepository employeeRepository;
    private final TimesheetRepository timesheetRepository;
    private final TimeEntryRepository timeEntryRepository;
    private final ProjectRepository projectRepository;
    private final DepartmentRepository departmentRepository;

    public TeamUtilizationReport getTeamUtilization(String managerId, LocalDate weekStartDate) {
        List<Employee> team = employeeRepository.findByManagerId(managerId);
        List<TeamMemberHours> members = new ArrayList<>();

        for (Employee emp : team) {
            BigDecimal hours = BigDecimal.ZERO;
            Optional<Timesheet> ts = timesheetRepository.findByEmployeeIdAndWeekStartDate(emp.getId(), weekStartDate);
            if (ts.isPresent()) {
                BigDecimal h = timeEntryRepository.sumHoursLoggedByTimesheetId(ts.get().getId());
                hours = h != null ? h : BigDecimal.ZERO;
            }
            members.add(new TeamMemberHours(emp.getId(), emp.getName(), hours));
        }

        return new TeamUtilizationReport(weekStartDate, members);
    }

    public EmployeeTimesheetReport getEmployeeTimesheetReport(String employeeId, LocalDate weekStartDate) {
        Employee emp = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new com.timekeeper.exception.ResourceNotFoundException("Employee not found"));

        Optional<Timesheet> tsOpt = timesheetRepository.findByEmployeeIdAndWeekStartDate(employeeId, weekStartDate);
        if (tsOpt.isEmpty()) {
            return new EmployeeTimesheetReport(employeeId, emp.getName(), weekStartDate, BigDecimal.ZERO, new ArrayList<>());
        }

        Timesheet ts = tsOpt.get();
        List<TimeEntry> entries = timeEntryRepository.findByTimesheetId(ts.getId());

        Map<TimeEntry.DayOfWeek, BigDecimal> dayHours = new LinkedHashMap<>();
        for (TimeEntry.DayOfWeek day : TimeEntry.DayOfWeek.values()) {
            dayHours.put(day, BigDecimal.ZERO);
        }
        for (TimeEntry e : entries) {
            if (e.getHoursLogged() != null) {
                dayHours.merge(e.getDay(), e.getHoursLogged(), BigDecimal::add);
            }
        }

        List<DailyHours> daily = dayHours.entrySet().stream()
                .map(de -> new DailyHours(de.getKey().name(), de.getValue()))
                .collect(Collectors.toList());

        BigDecimal total = daily.stream().map(DailyHours::getHours).reduce(BigDecimal.ZERO, BigDecimal::add);

        return new EmployeeTimesheetReport(employeeId, emp.getName(), weekStartDate, total, daily);
    }

    public ProjectEffortReport getProjectEffort(String projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new com.timekeeper.exception.ResourceNotFoundException("Project not found"));

        List<TimeEntry> entries = timeEntryRepository.findByProjectId(projectId);

        Map<String, BigDecimal> empHours = new LinkedHashMap<>();
        Map<String, String> empNames = new HashMap<>();

        for (TimeEntry e : entries) {
            String empId = e.getTimesheet().getEmployee().getId();
            String empName = e.getTimesheet().getEmployee().getName();
            empHours.merge(empId, e.getHoursLogged() != null ? e.getHoursLogged() : BigDecimal.ZERO, BigDecimal::add);
            empNames.put(empId, empName);
        }

        List<ContributorHours> contributors = empHours.entrySet().stream()
                .map(entry -> new ContributorHours(entry.getKey(), empNames.get(entry.getKey()), entry.getValue()))
                .collect(Collectors.toList());

        BigDecimal total = timeEntryRepository.sumHoursLoggedByProjectId(projectId);

        return new ProjectEffortReport(projectId, project.getName(), total != null ? total : BigDecimal.ZERO, contributors);
    }

    public List<DepartmentUtilization> getDepartmentUtilization(LocalDate weekStartDate) {
        List<Department> departments = departmentRepository.findAll();
        List<DepartmentUtilization> result = new ArrayList<>();

        for (Department dept : departments) {
            List<Employee> employees = employeeRepository.findByDepartmentId(dept.getId());
            BigDecimal totalHours = BigDecimal.ZERO;

            for (Employee emp : employees) {
                Optional<Timesheet> ts = timesheetRepository.findByEmployeeIdAndWeekStartDate(emp.getId(), weekStartDate);
                if (ts.isPresent()) {
                    BigDecimal h = timeEntryRepository.sumHoursLoggedByTimesheetId(ts.get().getId());
                    if (h != null) totalHours = totalHours.add(h);
                }
            }

            result.add(new DepartmentUtilization(dept.getId(), dept.getName(), employees.size(), totalHours));
        }

        return result;
    }

    // --- Report DTOs ---

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class TeamUtilizationReport {
        private LocalDate weekStartDate;
        private List<TeamMemberHours> team;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class TeamMemberHours {
        private String employeeId;
        private String employeeName;
        private BigDecimal hoursLogged;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class EmployeeTimesheetReport {
        private String employeeId;
        private String employeeName;
        private LocalDate weekStartDate;
        private BigDecimal totalHours;
        private List<DailyHours> dailySummary;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class DailyHours {
        private String day;
        private BigDecimal hours;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class ProjectEffortReport {
        private String projectId;
        private String projectName;
        private BigDecimal totalHoursLogged;
        private List<ContributorHours> contributors;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class ContributorHours {
        private String employeeId;
        private String employeeName;
        private BigDecimal hoursLogged;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class DepartmentUtilization {
        private String departmentId;
        private String departmentName;
        private int employeeCount;
        private BigDecimal totalHours;
    }
}
