package com.timekeeper.service;

import com.timekeeper.entity.Employee;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;

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

    @Value("${app.base-url:http://localhost:5174}")
    private String appBaseUrl;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("MMM d, yyyy");

    public void sendEmail(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, true);
            mailSender.send(message);
            log.info("Email sent to: {}", to);
        } catch (Exception e) {
            log.warn("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    public void sendTimesheetReminderEmail(Employee employee, LocalDate weekStart, LocalDate weekEnd) {
        String subject = "Reminder: Submit your weekly timesheet";

        String body = String.format(
                """
                        <html>
                        <body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">

                            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">

                                <h2 style="color: #2c3e50; text-align: center;">
                                    ⏰ Timesheet Reminder
                                </h2>

                                <p style="font-size: 16px; color: #333;">
                                    Hello <strong>%s</strong>,
                                </p>

                                <p style="font-size: 15px; color: #555;">
                                    This is a gentle reminder to submit your weekly timesheet for the period:
                                </p>

                                <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; text-align: center; margin: 15px 0;">
                                    <strong style="font-size: 16px; color: #2c3e50;">
                                        %s → %s
                                    </strong>
                                </div>

                                <p style="font-size: 15px; color: #555;">
                                    Please log in to <strong>TimeKeeper</strong> and complete your submission at your earliest convenience.
                                </p>

                                <div style="text-align: center; margin: 20px 0;">
                                    <a href="%s"
                                       style="background: #4CAF50; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-size: 14px;">
                                        Submit Timesheet
                                    </a>
                                </div>

                                <hr style="border: none; border-top: 1px solid #eee;">

                                <p style="font-size: 13px; color: #999; text-align: center;">
                                    Thank you,<br/>
                                    <strong>TimeKeeper Team</strong>
                                </p>

                            </div>

                        </body>
                        </html>
                        """,
                employee.getName(),
                weekStart.format(DATE_FMT),
                weekEnd.format(DATE_FMT),
                appBaseUrl);
        sendEmail(employee.getEmail(), subject, body);
    }
}
