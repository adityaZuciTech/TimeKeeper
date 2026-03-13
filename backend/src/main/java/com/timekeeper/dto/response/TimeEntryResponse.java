package com.timekeeper.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TimeEntryResponse {
    private String entryId;
    private String day;
    private String entryType;
    private String projectId;
    private String projectName;
    private LocalTime startTime;
    private LocalTime endTime;
    private BigDecimal hoursLogged;
    private String description;
}
