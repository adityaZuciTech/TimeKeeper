package com.timekeeper.service;

import com.timekeeper.dto.response.TimesheetResponse;
import com.timekeeper.entity.*;
import com.timekeeper.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
 * Unit tests for overtime computation logic inside TimesheetService.
 *
 * Tests target gaps G-01 (no existing overtime unit tests) and G-08
 * (clearOvertimeCommentIfNoLongerOT not tested).
 *
 * Coverage: T-matrix items O-01 through O-08, C-06, C-07.
 */
@ExtendWith(MockitoExtension.class)
class OvertimeComputationTest {

    @Mock TimesheetRepository   timesheetRepository;
    @Mock TimeEntryRepository   timeEntryRepository;
    @Mock EmployeeRepository    employeeRepository;
    @Mock ProjectRepository     projectRepository;
    @Mock LeaveRepository       leaveRepository;
    @Mock HolidayRepository     holidayRepository;
    @Mock NotificationService   notificationService;

    @InjectMocks TimesheetService timesheetService;

    // Week of 2020-01-06 (Mon) → 2020-01-10 (Fri) — fully in the past, no side-effects
    private static final LocalDate WEEK_MON = LocalDate.of(2020, 1, 6);  // Monday
    private static final LocalDate WEEK_TUE = LocalDate.of(2020, 1, 7);
    private static final LocalDate WEEK_FRI = LocalDate.of(2020, 1, 10);

    private Employee employee;
    private Timesheet timesheet;

    @BeforeEach
    void setUp() {
        employee = new Employee();
        employee.setId("emp_ot");
        employee.setName("OT Tester");
        employee.setEmail("ot@example.com");
        employee.setRole(Employee.Role.EMPLOYEE);

        timesheet = new Timesheet();
        timesheet.setId("ts_ot");
        timesheet.setEmployee(employee);
        timesheet.setWeekStartDate(WEEK_MON);
        timesheet.setWeekEndDate(WEEK_FRI);
        timesheet.setStatus(Timesheet.TimesheetStatus.DRAFT);
    }

    // ── O-01: Exactly 8h → 0 overtime ────────────────────────────────────────
    @Test
    void toDetailResponse_exactly8h_zeroOvertime() {
        TimeEntry e = workEntry("te_1", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0)); // 8h exactly

        when(timeEntryRepository.findByTimesheetId("ts_ot")).thenReturn(List.of(e));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var response = timesheetService.toDetailResponse(timesheet);

