package com.timekeeper.service;

import com.timekeeper.entity.Employee;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import org.springframework.beans.factory.annotation.Value;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from:${spring.mail.username:noreply@timekeeper.app}}")
    private String fromAddress;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("MMM d, yyyy");

    public void sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email sent to: {}", to);
        } catch (Exception e) {
            log.warn("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    public void sendTimesheetReminderEmail(Employee employee, LocalDate weekStart, LocalDate weekEnd) {
        String subject = "Reminder: Submit your weekly timesheet";
        String body = String.format(
                "Hello %s,%n%n" +
                "This is a reminder to submit your weekly timesheet for the week:%n%n" +
                "  %s - %s%n%n" +
                "Please log in to TimeKeeper and submit your timesheet.%n%n" +
                "Thank you,%n" +
                "TimeKeeper",
                employee.getName(),
                weekStart.format(DATE_FMT),
                weekEnd.format(DATE_FMT)
        );
        sendEmail(employee.getEmail(), subject, body);
    }
}
