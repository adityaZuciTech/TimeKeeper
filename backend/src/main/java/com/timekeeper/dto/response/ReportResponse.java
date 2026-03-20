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
}
