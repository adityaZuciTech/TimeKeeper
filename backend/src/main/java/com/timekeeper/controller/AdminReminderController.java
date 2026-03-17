package com.timekeeper.controller;

import com.timekeeper.service.TimesheetReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Admin-only controller for manually triggering reminder jobs (useful for testing).
 */
@RestController
@RequestMapping("/api/v1/admin/reminders")
@RequiredArgsConstructor
@Slf4j
public class AdminReminderController {

    private final TimesheetReminderService timesheetReminderService;

    /**
     * POST /api/v1/admin/reminders/timesheets
     *
     * Manually triggers the weekly timesheet reminder email job.
     * Restricted to ADMIN role only.
     */
    @PostMapping("/timesheets")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> triggerWeeklyTimesheetReminder() {
        log.info("Manual trigger of weekly timesheet reminders by admin");
        timesheetReminderService.sendWeeklyTimesheetReminders();
        return ResponseEntity.ok(Map.of("message", "Weekly timesheet reminders triggered successfully"));
    }
}
