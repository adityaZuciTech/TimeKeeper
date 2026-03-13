package com.timekeeper.dto.request;

import com.timekeeper.entity.TimeEntry;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalTime;

@Data
public class AddTimeEntryRequest {
    @NotNull
    private TimeEntry.DayOfWeek day;

    @NotNull
    private TimeEntry.EntryType entryType;

    // Required for WORK entries
    private String projectId;
    private LocalTime startTime;
    private LocalTime endTime;
    private String description;
}
