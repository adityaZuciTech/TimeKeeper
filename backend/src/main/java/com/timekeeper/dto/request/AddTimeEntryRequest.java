package com.timekeeper.dto.request;

import com.timekeeper.entity.TimeEntry;
import jakarta.validation.constraints.AssertTrue;
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

    @AssertTrue(message = "WORK entries require projectId, startTime, and endTime")
    private boolean isWorkEntryValid() {
        if (entryType != TimeEntry.EntryType.WORK) return true;
        return projectId != null && startTime != null && endTime != null;
    }

    @AssertTrue(message = "Start time must be before end time")
    private boolean isTimeRangeValid() {
        if (entryType != TimeEntry.EntryType.WORK) return true;
        if (startTime == null || endTime == null) return true; // covered by isWorkEntryValid
        return startTime.isBefore(endTime);
    }
}
