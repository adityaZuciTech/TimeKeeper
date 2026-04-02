package com.timekeeper.service;

import com.timekeeper.dto.request.SaveOvertimeCommentRequest;
import com.timekeeper.entity.*;
import com.timekeeper.exception.BusinessException;
import com.timekeeper.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for OvertimeComment CRUD (saveOvertimeComment).
 * Addresses gap G-02: saveOvertimeComment has zero existing coverage.
 *
 * Coverage: T-matrix items C-01 through C-05, C-09.
 */
@ExtendWith(MockitoExtension.class)
class OvertimeCommentServiceTest {

    @Mock TimesheetRepository   timesheetRepository;
    @Mock TimeEntryRepository   timeEntryRepository;
    @Mock EmployeeRepository    employeeRepository;
    @Mock ProjectRepository     projectRepository;
    @Mock LeaveRepository       leaveRepository;
    @Mock HolidayRepository     holidayRepository;
    @Mock NotificationService   notificationService;

    @InjectMocks TimesheetService timesheetService;

    private static final LocalDate WEEK_MON = LocalDate.of(2020, 1, 6);
    private static final LocalDate WEEK_FRI = LocalDate.of(2020, 1, 10);

    private Employee employee;
    private Timesheet draftTimesheet;

    @BeforeEach
    void setUp() {
        employee = new Employee();
        employee.setId("emp_c");
        employee.setName("Comment Tester");
        employee.setEmail("ot.comment@example.com");
        employee.setRole(Employee.Role.EMPLOYEE);

        draftTimesheet = new Timesheet();
        draftTimesheet.setId("ts_c");
        draftTimesheet.setEmployee(employee);
        draftTimesheet.setWeekStartDate(WEEK_MON);
        draftTimesheet.setWeekEndDate(WEEK_FRI);
        draftTimesheet.setStatus(Timesheet.TimesheetStatus.DRAFT);
    }

