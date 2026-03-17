package com.timekeeper.scheduler;

import com.timekeeper.service.TimesheetReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler that triggers automated weekly timesheet reminder emails.
 *
 * <p>Two jobs are registered:
 * <ul>
 *   <li>Friday at 18:00 — end-of-week reminder before the weekend.</li>
 *   <li>Monday at 09:00 — start-of-week reminder for employees who still haven't submitted.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TimesheetReminderScheduler {

    private final TimesheetReminderService timesheetReminderService;

    /** Friday 18:00 — remind employees to submit before the weekend. */
    @Scheduled(cron = "0 0 18 ? * FRI")
    public void runFridayReminder() {
        log.info("Triggering Friday 18:00 timesheet reminder job");
        timesheetReminderService.sendWeeklyTimesheetReminders();
    }

    /** Monday 09:00 — remind employees who still haven't submitted. */
    @Scheduled(cron = "0 0 9 ? * MON")
    public void runMondayReminder() {
        log.info("Triggering Monday 09:00 timesheet reminder job");
        timesheetReminderService.sendWeeklyTimesheetReminders();
    }

    /**@Scheduled(cron = "0 0/1 * * * ?")
    public void runMinuteReminder() {
        log.info("Triggering minute-level timesheet reminder job");
        timesheetReminderService.sendWeeklyTimesheetReminders();
    } **/
}
