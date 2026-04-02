package com.timekeeper.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkippedEntryDetail {
    private String day;
    private String projectId;
    private String projectName;
    private String startTime;
    private String endTime;
    /**
     * One of: FUTURE_DAY | HOLIDAY_DAY | LEAVE_DAY | PROJECT_NOT_ACTIVE | DUPLICATE_ENTRY | OVERLAP_STRICT
     */
    private String reason;
    /**
     * Populated only for OVERLAP_STRICT — shows the time range of the first conflicting entry
     * in "HH:mm–HH:mm" format.
     */
    private String conflictingRange;
}
