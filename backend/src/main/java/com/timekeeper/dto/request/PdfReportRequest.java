package com.timekeeper.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class PdfReportRequest {

    private Stats stats;
    private String trendChartImage;   // data:image/png;base64,...
    private String pieChartImage;     // data:image/png;base64,...
    private List<DepartmentItem> departments;
    private String weekLabel;         // e.g. "Week of March 18, 2026"

    @Data
    public static class Stats {
        private int departmentsCount;
        private int employeesCount;
        private String totalHours;      // e.g. "142h"
        private String avgUtilization;  // e.g. "74%"
        private String hoursTrend;      // e.g. "+12.5% from last week" (nullable)
    }

    @Data
    public static class DepartmentItem {
        private String name;
        private int employees;
        private double hours;
        private double avgHoursPerEmployee;
        private double utilization;
        private double percentage;
    }
}