        var monday = dayByName(response, "MONDAY");
        assertThat(monday.getOvertimeHours())
                .as("exactly 8h should produce 0 overtime")
                .isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getTotalOvertimeHours())
                .isEqualByComparingTo(BigDecimal.ZERO);
    }

    // ── O-02: 10h → 2h overtime ───────────────────────────────────────────────
    @Test
    void toDetailResponse_10hOnOneDay_returns2hOvertime() {
        TimeEntry e = workEntry("te_1", TimeEntry.DayOfWeek.TUESDAY,
                LocalTime.of(7, 0), LocalTime.of(17, 0)); // 10h

        when(timeEntryRepository.findByTimesheetId("ts_ot")).thenReturn(List.of(e));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var response = timesheetService.toDetailResponse(timesheet);

        var tuesday = dayByName(response, "TUESDAY");
        assertThat(tuesday.getOvertimeHours())
                .as("10h work → 2h overtime")
                .isEqualByComparingTo(new BigDecimal("2.00"));
        assertThat(response.getTotalOvertimeHours())
                .isEqualByComparingTo(new BigDecimal("2.00"));
    }

    // ── O-03: 4h → 0 overtime (under threshold) ───────────────────────────────
    @Test
    void toDetailResponse_4hOnOneDay_zeroOvertime() {
        TimeEntry e = workEntry("te_1", TimeEntry.DayOfWeek.WEDNESDAY,
                LocalTime.of(9, 0), LocalTime.of(13, 0)); // 4h

        when(timeEntryRepository.findByTimesheetId("ts_ot")).thenReturn(List.of(e));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var response = timesheetService.toDetailResponse(timesheet);

        var wednesday = dayByName(response, "WEDNESDAY");
        assertThat(wednesday.getOvertimeHours()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    // ── O-04: Holiday day → 0 overtime regardless of entries ─────────────────
    @Test
    void toDetailResponse_holidayDay_zeroOvertimeEvenWith10hEntry() {
        Holiday holiday = new Holiday();
        holiday.setId("hol_1");
        holiday.setName("New Year");
        holiday.setDate(WEEK_TUE); // 2020-01-07 = Tuesday

        TimeEntry e = workEntry("te_1", TimeEntry.DayOfWeek.TUESDAY,
                LocalTime.of(7, 0), LocalTime.of(17, 0)); // 10h on a holiday

        when(timeEntryRepository.findByTimesheetId("ts_ot")).thenReturn(List.of(e));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any()))
                .thenReturn(List.of(holiday));
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var response = timesheetService.toDetailResponse(timesheet);

        var tuesday = dayByName(response, "TUESDAY");
        assertThat(tuesday.getOvertimeHours())
                .as("holiday day must produce 0 overtime even with entries > 8h")
                .isEqualByComparingTo(BigDecimal.ZERO);
    }

    // ── O-05: Approved leave day → 0 overtime ────────────────────────────────
    @Test
    void toDetailResponse_approvedLeaveDay_zeroOvertime() {
        Leave leave = new Leave();
        leave.setId("lv_1");
        leave.setEmployee(employee);
        leave.setStartDate(WEEK_TUE);
        leave.setEndDate(WEEK_TUE);
        leave.setStatus(Leave.LeaveStatus.APPROVED);
        leave.setLeaveType(Leave.LeaveType.VACATION);

        TimeEntry e = workEntry("te_1", TimeEntry.DayOfWeek.TUESDAY,
                LocalTime.of(7, 0), LocalTime.of(19, 0)); // 12h on an approved leave day

        when(timeEntryRepository.findByTimesheetId("ts_ot")).thenReturn(List.of(e));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of(leave));

        var response = timesheetService.toDetailResponse(timesheet);

        var tuesday = dayByName(response, "TUESDAY");
        assertThat(tuesday.getOvertimeHours())
                .as("approved leave day must produce 0 overtime")
                .isEqualByComparingTo(BigDecimal.ZERO);
    }

    // ── O-06: Multiple same-day entries accumulate correctly ──────────────────
    @Test
    void toDetailResponse_twoEntriesSameDay_accumulatesIntoOvertime() {
        // 9:00–13:00 (4h) + 14:00–21:00 (7h) = 11h total → 3h overtime
        TimeEntry morning   = workEntry("te_m", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0),  LocalTime.of(13, 0));
        TimeEntry afternoon = workEntry("te_a", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(14, 0), LocalTime.of(21, 0));

        when(timeEntryRepository.findByTimesheetId("ts_ot"))
                .thenReturn(List.of(morning, afternoon));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var response = timesheetService.toDetailResponse(timesheet);

        var monday = dayByName(response, "MONDAY");
        assertThat(monday.getOvertimeHours())
                .as("4h + 7h = 11h → 3h overtime")
                .isEqualByComparingTo(new BigDecimal("3.00"));
    }

    // ── O-07: Weekly total overtime = sum of daily values ─────────────────────
    @Test
    void toDetailResponse_overtimeOnTwoDays_weeklyTotalIsSumOfDailyValues() {
        // Mon: 10h → 2h OT; Wed: 9h → 1h OT; Total OT = 3h
        TimeEntry mon = workEntry("te_m", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(19, 0)); // 10h
        TimeEntry wed = workEntry("te_w", TimeEntry.DayOfWeek.WEDNESDAY,
                LocalTime.of(9, 0), LocalTime.of(18, 0)); // 9h

        when(timeEntryRepository.findByTimesheetId("ts_ot")).thenReturn(List.of(mon, wed));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var response = timesheetService.toDetailResponse(timesheet);

        assertThat(response.getTotalOvertimeHours())
                .as("2h (Mon) + 1h (Wed) = 3h total weekly overtime")
                .isEqualByComparingTo(new BigDecimal("3.00"));
    }

    // ── C-06 / G-08: deleteEntry clears OT comment when OT drops to 0 ─────────
    @Test
    void deleteEntry_whenOTDropsToZero_clearsOvertimeComment() {
        // Timesheet has a comment on MONDAY; deleting the only entry drops OT to 0
        EnumMap<TimeEntry.DayOfWeek, String> comments = new EnumMap<>(TimeEntry.DayOfWeek.class);
        comments.put(TimeEntry.DayOfWeek.MONDAY, "Late client deadline");
        timesheet.setOvertimeComments(comments);

        TimeEntry entry = workEntry("te_del", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(19, 0)); // Only entry (10h = 2h OT)
        entry.setTimesheet(timesheet);

        // After delete: no entries → 0 OT → comment should be removed
        when(timeEntryRepository.findById("te_del")).thenReturn(Optional.of(entry));
        when(timeEntryRepository.findByTimesheetId("ts_ot")).thenReturn(List.of()); // empty after delete
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        // clearOvertimeCommentIfNoLongerOT also calls findByDateBetween (non-ordered)
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());

        timesheetService.deleteEntry("te_del", "emp_ot");

        // Comment for MONDAY must have been removed; save() must have been called
        assertThat(timesheet.getOvertimeComments())
                .as("comment for MONDAY should be cleared after OT drops to 0")
                .doesNotContainKey(TimeEntry.DayOfWeek.MONDAY);
        verify(timesheetRepository, atLeastOnce()).save(timesheet);
    }

    // ── C-07: updateEntry clears OT comment when OT drops to 0 ──────────────
    @Test
    void updateEntry_whenOTDropsToZero_clearsOvertimeComment() {
        // Timesheet had 10h on Monday (2h OT); comment exists.
        // Updating the entry to 7h removes OT → comment should be cleared.
        EnumMap<TimeEntry.DayOfWeek, String> comments = new EnumMap<>(TimeEntry.DayOfWeek.class);
        comments.put(TimeEntry.DayOfWeek.MONDAY, "Client call ran late");
        timesheet.setOvertimeComments(comments);

        TimeEntry entry = workEntry("te_upd", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(19, 0)); // currently 10h
        entry.setTimesheet(timesheet);

        com.timekeeper.dto.request.UpdateTimeEntryRequest req =
                new com.timekeeper.dto.request.UpdateTimeEntryRequest();
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(16, 0)); // now 7h → no OT

        when(timeEntryRepository.findById("te_upd")).thenReturn(Optional.of(entry));
        // Overlap check returns entry itself (excluded by filter in validateNoOverlapExcluding)
        when(timeEntryRepository.findByTimesheetIdAndDay(any(), any())).thenReturn(List.of(entry));
        when(timeEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        // After update — toDetailResponse sees the updated 7h entry (no OT)
        when(timeEntryRepository.findByTimesheetId("ts_ot")).thenReturn(List.of(entry));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());

        timesheetService.updateEntry("te_upd", "emp_ot", req);

        assertThat(timesheet.getOvertimeComments())
                .as("comment should be cleared after hours drop below 8h")
                .doesNotContainKey(TimeEntry.DayOfWeek.MONDAY);
    }

    // ── E-07: addEntry on APPROVED timesheet blocked ──────────────────────────
    @Test
    void addEntry_approvedTimesheet_throwsBusinessException() {
        timesheet.setStatus(Timesheet.TimesheetStatus.APPROVED);
        when(timesheetRepository.findById("ts_ot")).thenReturn(Optional.of(timesheet));

        var req = new com.timekeeper.dto.request.AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.MONDAY);
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("proj_001");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(17, 0));

        assertThatThrownBy(() -> timesheetService.addEntry("ts_ot", "emp_ot", req))
                .isInstanceOf(com.timekeeper.exception.BusinessException.class)
                .hasMessageContaining("Cannot modify a submitted or approved timesheet");
    }

    // ── E-11: updateEntry on APPROVED timesheet blocked ──────────────────────
    @Test
    void updateEntry_approvedTimesheet_throwsBusinessException() {
        timesheet.setStatus(Timesheet.TimesheetStatus.APPROVED);
        TimeEntry entry = workEntry("te_1", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0));
        entry.setTimesheet(timesheet);

        when(timeEntryRepository.findById("te_1")).thenReturn(Optional.of(entry));

        var req = new com.timekeeper.dto.request.UpdateTimeEntryRequest();
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(18, 0));

        assertThatThrownBy(() -> timesheetService.updateEntry("te_1", "emp_ot", req))
                .isInstanceOf(com.timekeeper.exception.BusinessException.class)
                .hasMessageContaining("Cannot modify a submitted or approved timesheet");
    }

    // ── E-12: updateEntry — overlap with a different existing entry blocked ───
    @Test
    void updateEntry_overlappingWithOtherEntry_throwsBusinessException() {
        // existing1: 9:00–13:00  (will be excluded — it's the one being updated)
        // existing2: 14:00–17:00 (NOT excluded — different entry)
        // attempt:   Update existing1 to 9:00–15:00 → overlaps existing2 → should throw
        TimeEntry entryBeingUpdated = workEntry("te_upd", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(13, 0));
        entryBeingUpdated.setTimesheet(timesheet);

        TimeEntry other = workEntry("te_other", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(14, 0), LocalTime.of(17, 0));
        other.setTimesheet(timesheet);

        var req = new com.timekeeper.dto.request.UpdateTimeEntryRequest();
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(15, 0)); // now overlaps te_other (14:00–17:00)

        when(timeEntryRepository.findById("te_upd")).thenReturn(Optional.of(entryBeingUpdated));
        // Both entries returned; te_upd excluded by id, te_other remains → overlap triggered
        when(timeEntryRepository.findByTimesheetIdAndDay(any(), any()))
                .thenReturn(List.of(entryBeingUpdated, other));

        assertThatThrownBy(() -> timesheetService.updateEntry("te_upd", "emp_ot", req))
                .isInstanceOf(com.timekeeper.exception.BusinessException.class)
                .hasMessageContaining("overlap");
    }

    // ── E-16: startTime == endTime → blocked ─────────────────────────────────
    @Test
    void addEntry_startEqualsEnd_throwsBusinessException() {
        when(timesheetRepository.findById("ts_ot")).thenReturn(Optional.of(timesheet));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var req = new com.timekeeper.dto.request.AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.MONDAY);
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("proj_001");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(9, 0)); // same time

        assertThatThrownBy(() -> timesheetService.addEntry("ts_ot", "emp_ot", req))
                .isInstanceOf(com.timekeeper.exception.BusinessException.class)
                .hasMessageContaining("Start time must be before end time");
    }

    // ── E-17: startTime after endTime → blocked ───────────────────────────────
    @Test
    void addEntry_startAfterEnd_throwsBusinessException() {
        when(timesheetRepository.findById("ts_ot")).thenReturn(Optional.of(timesheet));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var req = new com.timekeeper.dto.request.AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.MONDAY);
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("proj_001");
        req.setStartTime(LocalTime.of(17, 0));
        req.setEndTime(LocalTime.of(9, 0)); // before start

        assertThatThrownBy(() -> timesheetService.addEntry("ts_ot", "emp_ot", req))
                .isInstanceOf(com.timekeeper.exception.BusinessException.class)
                .hasMessageContaining("Start time must be before end time");
    }

    // ── R-06: REJECTED timesheet can receive new entries (re-submit path) ─────
    @Test
    void addEntry_rejectedTimesheet_succeeds() {
        timesheet.setStatus(Timesheet.TimesheetStatus.REJECTED);

        Project project = new Project();
        project.setId("proj_ok");
        project.setName("Beta");
        project.setStatus(Project.ProjectStatus.ACTIVE);

        when(timesheetRepository.findById("ts_ot")).thenReturn(Optional.of(timesheet));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(projectRepository.findById("proj_ok")).thenReturn(Optional.of(project));
        when(timeEntryRepository.findByTimesheetIdAndDay(any(), any())).thenReturn(List.of());
        when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(inv -> {
            TimeEntry e = inv.getArgument(0);
            e.setId("te_new");
            e.setProject(project);
            return e;
        });
        when(timeEntryRepository.findByTimesheetId(any())).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());

        var req = new com.timekeeper.dto.request.AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.MONDAY);
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("proj_ok");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(17, 0));

        assertThatNoException().isThrownBy(() -> timesheetService.addEntry("ts_ot", "emp_ot", req));
    }

    // ── S-06: REJECTED timesheet can be re-submitted ──────────────────────────
    @Test
    void submit_rejectedTimesheet_succeeds() {
        timesheet.setStatus(Timesheet.TimesheetStatus.REJECTED);

        TimeEntry workEntry = workEntry("te_w", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0));
        workEntry.setTimesheet(timesheet);

        when(timesheetRepository.findById("ts_ot")).thenReturn(Optional.of(timesheet));
        when(timeEntryRepository.findByTimesheetId("ts_ot")).thenReturn(List.of(workEntry));
        when(timesheetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        assertThatNoException().isThrownBy(() -> timesheetService.submit("ts_ot", "emp_ot"));
        verify(timesheetRepository).save(argThat(ts ->
                ts.getStatus() == Timesheet.TimesheetStatus.SUBMITTED));
    }

    // ── S-07: APPROVED timesheet cannot be re-submitted ──────────────────────
    @Test
    void submit_approvedTimesheet_throwsBusinessException() {
        timesheet.setStatus(Timesheet.TimesheetStatus.APPROVED);
        when(timesheetRepository.findById("ts_ot")).thenReturn(Optional.of(timesheet));

        assertThatThrownBy(() -> timesheetService.submit("ts_ot", "emp_ot"))
                .isInstanceOf(com.timekeeper.exception.BusinessException.class);
    }

    // ── T-04: createOrGetForWeek — weekend date normalizes to Monday ──────────
    @Test
    void createOrGetForWeek_weekendDate_normalizesToMonday() {
        // 2020-01-11 is a Saturday; should normalize to 2020-01-06 (Monday)
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(eq("emp_ot"), eq(WEEK_MON)))
                .thenReturn(Optional.empty());
        when(employeeRepository.findById("emp_ot")).thenReturn(Optional.of(employee));
        when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(inv -> {
            Timesheet ts = inv.getArgument(0);
            ts.setId("ts_norm");
            return ts;
        });
        when(timeEntryRepository.findByTimesheetId(any())).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var req = new com.timekeeper.dto.request.CreateTimesheetRequest();
        req.setWeekStartDate(LocalDate.of(2020, 1, 11)); // Saturday

        var response = timesheetService.createOrGetForWeek("emp_ot", req);

        assertThat(response.getId()).isEqualTo("ts_norm");
    }

    // ── A-02: Manager approves own direct report ──────────────────────────────
    @Test
    void approveTimesheet_managerDirectReport_succeeds() {
        timesheet.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        employee.setManagerId("mgr_direct");

        when(timesheetRepository.findById("ts_ot")).thenReturn(Optional.of(timesheet));
        when(timesheetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(timeEntryRepository.findByTimesheetId(any())).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(employeeRepository.findById(any())).thenReturn(Optional.empty());

        assertThatNoException().isThrownBy(() ->
                timesheetService.approveTimesheet("ts_ot", "mgr_direct", Employee.Role.MANAGER));
        verify(timesheetRepository).save(argThat(ts ->
                ts.getStatus() == Timesheet.TimesheetStatus.APPROVED));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private TimeEntry workEntry(String id, TimeEntry.DayOfWeek day,
                                 LocalTime start, LocalTime end) {
        TimeEntry e = new TimeEntry();
        e.setId(id);
        e.setTimesheet(timesheet);
        e.setDay(day);
        e.setEntryType(TimeEntry.EntryType.WORK);
        e.setStartTime(start);
        e.setEndTime(end);
        long minutes = java.time.Duration.between(start, end).toMinutes();
        e.setHoursLogged(java.math.BigDecimal.valueOf(minutes)
                .divide(java.math.BigDecimal.valueOf(60), 2, java.math.RoundingMode.HALF_UP));
        return e;
    }

    private TimesheetResponse.DayResponse dayByName(TimesheetResponse response, String dayName) {
        return response.getDays().stream()
                .filter(d -> d.getDay().equals(dayName))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Day not found: " + dayName));
    }
}
