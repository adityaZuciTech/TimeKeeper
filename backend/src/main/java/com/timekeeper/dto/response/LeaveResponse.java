package com.timekeeper.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LeaveResponse {
    private String id;
    private String employeeId;
    private String employeeName;
    private String employeeDepartment;
    private LocalDate startDate;
    private LocalDate endDate;
    private int totalDays;
    private String leaveType;
    private String status;
    private String reason;
    private String approvedBy;
    private String approvedByName;
    private String rejectionReason;
    private LocalDateTime createdAt;
}
