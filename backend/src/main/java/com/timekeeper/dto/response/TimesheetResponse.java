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
    /** Sum of regular (≤8h/day) hours across the week. Always present, 2dp. */
    private BigDecimal totalRegularHours;
    /** Sum of overtime (>8h/day excess) hours across the week. Always present, 2dp. */
    private BigDecimal totalOvertimeHours;
    private String status;
    /** Populated when status is APPROVED or REJECTED */
    private String approvedBy;
    private String approvedByName;
    private String rejectionReason;
    private List<DayResponse> days;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DayResponse {
        private String day;
        private BigDecimal totalHours;
        /** Regular hours for this day: min(totalWorkHours, 8). 0 for HOLIDAY/LEAVE days. */
        private BigDecimal regularHours;
        /** Overtime hours for this day: max(totalWorkHours - 8, 0). 0 for HOLIDAY/LEAVE days. */
        private BigDecimal overtimeHours;
        private String dayStatus;   // WORK | LEAVE | HOLIDAY
        private String leaveType;   // SICK | CASUAL | VACATION (populated when dayStatus=LEAVE)
        private String leaveId;     // ID of the Leave record (populated when dayStatus=LEAVE)
        private boolean editable;   // false when HOLIDAY, LEAVE, or timesheet is SUBMITTED
        /** Optional employee comment for overtime context. Null when overtimeHours == 0. */
        private String overtimeComment;
        private List<TimeEntryResponse> entries;
    }
}
