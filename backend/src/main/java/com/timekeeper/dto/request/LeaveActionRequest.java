package com.timekeeper.dto.request;

import lombok.Data;

@Data
public class LeaveActionRequest {
    // Optional note for approval or rejection reason
    private String note;
}
