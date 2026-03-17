package com.timekeeper.service.impl;

import com.timekeeper.entity.Employee;
import com.timekeeper.repository.TimesheetRepository;
import com.timekeeper.service.EmailService;
import com.timekeeper.service.TimesheetReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TimesheetReminderServiceImpl implements TimesheetReminderService {

    private final TimesheetRepository timesheetRepository;
    private final EmailService emailService;

    @Override
    public void sendWeeklyTimesheetReminders() {
        log.info("Starting weekly timesheet reminder job");

        LocalDate weekStart = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd   = weekStart.plusDays(6); // Sunday

        List<Employee> employees =
                timesheetRepository.findEmployeesWithoutSubmittedTimesheetForWeek(weekStart);

        log.info("Found {} employee(s) without a submitted timesheet for week starting {}",
                employees.size(), weekStart);

        for (Employee employee : employees) {
            log.info("Sending reminder to employee: {}", employee.getEmail());
            emailService.sendTimesheetReminderEmail(employee, weekStart, weekEnd);
        }

        log.info("Weekly timesheet reminder job completed — {} reminder(s) sent", employees.size());
    }
}
