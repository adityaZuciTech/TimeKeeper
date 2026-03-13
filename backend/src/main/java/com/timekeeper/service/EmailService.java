package com.timekeeper.service;

import com.timekeeper.entity.Employee;
import com.timekeeper.entity.Timesheet;
import com.timekeeper.repository.EmployeeRepository;
import com.timekeeper.repository.TimesheetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final EmployeeRepository employeeRepository;
    private final TimesheetRepository timesheetRepository;

    public void sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email sent to: {}", to);
        } catch (Exception e) {
            log.warn("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    // Friday at 5PM
    @Scheduled(cron = "0 0 17 * * FRI")
    public void sendFridayReminders() {
        log.info("Running Friday evening timesheet reminder job");
        sendReminderToUnsubmitted("Friday evening");
    }

    // Monday at 9AM
    @Scheduled(cron = "0 0 9 * * MON")
    public void sendMondayReminders() {
        log.info("Running Monday morning timesheet reminder job");
        sendReminderToUnsubmitted("Monday morning");
    }

    private void sendReminderToUnsubmitted(String timing) {
        LocalDate lastMonday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        List<Employee> activeEmployees = employeeRepository.findByStatus(Employee.EmployeeStatus.ACTIVE);

        for (Employee employee : activeEmployees) {
            Optional<Timesheet> timesheetOpt = timesheetRepository
                    .findByEmployeeIdAndWeekStartDate(employee.getId(), lastMonday);

            boolean needsReminder = timesheetOpt.isEmpty() ||
                    timesheetOpt.get().getStatus() == Timesheet.TimesheetStatus.DRAFT;

            if (needsReminder) {
                String subject = "Reminder – Submit Your Weekly Timesheet";
                String body = String.format(
                        "Hello %s,\n\nYour timesheet for the week of %s is still incomplete.\n" +
                        "Please log into TimeKeeper and submit your timesheet.\n\nThank you,\nTimeKeeper",
                        employee.getName(), lastMonday
                );
                sendEmail(employee.getEmail(), subject, body);
            }
        }
    }
}
