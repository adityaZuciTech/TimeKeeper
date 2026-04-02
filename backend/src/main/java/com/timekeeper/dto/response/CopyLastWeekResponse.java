package com.timekeeper.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CopyLastWeekResponse {
    /** Full updated timesheet detail including overtime fields — no second fetch needed. */
    private TimesheetResponse timesheet;
    private CopySummary copySummary;
}
