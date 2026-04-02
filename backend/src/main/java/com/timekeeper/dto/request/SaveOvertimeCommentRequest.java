package com.timekeeper.dto.request;

import com.timekeeper.entity.TimeEntry;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SaveOvertimeCommentRequest {

    @NotNull(message = "Day is required")
    private TimeEntry.DayOfWeek day;

    /** Null or blank string removes an existing comment. Max 500 characters. */
    @Size(max = 500, message = "Comment must be 500 characters or fewer")
    private String comment;
}
