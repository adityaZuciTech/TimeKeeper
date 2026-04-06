package com.timekeeper.service;

import com.timekeeper.entity.Employee;
import com.timekeeper.repository.TimesheetRepository;
import com.timekeeper.service.impl.TimesheetReminderServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimesheetReminderServiceTest {

    @Mock TimesheetRepository timesheetRepository;
    @Mock EmailService        emailService;

    @InjectMocks TimesheetReminderServiceImpl reminderService;

    private Employee emp(String id, String email) {
        Employee e = new Employee();
        e.setId(id);
        e.setEmail(email);
        e.setName("Employee " + id);
        return e;
    }

    // ── TR-01: 2 employees without submitted timesheet → 2 reminder emails sent

    @Test
    void sendWeeklyTimesheetReminders_twoEmployeesPending_sendsTwoEmails() {
        Employee e1 = emp("emp_1", "e1@example.com");
        Employee e2 = emp("emp_2", "e2@example.com");
        when(timesheetRepository.findEmployeesWithoutSubmittedTimesheetForWeek(any()))
                .thenReturn(List.of(e1, e2));

        reminderService.sendWeeklyTimesheetReminders();

        verify(emailService, times(2))
                .sendTimesheetReminderEmail(any(Employee.class), any(LocalDate.class), any(LocalDate.class));
    }

    // ── TR-02: all employees submitted → no emails sent ───────────────────────

    @Test
    void sendWeeklyTimesheetReminders_allSubmitted_noEmailsSent() {
        when(timesheetRepository.findEmployeesWithoutSubmittedTimesheetForWeek(any()))
                .thenReturn(List.of());

        reminderService.sendWeeklyTimesheetReminders();

        verify(emailService, never())
                .sendTimesheetReminderEmail(any(), any(), any());
    }

    // ── TR-03: email throws for first employee → second employee still emailed

    @Test
    void sendWeeklyTimesheetReminders_firstEmailFails_secondStillSent() {
        Employee e1 = emp("emp_1", "e1@example.com");
        Employee e2 = emp("emp_2", "e2@example.com");
        when(timesheetRepository.findEmployeesWithoutSubmittedTimesheetForWeek(any()))
                .thenReturn(List.of(e1, e2));
        doThrow(new RuntimeException("SMTP error"))
                .when(emailService)
                .sendTimesheetReminderEmail(eq(e1), any(), any());

        // Should not propagate — loop must continue to e2
        reminderService.sendWeeklyTimesheetReminders();

        verify(emailService).sendTimesheetReminderEmail(eq(e2), any(LocalDate.class), any(LocalDate.class));
    }
}
