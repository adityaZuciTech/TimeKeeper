package com.timekeeper.service;

/**
 * Service interface for sending automated weekly timesheet reminder emails.
 */
public interface TimesheetReminderService {

    /**
     * Finds all active employees who have not submitted their timesheet for the
     * current week and sends each of them a reminder email.
     */
    void sendWeeklyTimesheetReminders();
}
