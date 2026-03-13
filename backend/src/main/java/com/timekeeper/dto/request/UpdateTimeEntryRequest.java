package com.timekeeper.dto.request;

import lombok.Data;
import java.time.LocalTime;

@Data
public class UpdateTimeEntryRequest {
    private String projectId;
    private LocalTime startTime;
    private LocalTime endTime;
    private String description;
}
