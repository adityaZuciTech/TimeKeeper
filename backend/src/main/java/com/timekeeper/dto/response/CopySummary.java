package com.timekeeper.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CopySummary {
    private int copiedCount;
    private int skippedCount;
    /**
     * Human-readable message for edge cases (no prior week timesheet, no WORK entries).
     * Null on a normal copy with at least some source entries found.
     */
    private String message;
    /** ISO date (yyyy-MM-dd) of the source week's Monday. Always populated. */
    private String sourceWeekStart;
    /** Entries that will be (dryRun=true) or were (dryRun=false) copied. */
    private List<SkippedEntryDetail> pendingEntries;
    private List<SkippedEntryDetail> skippedEntries;
}
