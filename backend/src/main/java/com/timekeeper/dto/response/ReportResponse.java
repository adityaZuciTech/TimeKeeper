package com.timekeeper.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Response DTOs for the reporting endpoints. */
public final class ReportResponse {

    private ReportResponse() {}

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

    // ── Project Effort List ───────────────────────────────────────────────────

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class ProjectEffortListItem {
        private String projectId;
        private String projectName;
        private String status;
        private BigDecimal totalHours;
        private double percentOfTotal;
        private int contributorsCount;
        /** null when prior week has no data (renders as "—" on frontend). */
        private Double trendVsLastWeek;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class ProjectEffortListReport {
        private LocalDate weekStartDate;
        private LocalDate weekEndDate;
        /** "All Projects" for ADMIN, "Your Team's Projects" for MANAGER. */
        private String scopeLabel;
        private BigDecimal totalHours;
        private List<ProjectEffortListItem> projects;
    }

    // ── Project Detail ────────────────────────────────────────────────────────

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class WeeklyTrendPoint {
        /** Formatted label e.g. "Mar 30". */
        private String weekLabel;
        /** Zero for weeks with no logged time. */
        private BigDecimal totalHours;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class ContributorHoursWithPercent {
        private String employeeId;
        private String employeeName;
        private BigDecimal hoursLogged;
        private double percentContribution;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class ProjectDetailReport {
        private String projectId;
        private String projectName;
        private String status;
        private String clientName;
        private LocalDate weekStartDate;
        private LocalDate weekEndDate;
        private BigDecimal totalHours;
        private int contributorsCount;
        /** null when prior week has no data. */
        private Double trendVsLastWeek;
        private List<WeeklyTrendPoint> weeklyTrend;
        private List<ContributorHoursWithPercent> contributors;
    }
}
