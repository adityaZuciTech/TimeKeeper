package com.timekeeper.service;

import com.timekeeper.dto.response.ReportResponse;
import com.timekeeper.entity.*;
import com.timekeeper.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
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

    public ReportResponse.TeamUtilizationReport getTeamUtilization(String managerId, LocalDate weekStartDate) {
        List<Employee> team = employeeRepository.findByManagerId(managerId);

        // Single aggregate query for all team member hours this week
        Map<String, BigDecimal> hoursMap = new HashMap<>();
        for (Object[] row : timeEntryRepository.sumHoursByTeamMemberForWeek(managerId, weekStartDate)) {
            hoursMap.put((String) row[0], (BigDecimal) row[1]);
        }

        List<ReportResponse.TeamMemberHours> members = team.stream()
                .map(emp -> new ReportResponse.TeamMemberHours(emp.getId(), emp.getName(),
                        hoursMap.getOrDefault(emp.getId(), BigDecimal.ZERO)))
                .collect(Collectors.toList());

        return new ReportResponse.TeamUtilizationReport(weekStartDate, members);
    }

    public ReportResponse.EmployeeTimesheetReport getEmployeeTimesheetReport(String requesterId, String requesterRole,
                                                                              String employeeId, LocalDate weekStartDate) {
        // MANAGER can only view reports for their own direct reports
        if ("MANAGER".equals(requesterRole) && !requesterId.equals(employeeId)) {
            List<Employee> team = employeeRepository.findByManagerId(requesterId);
            boolean isDirectReport = team.stream().anyMatch(e -> e.getId().equals(employeeId));
            if (!isDirectReport) {
                throw new AccessDeniedException("Managers can only view reports for their direct reports");
            }
        }

        Employee emp = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new com.timekeeper.exception.ResourceNotFoundException("Employee not found"));

        Optional<Timesheet> tsOpt = timesheetRepository.findByEmployeeIdAndWeekStartDate(employeeId, weekStartDate);
        if (tsOpt.isEmpty()) {
            return new ReportResponse.EmployeeTimesheetReport(employeeId, emp.getName(), weekStartDate,
                    BigDecimal.ZERO, new ArrayList<>());
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

        List<ReportResponse.DailyHours> daily = dayHours.entrySet().stream()
                .map(de -> new ReportResponse.DailyHours(de.getKey().name(), de.getValue()))
                .collect(Collectors.toList());

        BigDecimal total = daily.stream().map(ReportResponse.DailyHours::getHours).reduce(BigDecimal.ZERO, BigDecimal::add);

        return new ReportResponse.EmployeeTimesheetReport(employeeId, emp.getName(), weekStartDate, total, daily);
    }

    public ReportResponse.ProjectEffortReport getProjectEffort(String projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new com.timekeeper.exception.ResourceNotFoundException("Project not found"));

        // Single aggregate query — avoids loading all entries into memory
        List<ReportResponse.ContributorHours> contributors = timeEntryRepository
                .sumHoursByEmployeeForProject(projectId).stream()
                .map(r -> new ReportResponse.ContributorHours((String) r[0], (String) r[1], (BigDecimal) r[2]))
                .collect(Collectors.toList());

        BigDecimal total = contributors.stream()
                .map(ReportResponse.ContributorHours::getHoursLogged)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new ReportResponse.ProjectEffortReport(projectId, project.getName(), total, contributors);
    }

    public List<ReportResponse.DepartmentUtilization> getDepartmentUtilization(LocalDate weekStartDate) {
        List<Department> departments = departmentRepository.findAll();

        // Single aggregate query — replaces O(N×M) DB calls
        Map<String, BigDecimal> hoursMap = new HashMap<>();
        for (Object[] row : timeEntryRepository.sumHoursByDepartmentForWeek(weekStartDate)) {
            hoursMap.put((String) row[0], (BigDecimal) row[1]);
        }

        return departments.stream()
                .map(dept -> {
                    long empCount = employeeRepository.countByDepartmentId(dept.getId());
                    BigDecimal totalHours = hoursMap.getOrDefault(dept.getId(), BigDecimal.ZERO);
                    return new ReportResponse.DepartmentUtilization(dept.getId(), dept.getName(), (int) empCount, totalHours);
                })
                .collect(Collectors.toList());
    }

    public ReportResponse.ProjectEffortListReport getProjectEffortList(
            String requesterId, String requesterRole, LocalDate weekStartDate, boolean includeZero) {

        List<Object[]> rows;
        String scopeLabel;
        if ("MANAGER".equals(requesterRole)) {
            rows = timeEntryRepository.sumHoursByProjectForWeekAndManager(requesterId, weekStartDate);
            scopeLabel = "Your Team's Projects";
        } else {
            rows = timeEntryRepository.sumHoursByProjectForWeek(weekStartDate);
            scopeLabel = "All Projects";
        }

        // Batch-fetch project metadata
        List<String> projectIds = rows.stream().map(r -> (String) r[0]).collect(Collectors.toList());
        Map<String, Project> projectMap = projectRepository.findAllById(projectIds).stream()
                .collect(Collectors.toMap(Project::getId, p -> p));

        // Total hours across all projects (for % calculation)
        BigDecimal totalHours = rows.stream()
                .map(r -> (BigDecimal) r[1])
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Fetch prior week data for trend column
        LocalDate priorWeek = weekStartDate.minusWeeks(1);
        List<Object[]> priorRows = "MANAGER".equals(requesterRole)
                ? timeEntryRepository.sumHoursByProjectForWeekAndManager(requesterId, priorWeek)
                : timeEntryRepository.sumHoursByProjectForWeek(priorWeek);
        Map<String, BigDecimal> priorHoursMap = priorRows.stream()
                .collect(Collectors.toMap(r -> (String) r[0], r -> (BigDecimal) r[1]));

        List<ReportResponse.ProjectEffortListItem> projects = rows.stream()
                .filter(r -> includeZero || ((BigDecimal) r[1]).compareTo(BigDecimal.ZERO) > 0)
                .map(r -> {
                    String pid = (String) r[0];
                    BigDecimal hours = (BigDecimal) r[1];
                    int contributors = ((Number) r[2]).intValue();
                    Project proj = projectMap.get(pid);
                    String name = proj != null ? proj.getName() : pid;
                    String status = proj != null ? proj.getStatus().name() : "UNKNOWN";

                    double pct = totalHours.compareTo(BigDecimal.ZERO) == 0 ? 0.0
                            : hours.multiply(BigDecimal.valueOf(100))
                                   .divide(totalHours, 1, RoundingMode.HALF_UP)
                                   .doubleValue();

                    BigDecimal prior = priorHoursMap.getOrDefault(pid, null);
                    Double trend = null;
                    if (prior != null && prior.compareTo(BigDecimal.ZERO) > 0) {
                        trend = hours.subtract(prior)
                                     .multiply(BigDecimal.valueOf(100))
                                     .divide(prior, 1, RoundingMode.HALF_UP)
                                     .doubleValue();
                    }

                    return new ReportResponse.ProjectEffortListItem(pid, name, status, hours, pct, contributors, trend);
                })
                .sorted(Comparator.comparingDouble(i -> -i.getTotalHours().doubleValue()))
                .collect(Collectors.toList());

        LocalDate weekEndDate = weekStartDate.plusDays(4);
        return new ReportResponse.ProjectEffortListReport(weekStartDate, weekEndDate, scopeLabel, totalHours, projects);
    }

    public ReportResponse.ProjectDetailReport getProjectDetail(
            String requesterId, String requesterRole, String projectId, LocalDate weekStartDate) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new com.timekeeper.exception.ResourceNotFoundException("Project not found"));

        // Fetch contributors for the selected week (role-scoped)
        List<Object[]> contributorRows = "MANAGER".equals(requesterRole)
                ? timeEntryRepository.sumHoursByEmployeeForProjectAndWeekAndManager(projectId, requesterId, weekStartDate)
                : timeEntryRepository.sumHoursByEmployeeForProjectAndWeek(projectId, weekStartDate);

        BigDecimal totalHours = contributorRows.stream()
                .map(r -> (BigDecimal) r[2])
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<ReportResponse.ContributorHoursWithPercent> contributors = contributorRows.stream()
                .map(r -> {
                    String empId = (String) r[0];
                    String empName = (String) r[1];
                    BigDecimal hours = (BigDecimal) r[2];
                    double pct = totalHours.compareTo(BigDecimal.ZERO) == 0 ? 0.0
                            : hours.multiply(BigDecimal.valueOf(100))
                                   .divide(totalHours, 1, RoundingMode.HALF_UP)
                                   .doubleValue();
                    return new ReportResponse.ContributorHoursWithPercent(empId, empName, hours, pct);
                })
                .sorted(Comparator.comparingDouble(c -> -c.getHoursLogged().doubleValue()))
                .collect(Collectors.toList());

        // 6-week trend — single aggregate query, fill missing weeks with 0
        LocalDate rangeStart = weekStartDate.minusWeeks(5);
        List<Object[]> trendRows = "MANAGER".equals(requesterRole)
                ? timeEntryRepository.sumWeeklyHoursByProjectInRangeAndManager(projectId, requesterId, rangeStart, weekStartDate)
                : timeEntryRepository.sumWeeklyHoursByProjectInRange(projectId, rangeStart, weekStartDate);

        Map<LocalDate, BigDecimal> trendMap = trendRows.stream()
                .collect(Collectors.toMap(r -> (LocalDate) r[0], r -> (BigDecimal) r[1]));

        DateTimeFormatter weekFmt = DateTimeFormatter.ofPattern("MMM d", Locale.ENGLISH);
        List<ReportResponse.WeeklyTrendPoint> weeklyTrend = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate w = weekStartDate.minusWeeks(i);
            BigDecimal h = trendMap.getOrDefault(w, BigDecimal.ZERO);
            weeklyTrend.add(new ReportResponse.WeeklyTrendPoint(w.format(weekFmt), h));
        }

        // Trend vs last week derived from trendMap
        BigDecimal priorHours = trendMap.getOrDefault(weekStartDate.minusWeeks(1), null);
        Double trendVsLastWeek = null;
        if (priorHours != null && priorHours.compareTo(BigDecimal.ZERO) > 0) {
            trendVsLastWeek = totalHours.subtract(priorHours)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(priorHours, 1, RoundingMode.HALF_UP)
                    .doubleValue();
        }

        LocalDate weekEndDate = weekStartDate.plusDays(4);
        return new ReportResponse.ProjectDetailReport(
                project.getId(), project.getName(), project.getStatus().name(),
                project.getClientName(), weekStartDate, weekEndDate,
                totalHours, contributors.size(), trendVsLastWeek,
                weeklyTrend, contributors);
    }
}
