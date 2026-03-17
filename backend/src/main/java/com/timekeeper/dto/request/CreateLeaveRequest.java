package com.timekeeper.dto.request;

import com.timekeeper.entity.Leave;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class CreateLeaveRequest {

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotNull(message = "Leave type is required")
    private Leave.LeaveType leaveType;

    private String reason;
}
