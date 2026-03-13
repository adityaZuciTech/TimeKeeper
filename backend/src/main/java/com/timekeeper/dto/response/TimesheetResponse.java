package com.timekeeper.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TimesheetResponse {
    private String id;
    private String employeeId;
    private String employeeName;
    private LocalDate weekStartDate;
    private LocalDate weekEndDate;
    private BigDecimal totalHours;
    private String status;
    private List<DayResponse> days;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DayResponse {
        private String day;
        private BigDecimal totalHours;
        private String dayStatus; // WORK, LEAVE, HOLIDAY
        private List<TimeEntryResponse> entries;
    }
}