    // ── C-01: Save comment on DRAFT timesheet succeeds ────────────────────────
    @Test
    void saveOvertimeComment_draftTimesheet_savesComment() {
        stubToDetailResponse();
        when(timesheetRepository.findById("ts_c")).thenReturn(Optional.of(draftTimesheet));
        when(timesheetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var req = comment(TimeEntry.DayOfWeek.MONDAY, "Late client deadline");
        var response = timesheetService.saveOvertimeComment("ts_c", "emp_c", req);

        assertThat(draftTimesheet.getOvertimeComments())
                .containsEntry(TimeEntry.DayOfWeek.MONDAY, "Late client deadline");
        verify(timesheetRepository).save(draftTimesheet);
        assertThat(response.getId()).isEqualTo("ts_c");
    }

    // ── C-01b: Leading/trailing whitespace is trimmed before storage ──────────
    @Test
    void saveOvertimeComment_trimsWhitespace() {
        stubToDetailResponse();
        when(timesheetRepository.findById("ts_c")).thenReturn(Optional.of(draftTimesheet));
        when(timesheetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var req = comment(TimeEntry.DayOfWeek.TUESDAY, "  Sprint deadline  ");
        timesheetService.saveOvertimeComment("ts_c", "emp_c", req);

        assertThat(draftTimesheet.getOvertimeComments())
                .containsEntry(TimeEntry.DayOfWeek.TUESDAY, "Sprint deadline");
    }

    // ── C-02: Save blank comment removes existing comment ────────────────────
    @Test
    void saveOvertimeComment_blankComment_removesExistingKey() {
        // Pre-populate a comment
        EnumMap<TimeEntry.DayOfWeek, String> existing = new EnumMap<>(TimeEntry.DayOfWeek.class);
        existing.put(TimeEntry.DayOfWeek.WEDNESDAY, "Original comment");
        draftTimesheet.setOvertimeComments(existing);

        stubToDetailResponse();
        when(timesheetRepository.findById("ts_c")).thenReturn(Optional.of(draftTimesheet));
        when(timesheetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var req = comment(TimeEntry.DayOfWeek.WEDNESDAY, "   "); // blank after trim
        timesheetService.saveOvertimeComment("ts_c", "emp_c", req);

        assertThat(draftTimesheet.getOvertimeComments())
                .as("blank comment should remove the key from the map")
                .doesNotContainKey(TimeEntry.DayOfWeek.WEDNESDAY);
    }

    // ── C-02b: Null comment also removes existing comment ────────────────────
    @Test
    void saveOvertimeComment_nullComment_removesExistingKey() {
        EnumMap<TimeEntry.DayOfWeek, String> existing = new EnumMap<>(TimeEntry.DayOfWeek.class);
        existing.put(TimeEntry.DayOfWeek.THURSDAY, "Some reason");
        draftTimesheet.setOvertimeComments(existing);

        stubToDetailResponse();
        when(timesheetRepository.findById("ts_c")).thenReturn(Optional.of(draftTimesheet));
        when(timesheetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var req = comment(TimeEntry.DayOfWeek.THURSDAY, null);
        timesheetService.saveOvertimeComment("ts_c", "emp_c", req);

        assertThat(draftTimesheet.getOvertimeComments())
                .doesNotContainKey(TimeEntry.DayOfWeek.THURSDAY);
    }

    // ── C-03: Save comment on SUBMITTED timesheet blocked ────────────────────
    @Test
    void saveOvertimeComment_submittedTimesheet_throwsBusinessException() {
        draftTimesheet.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        when(timesheetRepository.findById("ts_c")).thenReturn(Optional.of(draftTimesheet));

        var req = comment(TimeEntry.DayOfWeek.MONDAY, "reason");

        assertThatThrownBy(() -> timesheetService.saveOvertimeComment("ts_c", "emp_c", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot edit overtime comments on a submitted or approved timesheet");
    }

    // ── C-04: Save comment on APPROVED timesheet blocked ─────────────────────
    @Test
    void saveOvertimeComment_approvedTimesheet_throwsBusinessException() {
        draftTimesheet.setStatus(Timesheet.TimesheetStatus.APPROVED);
        when(timesheetRepository.findById("ts_c")).thenReturn(Optional.of(draftTimesheet));

        var req = comment(TimeEntry.DayOfWeek.MONDAY, "reason");

        assertThatThrownBy(() -> timesheetService.saveOvertimeComment("ts_c", "emp_c", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot edit overtime comments on a submitted or approved timesheet");
    }

    // ── C-05: Wrong employee cannot save comment ──────────────────────────────
    @Test
    void saveOvertimeComment_wrongEmployee_throwsAccessDeniedException() {
        when(timesheetRepository.findById("ts_c")).thenReturn(Optional.of(draftTimesheet));

        var req = comment(TimeEntry.DayOfWeek.MONDAY, "reason");

        assertThatThrownBy(() -> timesheetService.saveOvertimeComment("ts_c", "emp_OTHER", req))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── C-09: REJECTED timesheet allows comment editing ──────────────────────
    @Test
    void saveOvertimeComment_rejectedTimesheet_succeeds() {
        draftTimesheet.setStatus(Timesheet.TimesheetStatus.REJECTED);

        stubToDetailResponse();
        when(timesheetRepository.findById("ts_c")).thenReturn(Optional.of(draftTimesheet));
        when(timesheetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var req = comment(TimeEntry.DayOfWeek.FRIDAY, "Finishing rejected week's fixes");

        assertThatNoException().isThrownBy(() ->
                timesheetService.saveOvertimeComment("ts_c", "emp_c", req));
        assertThat(draftTimesheet.getOvertimeComments())
                .containsEntry(TimeEntry.DayOfWeek.FRIDAY, "Finishing rejected week's fixes");
    }

    // ── C-01c: First comment initialises the map (was null) ──────────────────
    @Test
    void saveOvertimeComment_nullMapInitialized_savesComment() {
        // overtimeComments is null by default (field not initialized)
        assertThat(draftTimesheet.getOvertimeComments()).isNull();

        stubToDetailResponse();
        when(timesheetRepository.findById("ts_c")).thenReturn(Optional.of(draftTimesheet));
        when(timesheetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var req = comment(TimeEntry.DayOfWeek.MONDAY, "First comment");
        timesheetService.saveOvertimeComment("ts_c", "emp_c", req);

        assertThat(draftTimesheet.getOvertimeComments())
                .as("service must initialise the map when it is null")
                .isNotNull()
                .containsEntry(TimeEntry.DayOfWeek.MONDAY, "First comment");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private SaveOvertimeCommentRequest comment(TimeEntry.DayOfWeek day, String text) {
        var req = new SaveOvertimeCommentRequest();
        req.setDay(day);
        req.setComment(text);
        return req;
    }

    /** Stub the minimum queries toDetailResponse() needs. */
    private void stubToDetailResponse() {
        when(timeEntryRepository.findByTimesheetId("ts_c")).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
    }
}
