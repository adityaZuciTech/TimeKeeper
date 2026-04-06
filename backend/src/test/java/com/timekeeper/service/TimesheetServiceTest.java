package com.timekeeper.service;

import com.timekeeper.dto.request.AddTimeEntryRequest;
import com.timekeeper.dto.request.CreateTimesheetRequest;
import com.timekeeper.dto.request.UpdateTimeEntryRequest;
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
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimesheetServiceTest {

    @Mock TimesheetRepository timesheetRepository;
    @Mock TimeEntryRepository timeEntryRepository;
    @Mock EmployeeRepository employeeRepository;
    @Mock ProjectRepository projectRepository;
    @Mock LeaveRepository leaveRepository;
    @Mock HolidayRepository holidayRepository;
    @Mock NotificationService notificationService;

    @InjectMocks TimesheetService timesheetService;

    private Employee employee;
    private Timesheet timesheet;

    @BeforeEach
    void setUp() {
        employee = new Employee();
        employee.setId("emp_001");
        employee.setName("Carol White");
        employee.setEmail("carol@example.com");
        employee.setRole(Employee.Role.EMPLOYEE);

        timesheet = new Timesheet();
        timesheet.setId("ts_001");
        timesheet.setEmployee(employee);
        timesheet.setWeekStartDate(LocalDate.of(2026, 3, 16)); // Monday
        timesheet.setWeekEndDate(LocalDate.of(2026, 3, 20));   // Friday
        timesheet.setStatus(Timesheet.TimesheetStatus.DRAFT);
    }

    @Test
    void createOrGetForWeek_noExisting_createsNew() {
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any()))
                .thenReturn(Optional.empty());
        when(employeeRepository.findById("emp_001")).thenReturn(Optional.of(employee));
        when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(inv -> {
            Timesheet ts = inv.getArgument(0);
            ts.setId("ts_new");
            return ts;
        });
        when(timeEntryRepository.findByTimesheetId(any())).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        CreateTimesheetRequest req = new CreateTimesheetRequest();
        req.setWeekStartDate(LocalDate.of(2026, 3, 16));

        var response = timesheetService.createOrGetForWeek("emp_001", req);

        assertThat(response.getId()).isEqualTo("ts_new");
        assertThat(response.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void createOrGetForWeek_alreadyExists_returnsExisting() {
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any()))
                .thenReturn(Optional.of(timesheet));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        CreateTimesheetRequest req = new CreateTimesheetRequest();
        req.setWeekStartDate(LocalDate.of(2026, 3, 16));

        var response = timesheetService.createOrGetForWeek("emp_001", req);

        assertThat(response.getId()).isEqualTo("ts_001");
        verify(timesheetRepository, never()).save(any());
    }

    @Test
    void submit_withWorkEntries_succeeds() {
        TimeEntry workEntry = new TimeEntry();
        workEntry.setId("te_001");
        workEntry.setEntryType(TimeEntry.EntryType.WORK);
        workEntry.setDay(TimeEntry.DayOfWeek.MONDAY);
        workEntry.setHoursLogged(BigDecimal.valueOf(8));
        workEntry.setTimesheet(timesheet);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of(workEntry));
        when(timesheetRepository.save(any())).thenReturn(timesheet);
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var response = timesheetService.submit("ts_001", "emp_001");

        verify(timesheetRepository).save(argThat(ts -> ts.getStatus() == Timesheet.TimesheetStatus.SUBMITTED));
    }

    @Test
    void submit_emptyTimesheet_throwsBusinessException() {
        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of());

        assertThatThrownBy(() -> timesheetService.submit("ts_001", "emp_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("empty timesheet");
    }

    @Test
    void submit_wrongEmployee_throwsAccessDeniedException() {
        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));

        assertThatThrownBy(() -> timesheetService.submit("ts_001", "emp_WRONG"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void submit_alreadySubmitted_throwsBusinessException() {
        timesheet.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));

        assertThatThrownBy(() -> timesheetService.submit("ts_001", "emp_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already submitted");
    }

    @Test
    void addEntry_workEntry_validatesAndSaves() {
        Project project = new Project();
        project.setId("proj_001");
        project.setName("Alpha");
        project.setStatus(Project.ProjectStatus.ACTIVE);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(projectRepository.findById("proj_001")).thenReturn(Optional.of(project));
        when(timeEntryRepository.findByTimesheetIdAndDay(any(), any())).thenReturn(List.of());
        when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(inv -> {
            TimeEntry e = inv.getArgument(0);
            e.setId("te_001");
            e.setProject(project);
            return e;
        });
        // Additional mocks needed by toDetailResponse (called after save)
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());

        AddTimeEntryRequest req = new AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.MONDAY);
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("proj_001");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(17, 0));
        req.setDescription("Feature work");

        var response = timesheetService.addEntry("ts_001", "emp_001", req);

        // addEntry now returns TimesheetResponse (full updated timesheet, not just the entry)
        assertThat(response.getId()).isEqualTo("ts_001");
        assertThat(response.getStatus()).isEqualTo("DRAFT");
        verify(timeEntryRepository).save(argThat(e ->
                e.getEntryType() == TimeEntry.EntryType.WORK
                && "proj_001".equals(e.getProject().getId())));
    }

    @Test
    void addEntry_completedProject_throwsBusinessException() {
        Project project = new Project();
        project.setId("proj_001");
        project.setStatus(Project.ProjectStatus.COMPLETED);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(projectRepository.findById("proj_001")).thenReturn(Optional.of(project));
        when(timeEntryRepository.findByTimesheetIdAndDay(any(), any())).thenReturn(List.of());

        AddTimeEntryRequest req = new AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.TUESDAY);
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("proj_001");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(12, 0));

        assertThatThrownBy(() -> timesheetService.addEntry("ts_001", "emp_001", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("inactive project");
    }

    // ── TS-04: creating a timesheet for a past week is allowed ─────────────────
    @Test
    void createOrGetForWeek_pastWeek_createsNew() {
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any()))
                .thenReturn(Optional.empty());
        when(employeeRepository.findById("emp_001")).thenReturn(Optional.of(employee));
        when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(inv -> {
            Timesheet ts = inv.getArgument(0);
            ts.setId("ts_past");
            return ts;
        });
        when(timeEntryRepository.findByTimesheetId(any())).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        CreateTimesheetRequest req = new CreateTimesheetRequest();
        req.setWeekStartDate(LocalDate.of(2026, 1, 5)); // past week — always allowed

        var response = timesheetService.createOrGetForWeek("emp_001", req);

        assertThat(response.getId()).isEqualTo("ts_past");
        assertThat(response.getStatus()).isEqualTo("DRAFT");
    }

    // ── TS-08: daily 8h limit removed — entries over 8h are now allowed ───────
    // See toDetailResponse_over8h_singleEntry_splitsCorrectly for overtime computation tests.

    // ── TS-09: overlapping time blocks on same day ────────────────────────────
    @Test
    void addEntry_overlappingTimeBlock_throwsBusinessException() {
        Project project = new Project();
        project.setId("proj_001");
        project.setStatus(Project.ProjectStatus.ACTIVE);

        TimeEntry existingEntry = new TimeEntry();
        existingEntry.setId("te_existing");
        existingEntry.setEntryType(TimeEntry.EntryType.WORK);
        existingEntry.setDay(TimeEntry.DayOfWeek.MONDAY);
        existingEntry.setStartTime(LocalTime.of(9, 0));
        existingEntry.setEndTime(LocalTime.of(13, 0));
        existingEntry.setTimesheet(timesheet);
        existingEntry.setHoursLogged(BigDecimal.valueOf(4.0));

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(timeEntryRepository.findByTimesheetIdAndDay(any(), any()))
                .thenReturn(List.of(existingEntry)); // returns conflicting entry

        AddTimeEntryRequest req = new AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.MONDAY);
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("proj_001");
        req.setStartTime(LocalTime.of(10, 0));  // overlaps 9:00-13:00
        req.setEndTime(LocalTime.of(14, 0));

        assertThatThrownBy(() -> timesheetService.addEntry("ts_001", "emp_001", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("overlap");
    }

    // ── TS-10: entry on a company holiday ─────────────────────────────────────
    @Test
    void addEntry_onHoliday_throwsBusinessException() {
        Holiday holiday = new Holiday();
        holiday.setId("hol_001");
        holiday.setName("Public Holiday");
        holiday.setDate(LocalDate.of(2026, 3, 16));

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of(holiday));

        AddTimeEntryRequest req = new AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.MONDAY); // 2026-03-16 — matches the holiday
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("proj_001");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(17, 0));

        assertThatThrownBy(() -> timesheetService.addEntry("ts_001", "emp_001", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot log time on a company holiday");
    }

    // ── TS-11: entry on an approved leave day ─────────────────────────────────
    @Test
    void addEntry_onApprovedLeaveDay_throwsBusinessException() {
        Leave leave = new Leave();
        leave.setId("lv_001");
        leave.setEmployee(employee);
        leave.setStartDate(LocalDate.of(2026, 3, 16));
        leave.setEndDate(LocalDate.of(2026, 3, 18));
        leave.setStatus(Leave.LeaveStatus.APPROVED);
        leave.setLeaveType(Leave.LeaveType.SICK);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of()); // no holiday
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of(leave));

        AddTimeEntryRequest req = new AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.MONDAY); // 2026-03-16, covered by leave
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("proj_001");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(17, 0));

        assertThatThrownBy(() -> timesheetService.addEntry("ts_001", "emp_001", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot log time on an approved leave day");
    }

    // ── TS-13: entry on a submitted timesheet ─────────────────────────────────
    @Test
    void addEntry_onSubmittedTimesheet_throwsBusinessException() {
        timesheet.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));

        AddTimeEntryRequest req = new AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.MONDAY);
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("proj_001");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(17, 0));

        assertThatThrownBy(() -> timesheetService.addEntry("ts_001", "emp_001", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot modify a submitted or approved timesheet");
    }

    // ── TS-16: entry to another employee's timesheet ──────────────────────────
    @Test
    void addEntry_wrongEmployee_throwsAccessDeniedException() {
        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));

        AddTimeEntryRequest req = new AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.MONDAY);
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("proj_001");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(17, 0));

        assertThatThrownBy(() -> timesheetService.addEntry("ts_001", "emp_WRONG", req))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── TS-24: manager self-approves own timesheet ─────────────────────────────
    @Test
    void approveTimesheet_selfApproval_throwsAccessDeniedException() {
        timesheet.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));

        // emp_001 tries to approve their own timesheet
        assertThatThrownBy(() -> timesheetService.approveTimesheet("ts_001", "emp_001", Employee.Role.EMPLOYEE))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("cannot approve your own timesheet");
    }

    // ── TS-25: approve a DRAFT (not SUBMITTED) timesheet ──────────────────────
    @Test
    void approveTimesheet_draftTimesheet_throwsBusinessException() {
        // timesheet.status == DRAFT (from setUp)
        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));

        assertThatThrownBy(() -> timesheetService.approveTimesheet("ts_001", "manager_001", Employee.Role.MANAGER))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Only SUBMITTED timesheets can be approved");
    }

    // ── TS-23: manager approves timesheet of non-direct-report ────────────────
    @Test
    void approveTimesheet_managerForNonDirectReport_throwsAccessDeniedException() {
        timesheet.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        employee.setManagerId("manager_001"); // real manager
        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));

        // manager_002 tries to approve; employee's manager is manager_001
        assertThatThrownBy(() -> timesheetService.approveTimesheet("ts_001", "manager_002", Employee.Role.MANAGER))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Managers can only approve timesheets of their direct reports");
    }

    // ── TS-27 + TS-30: reject with reason stores reason and notifies employee ─
    @Test
    void rejectTimesheet_withReason_setsRejectedStatusAndNotifiesEmployee() {
        timesheet.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timesheetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(timeEntryRepository.findByTimesheetId(any())).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(employeeRepository.findById(any())).thenReturn(Optional.empty());

        var response = timesheetService.rejectTimesheet(
                "ts_001", "admin_001", Employee.Role.ADMIN, "Insufficient hours logged");

        assertThat(response.getStatus()).isEqualTo("REJECTED");
        assertThat(response.getRejectionReason()).isEqualTo("Insufficient hours logged");
        verify(timesheetRepository).save(argThat(ts ->
                ts.getStatus() == Timesheet.TimesheetStatus.REJECTED
                && "Insufficient hours logged".equals(ts.getRejectionReason())));
        // TS-30: notification message must contain the reason, no "null"
        verify(notificationService).create(
                eq("emp_001"),
                eq("Timesheet Rejected"),
                argThat(msg -> msg.contains("Insufficient hours logged") && !msg.contains("null")),
                eq(Notification.NotificationType.TIMESHEET_REJECTED),
                eq(Notification.NotificationSection.TIMESHEET));
    }

    // ── TS-28: reject without a reason throws exception ───────────────────────
    @Test
    void rejectTimesheet_withoutReason_throwsBusinessException() {
        timesheet.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        employee.setManagerId("manager_001"); // needed to pass scope check
        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));

        assertThatThrownBy(() -> timesheetService.rejectTimesheet(
                        "ts_001", "manager_001", Employee.Role.MANAGER, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("rejection reason is required");
    }

    // ── TS-29: manager self-rejects own timesheet ─────────────────────────────
    @Test
    void rejectTimesheet_selfRejection_throwsAccessDeniedException() {
        timesheet.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));

        assertThatThrownBy(() -> timesheetService.rejectTimesheet(
                        "ts_001", "emp_001", Employee.Role.EMPLOYEE, "reason"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("cannot reject your own timesheet");
    }

    // ── TS-31: reject a non-submitted (e.g. DRAFT) timesheet ──────────────────
    @Test
    void rejectTimesheet_draftTimesheet_throwsBusinessException() {
        // timesheet.status == DRAFT (from setUp)
        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));

        assertThatThrownBy(() -> timesheetService.rejectTimesheet(
                        "ts_001", "manager_001", Employee.Role.MANAGER, "reason"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Only SUBMITTED timesheets can be rejected");
    }

    // ── TS-32: update entry time range recalculates hours ─────────────────────
    @Test
    void updateEntry_validTimeRange_updatesHoursCorrectly() {
        TimeEntry entry = new TimeEntry();
        entry.setId("te_001");
        entry.setTimesheet(timesheet);
        entry.setDay(TimeEntry.DayOfWeek.MONDAY);
        entry.setEntryType(TimeEntry.EntryType.WORK);
        entry.setStartTime(LocalTime.of(9, 0));
        entry.setEndTime(LocalTime.of(13, 0));
        entry.setHoursLogged(BigDecimal.valueOf(4.0));

        UpdateTimeEntryRequest req = new UpdateTimeEntryRequest();
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(17, 0)); // update to 8h

        when(timeEntryRepository.findById("te_001")).thenReturn(Optional.of(entry));
        // Returns the entry itself — it is excluded from overlap check via excludeEntryId filter
        when(timeEntryRepository.findByTimesheetIdAndDay(any(), any())).thenReturn(List.of(entry));
        when(timeEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(timeEntryRepository.findByTimesheetId(any())).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var response = timesheetService.updateEntry("te_001", "emp_001", req);

        assertThat(response.getId()).isEqualTo("ts_001");
        verify(timeEntryRepository).save(argThat(e ->
                e.getHoursLogged().compareTo(BigDecimal.valueOf(8.0)) == 0
                && e.getStartTime().equals(LocalTime.of(9, 0))
                && e.getEndTime().equals(LocalTime.of(17, 0))));
    }

    // ── TS-33: update entry on submitted timesheet is blocked ─────────────────
    @Test
    void updateEntry_submittedTimesheet_throwsBusinessException() {
        timesheet.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        TimeEntry entry = new TimeEntry();
        entry.setId("te_001");
        entry.setTimesheet(timesheet);
        entry.setEntryType(TimeEntry.EntryType.WORK);

        when(timeEntryRepository.findById("te_001")).thenReturn(Optional.of(entry));

        UpdateTimeEntryRequest req = new UpdateTimeEntryRequest();
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(17, 0));

        assertThatThrownBy(() -> timesheetService.updateEntry("te_001", "emp_001", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot modify a submitted or approved timesheet");
    }

    // ── TS-34: delete entry removes it and returns updated timesheet ──────────
    @Test
    void deleteEntry_removesEntryAndReturnsTimesheet() {
        TimeEntry entry = new TimeEntry();
        entry.setId("te_001");
        entry.setTimesheet(timesheet);
        entry.setEntryType(TimeEntry.EntryType.WORK);

        when(timeEntryRepository.findById("te_001")).thenReturn(Optional.of(entry));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var response = timesheetService.deleteEntry("te_001", "emp_001");

        verify(timeEntryRepository).delete(entry);
        assertThat(response.getId()).isEqualTo("ts_001");
    }

    // ── TS-35: delete entry on submitted timesheet is blocked ─────────────────
    @Test
    void deleteEntry_submittedTimesheet_throwsBusinessException() {
        timesheet.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        TimeEntry entry = new TimeEntry();
        entry.setId("te_001");
        entry.setTimesheet(timesheet);
        entry.setEntryType(TimeEntry.EntryType.WORK);

        when(timeEntryRepository.findById("te_001")).thenReturn(Optional.of(entry));

        assertThatThrownBy(() -> timesheetService.deleteEntry("te_001", "emp_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot modify a submitted or approved timesheet");
    }

    // ── EDGE-04: submit with only LEAVE/HOLIDAY entries (no WORK) ─────────────
    @Test
    void submit_onlyLeaveEntries_throwsBusinessException() {
        TimeEntry leaveEntry = new TimeEntry();
        leaveEntry.setId("te_leave");
        leaveEntry.setEntryType(TimeEntry.EntryType.LEAVE);
        leaveEntry.setDay(TimeEntry.DayOfWeek.MONDAY);
        leaveEntry.setTimesheet(timesheet);
        leaveEntry.setHoursLogged(BigDecimal.ZERO);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of(leaveEntry));

        assertThatThrownBy(() -> timesheetService.submit("ts_001", "emp_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("empty timesheet");
    }

    // ── EDGE-05: add entry where total is exactly 8h — should succeed ─────────
    @Test
    void addEntry_exactlyAtEightHourBoundary_succeeds() {
        Project project = new Project();
        project.setId("proj_001");
        project.setName("Alpha");
        project.setStatus(Project.ProjectStatus.ACTIVE);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(projectRepository.findById("proj_001")).thenReturn(Optional.of(project));
        when(timeEntryRepository.findByTimesheetIdAndDay(any(), any())).thenReturn(List.of());
        when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(inv -> {
            TimeEntry e = inv.getArgument(0);
            e.setId("te_new");
            e.setProject(project);
            return e;
        });
        when(timeEntryRepository.findByTimesheetId(any())).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());

        AddTimeEntryRequest req = new AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.MONDAY);
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("proj_001");
        req.setStartTime(LocalTime.of(13, 0));
        req.setEndTime(LocalTime.of(17, 0)); // +4h — any amount now allowed
        req.setDescription("afternoon work");

        assertThatNoException().isThrownBy(() -> timesheetService.addEntry("ts_001", "emp_001", req));
    }

    // ── EDGE-07 removed: daily 8h cap is no longer enforced (overtime computed at aggregation layer) ─

    // ── EDGE-08: employee with no manager — submit succeeds, no notification ──
    @Test
    void submit_employeeWithNoManager_succeedsWithoutSendingNotification() {
        employee.setManagerId(null); // no manager assigned
        TimeEntry workEntry = new TimeEntry();
        workEntry.setId("te_001");
        workEntry.setEntryType(TimeEntry.EntryType.WORK);
        workEntry.setDay(TimeEntry.DayOfWeek.MONDAY);
        workEntry.setHoursLogged(BigDecimal.valueOf(8));
        workEntry.setTimesheet(timesheet);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of(workEntry));
        when(timesheetRepository.save(any())).thenReturn(timesheet);
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        timesheetService.submit("ts_001", "emp_001");

        verify(timesheetRepository).save(argThat(ts -> ts.getStatus() == Timesheet.TimesheetStatus.SUBMITTED));
        verifyNoInteractions(notificationService); // no manager → no notification sent
    }

    // ==========================================================================
    // Daily Overtime Tests
    // ==========================================================================

    /** Helper: create a WORK entry with the given day and times, hoursLogged recomputed from times. */
    private TimeEntry createWorkEntry(String id, TimeEntry.DayOfWeek day, LocalTime start, LocalTime end) {
        TimeEntry e = new TimeEntry();
        e.setId(id);
        e.setDay(day);
        e.setEntryType(TimeEntry.EntryType.WORK);
        e.setStartTime(start);
        e.setEndTime(end);
        long mins = Duration.between(start, end).toMinutes();
        e.setHoursLogged(BigDecimal.valueOf(mins / 60.0));
        e.setTimesheet(timesheet);
        return e;
    }

    @Test
    void toDetailResponse_under8h_overtimeIsZero() {
        TimeEntry entry = createWorkEntry("te_1", TimeEntry.DayOfWeek.MONDAY, LocalTime.of(9, 0), LocalTime.of(15, 0));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of(entry));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var resp = timesheetService.toDetailResponse(timesheet);
        var monday = resp.getDays().get(0);
        assertThat(monday.getRegularHours()).isEqualByComparingTo("6.00");
        assertThat(monday.getOvertimeHours()).isEqualByComparingTo("0.00");
        assertThat(resp.getTotalRegularHours()).isEqualByComparingTo("6.00");
        assertThat(resp.getTotalOvertimeHours()).isEqualByComparingTo("0.00");
    }

    @Test
    void toDetailResponse_exactly8h_overtimeIsZero() {
        TimeEntry entry = createWorkEntry("te_1", TimeEntry.DayOfWeek.MONDAY, LocalTime.of(9, 0), LocalTime.of(17, 0));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of(entry));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var monday = timesheetService.toDetailResponse(timesheet).getDays().get(0);
        assertThat(monday.getRegularHours()).isEqualByComparingTo("8.00");
        assertThat(monday.getOvertimeHours()).isEqualByComparingTo("0.00");
    }

    @Test
    void toDetailResponse_exactly8h_multipleEntries_overtimeIsZero() {
        // 4 × 2h entries on Monday = 8h exactly
        List<TimeEntry> entries = List.of(
                createWorkEntry("te_1", TimeEntry.DayOfWeek.MONDAY, LocalTime.of(8, 0),  LocalTime.of(10, 0)),
                createWorkEntry("te_2", TimeEntry.DayOfWeek.MONDAY, LocalTime.of(10, 0), LocalTime.of(12, 0)),
                createWorkEntry("te_3", TimeEntry.DayOfWeek.MONDAY, LocalTime.of(13, 0), LocalTime.of(15, 0)),
                createWorkEntry("te_4", TimeEntry.DayOfWeek.MONDAY, LocalTime.of(15, 0), LocalTime.of(17, 0))
        );
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(entries);
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var monday = timesheetService.toDetailResponse(timesheet).getDays().get(0);
        assertThat(monday.getRegularHours()).isEqualByComparingTo("8.00");
        assertThat(monday.getOvertimeHours()).isEqualByComparingTo("0.00");
    }

    @Test
    void toDetailResponse_over8h_singleEntry_splitsCorrectly() {
        // 10h entry on Monday
        TimeEntry entry = createWorkEntry("te_1", TimeEntry.DayOfWeek.MONDAY, LocalTime.of(8, 0), LocalTime.of(18, 0));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of(entry));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var resp = timesheetService.toDetailResponse(timesheet);
        var monday = resp.getDays().get(0);
        assertThat(monday.getRegularHours()).isEqualByComparingTo("8.00");
        assertThat(monday.getOvertimeHours()).isEqualByComparingTo("2.00");
        assertThat(resp.getTotalOvertimeHours()).isEqualByComparingTo("2.00");
    }

    @Test
    void toDetailResponse_multipleEntriesSumOver8h() {
        // Mon: 5h + 4.5h = 9.5h → OT 1.5h
        List<TimeEntry> entries = List.of(
                createWorkEntry("te_1", TimeEntry.DayOfWeek.MONDAY, LocalTime.of(8,  0), LocalTime.of(13, 0)),
                createWorkEntry("te_2", TimeEntry.DayOfWeek.MONDAY, LocalTime.of(14, 0), LocalTime.of(18, 30))
        );
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(entries);
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var monday = timesheetService.toDetailResponse(timesheet).getDays().get(0);
        assertThat(monday.getRegularHours()).isEqualByComparingTo("8.00");
        assertThat(monday.getOvertimeHours()).isEqualByComparingTo("1.50");
    }

    @Test
    void toDetailResponse_holidayDay_allFieldsZero() {
        Holiday holiday = new Holiday();
        holiday.setId("hol_001");
        holiday.setName("Test Holiday");
        holiday.setDate(LocalDate.of(2026, 3, 16)); // Monday of the test timesheet week

        TimeEntry entry = createWorkEntry("te_1", TimeEntry.DayOfWeek.MONDAY, LocalTime.of(8, 0), LocalTime.of(18, 0));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of(entry));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of(holiday));
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var monday = timesheetService.toDetailResponse(timesheet).getDays().get(0);
        assertThat(monday.getRegularHours()).isEqualByComparingTo("0.00");
        assertThat(monday.getOvertimeHours()).isEqualByComparingTo("0.00");
        assertThat(monday.getTotalHours()).isEqualByComparingTo("0.00");
    }

    @Test
    void toDetailResponse_approvedLeaveDay_allFieldsZero() {
        Leave leave = new Leave();
        leave.setId("lv_001");
        leave.setEmployee(employee);
        leave.setStartDate(LocalDate.of(2026, 3, 16));
        leave.setEndDate(LocalDate.of(2026, 3, 16));
        leave.setStatus(Leave.LeaveStatus.APPROVED);
        leave.setLeaveType(Leave.LeaveType.SICK);

        TimeEntry entry = createWorkEntry("te_1", TimeEntry.DayOfWeek.MONDAY, LocalTime.of(8, 0), LocalTime.of(18, 0));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of(entry));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of(leave));

        var monday = timesheetService.toDetailResponse(timesheet).getDays().get(0);
        assertThat(monday.getRegularHours()).isEqualByComparingTo("0.00");
        assertThat(monday.getOvertimeHours()).isEqualByComparingTo("0.00");
    }

    @Test
    void toDetailResponse_submittedTimesheet_overtimeStillComputed() {
        timesheet.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        TimeEntry entry = createWorkEntry("te_1", TimeEntry.DayOfWeek.MONDAY, LocalTime.of(8, 0), LocalTime.of(18, 0));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of(entry));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var resp = timesheetService.toDetailResponse(timesheet);
        var monday = resp.getDays().get(0);
        assertThat(monday.getOvertimeHours()).isEqualByComparingTo("2.00");
        assertThat(monday.isEditable()).isFalse(); // still locked
    }

    @Test
    void toDetailResponse_rounding_80min_gives1point33() {
        // 80 minutes = 1h20m → 80/60 = 1.3333... rounds HALF_UP to 1.33
        TimeEntry entry = createWorkEntry("te_1", TimeEntry.DayOfWeek.MONDAY, LocalTime.of(9, 0), LocalTime.of(10, 20));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of(entry));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var monday = timesheetService.toDetailResponse(timesheet).getDays().get(0);
        assertThat(monday.getRegularHours()).isEqualByComparingTo("1.33");
        assertThat(monday.getOvertimeHours()).isEqualByComparingTo("0.00");
        assertThat(monday.getTotalHours()).isEqualByComparingTo("1.33");
    }

    @Test
    void toSummaryResponse_multiDayOvertimeSums() {
        // Mon=10h (600min), Tue=7h (420min)
        TimeEntry monEntry = createWorkEntry("te_1", TimeEntry.DayOfWeek.MONDAY,  LocalTime.of(8, 0), LocalTime.of(18, 0));
        TimeEntry tueEntry = createWorkEntry("te_2", TimeEntry.DayOfWeek.TUESDAY, LocalTime.of(9, 0), LocalTime.of(16, 0));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of(monEntry, tueEntry));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var resp = timesheetService.toSummaryResponse(timesheet);
        assertThat(resp.getTotalRegularHours()).isEqualByComparingTo("15.00"); // 8 + 7
        assertThat(resp.getTotalOvertimeHours()).isEqualByComparingTo("2.00");  // (10-8) + 0
        assertThat(resp.getTotalHours()).isEqualByComparingTo("17.00");
        assertThat(resp.getDays()).isNull(); // summary responses have no days list
    }

    @Test
    void updateEntry_over8h_nowAllowed() {
        TimeEntry entry = new TimeEntry();
        entry.setId("te_001");
        entry.setTimesheet(timesheet);
        entry.setDay(TimeEntry.DayOfWeek.MONDAY);
        entry.setEntryType(TimeEntry.EntryType.WORK);
        entry.setStartTime(LocalTime.of(9, 0));
        entry.setEndTime(LocalTime.of(16, 0));
        entry.setHoursLogged(BigDecimal.valueOf(7.0));

        // Update to 9h — was blocked by old 8h cap; now allowed
        UpdateTimeEntryRequest req = new UpdateTimeEntryRequest();
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(18, 0));

        when(timeEntryRepository.findById("te_001")).thenReturn(Optional.of(entry));
        when(timeEntryRepository.findByTimesheetIdAndDay(any(), any())).thenReturn(List.of(entry));
        when(timeEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(timeEntryRepository.findByTimesheetId(any())).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        assertThatNoException().isThrownBy(() -> timesheetService.updateEntry("te_001", "emp_001", req));
        verify(timeEntryRepository).save(argThat(e ->
                e.getHoursLogged().compareTo(BigDecimal.valueOf(9.0)) == 0));
    }

    // ==========================================================================
    // Copy Last Week Tests
    // ==========================================================================

    private TimeEntry createWorkEntryForCopy(String id, TimeEntry.DayOfWeek day,
                                              LocalTime start, LocalTime end, Project project) {
        TimeEntry e = createWorkEntry(id, day, start, end);
        e.setProject(project);
        return e;
    }

    private Project activeProject(String id) {
        Project p = new Project();
        p.setId(id);
        p.setName("Project " + id);
        p.setStatus(Project.ProjectStatus.ACTIVE);
        return p;
    }

    private Timesheet sourceTsForPrevWeek() {
        Timesheet src = new Timesheet();
        src.setId("ts_src");
        src.setEmployee(employee);
        src.setWeekStartDate(LocalDate.of(2026, 3, 9)); // one week before ts_001 (2026-03-16)
        src.setStatus(Timesheet.TimesheetStatus.DRAFT);
        return src;
    }

    @Test
    void copy_noSourceTimesheet_returnsZeroCopied() {
        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any())).thenReturn(Optional.empty());
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var result = timesheetService.copyFromPreviousWeek("ts_001", "emp_001");
        assertThat(result.getCopySummary().getCopiedCount()).isEqualTo(0);
        assertThat(result.getCopySummary().getMessage()).contains("No previous week timesheet found");
    }

    @Test
    void copy_sourceWithNoWorkEntries_returnsZeroCopied() {
        Timesheet sourceTs = sourceTsForPrevWeek();
        TimeEntry leaveEntry = new TimeEntry();
        leaveEntry.setId("te_lv");
        leaveEntry.setEntryType(TimeEntry.EntryType.LEAVE);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any()))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId("ts_src")).thenReturn(List.of(leaveEntry));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var result = timesheetService.copyFromPreviousWeek("ts_001", "emp_001");
        assertThat(result.getCopySummary().getCopiedCount()).isEqualTo(0);
        assertThat(result.getCopySummary().getMessage()).contains("no work entries");
    }

    @Test
    void copy_submittedSource_copiesEntries() {
        Timesheet sourceTs = sourceTsForPrevWeek();
        sourceTs.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        Project project = activeProject("prj_001");
        TimeEntry srcEntry = createWorkEntryForCopy("te_src", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), project);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any()))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId("ts_src")).thenReturn(List.of(srcEntry));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of());
        when(projectRepository.findAllById(any())).thenReturn(List.of(project));
        when(timeEntryRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());

        var result = timesheetService.copyFromPreviousWeek("ts_001", "emp_001");
        assertThat(result.getCopySummary().getCopiedCount()).isEqualTo(1);
        assertThat(result.getCopySummary().getSkippedCount()).isEqualTo(0);
    }

    @Test
    void copy_targetRejected_copiesEntries() {
        timesheet.setStatus(Timesheet.TimesheetStatus.REJECTED);
        Timesheet sourceTs = sourceTsForPrevWeek();
        Project project = activeProject("prj_001");
        TimeEntry srcEntry = createWorkEntryForCopy("te_src", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), project);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any()))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId("ts_src")).thenReturn(List.of(srcEntry));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of());
        when(projectRepository.findAllById(any())).thenReturn(List.of(project));
        when(timeEntryRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());

        assertThatNoException().isThrownBy(
                () -> timesheetService.copyFromPreviousWeek("ts_001", "emp_001"));
    }

    @Test
    void copy_targetSubmitted_throwsBusinessException() {
        timesheet.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));

        assertThatThrownBy(() -> timesheetService.copyFromPreviousWeek("ts_001", "emp_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("non-DRAFT");
    }

    @Test
    void copy_skipHolidayDay() {
        Holiday holiday = new Holiday();
        holiday.setId("hol_001");
        holiday.setDate(LocalDate.of(2026, 3, 16)); // Monday of target week

        Timesheet sourceTs = sourceTsForPrevWeek();
        Project project = activeProject("prj_001");
        TimeEntry srcEntry = createWorkEntryForCopy("te_src", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), project);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any()))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId("ts_src")).thenReturn(List.of(srcEntry));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of(holiday));
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of());
        when(timeEntryRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of(holiday));

        var result = timesheetService.copyFromPreviousWeek("ts_001", "emp_001");
        assertThat(result.getCopySummary().getCopiedCount()).isEqualTo(0);
        assertThat(result.getCopySummary().getSkippedCount()).isEqualTo(1);
        assertThat(result.getCopySummary().getSkippedEntries().get(0).getReason())
                .isEqualTo("HOLIDAY_DAY");
    }

    @Test
    void copy_skipApprovedLeave() {
        Leave leave = new Leave();
        leave.setId("lv_001");
        leave.setEmployee(employee);
        leave.setStartDate(LocalDate.of(2026, 3, 16));
        leave.setEndDate(LocalDate.of(2026, 3, 16));
        leave.setStatus(Leave.LeaveStatus.APPROVED);
        leave.setLeaveType(Leave.LeaveType.CASUAL);

        Timesheet sourceTs = sourceTsForPrevWeek();
        Project project = activeProject("prj_001");
        TimeEntry srcEntry = createWorkEntryForCopy("te_src", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), project);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any()))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId("ts_src")).thenReturn(List.of(srcEntry));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of(leave));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of());
        when(timeEntryRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());

        var result = timesheetService.copyFromPreviousWeek("ts_001", "emp_001");
        assertThat(result.getCopySummary().getSkippedCount()).isEqualTo(1);
        assertThat(result.getCopySummary().getSkippedEntries().get(0).getReason())
                .isEqualTo("LEAVE_DAY");
    }

    @Test
    void copy_skipCompletedProject() {
        Project completedProject = new Project();
        completedProject.setId("prj_done");
        completedProject.setName("Legacy");
        completedProject.setStatus(Project.ProjectStatus.COMPLETED);

        Timesheet sourceTs = sourceTsForPrevWeek();
        TimeEntry srcEntry = createWorkEntryForCopy("te_src", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), completedProject);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any()))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId("ts_src")).thenReturn(List.of(srcEntry));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of());
        when(projectRepository.findAllById(any())).thenReturn(List.of(completedProject));
        when(timeEntryRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());

        var result = timesheetService.copyFromPreviousWeek("ts_001", "emp_001");
        assertThat(result.getCopySummary().getSkippedEntries().get(0).getReason())
                .isEqualTo("PROJECT_NOT_ACTIVE");
    }

    @Test
    void copy_skipDeletedProject() {
        Project missingProject = new Project();
        missingProject.setId("prj_gone");
        missingProject.setStatus(Project.ProjectStatus.ACTIVE);

        Timesheet sourceTs = sourceTsForPrevWeek();
        TimeEntry srcEntry = createWorkEntryForCopy("te_src", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), missingProject);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any()))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId("ts_src")).thenReturn(List.of(srcEntry));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of());
        when(projectRepository.findAllById(any())).thenReturn(List.of()); // deleted project — returns empty
        when(timeEntryRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());

        var result = timesheetService.copyFromPreviousWeek("ts_001", "emp_001");
        assertThat(result.getCopySummary().getSkippedEntries().get(0).getReason())
                .isEqualTo("PROJECT_NOT_ACTIVE");
    }

    @Test
    void copy_skipDuplicateEntry_idempotency() {
        Project project = activeProject("prj_001");
        TimeEntry existingTarget = createWorkEntryForCopy("te_existing", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), project);
        TimeEntry srcEntry = createWorkEntryForCopy("te_src", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), project); // identical

        Timesheet sourceTs = sourceTsForPrevWeek();

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any()))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId("ts_src")).thenReturn(List.of(srcEntry));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of(existingTarget));
        when(projectRepository.findAllById(any())).thenReturn(List.of(project));
        when(timeEntryRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());

        var result = timesheetService.copyFromPreviousWeek("ts_001", "emp_001");
        assertThat(result.getCopySummary().getCopiedCount()).isEqualTo(0);
        assertThat(result.getCopySummary().getSkippedEntries().get(0).getReason())
                .isEqualTo("DUPLICATE_ENTRY");
    }

    @Test
    void copy_backToBackEntries_bothCopied() {
        // Source: 09:00–13:00 and 13:00–17:00 back-to-back on the same day.
        // Boundary-touching is NOT an overlap — both entries must be copied.
        Project project = activeProject("prj_001");
        TimeEntry srcEntry1 = createWorkEntryForCopy("te_s1", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(13, 0), project);
        TimeEntry srcEntry2 = createWorkEntryForCopy("te_s2", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(13, 0), LocalTime.of(17, 0), project);

        Timesheet sourceTs = sourceTsForPrevWeek();

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any()))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId("ts_src")).thenReturn(List.of(srcEntry1, srcEntry2));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of());
        when(projectRepository.findAllById(any())).thenReturn(List.of(project));
        when(timeEntryRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());

        var result = timesheetService.copyFromPreviousWeek("ts_001", "emp_001");
        assertThat(result.getCopySummary().getCopiedCount()).isEqualTo(2);
        assertThat(result.getCopySummary().getSkippedCount()).isEqualTo(0);
    }

    @Test
    void copy_selfOverlappingSourceEntries_secondEntrySkipped() {
        // Source: Mon 09:00–11:00 AND Mon 10:00–12:00 (self-overlapping legacy data)
        // First accepted and added to virtualEntries; second blocked by OVERLAP_STRICT against first
        Project project = activeProject("prj_001");
        TimeEntry srcEntry1 = createWorkEntryForCopy("te_s1", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(11, 0), project);
        TimeEntry srcEntry2 = createWorkEntryForCopy("te_s2", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(10, 0), LocalTime.of(12, 0), project);

        Timesheet sourceTs = sourceTsForPrevWeek();

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any()))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId("ts_src")).thenReturn(List.of(srcEntry1, srcEntry2));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of()); // target is empty
        when(projectRepository.findAllById(any())).thenReturn(List.of(project));
        when(timeEntryRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());

        var result = timesheetService.copyFromPreviousWeek("ts_001", "emp_001");
        assertThat(result.getCopySummary().getCopiedCount()).isEqualTo(1);
        assertThat(result.getCopySummary().getSkippedCount()).isEqualTo(1);
        assertThat(result.getCopySummary().getSkippedEntries().get(0).getReason())
                .isEqualTo("OVERLAP_STRICT");
    }

    @Test
    void copy_mixed_partialCopyAndSkips() {
        // Mon: holiday → skip; Tue: active project → copy; Wed: completed project → skip
        Holiday holiday = new Holiday();
        holiday.setId("hol_001");
        holiday.setDate(LocalDate.of(2026, 3, 16)); // Monday of target week

        Project activeProj   = activeProject("prj_active");
        Project completedProj = new Project();
        completedProj.setId("prj_done");
        completedProj.setName("Completed");
        completedProj.setStatus(Project.ProjectStatus.COMPLETED);

        Timesheet sourceTs = sourceTsForPrevWeek();
        TimeEntry srcMon = createWorkEntryForCopy("te_s1", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), activeProj);
        TimeEntry srcTue = createWorkEntryForCopy("te_s2", TimeEntry.DayOfWeek.TUESDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), activeProj);
        TimeEntry srcWed = createWorkEntryForCopy("te_s3", TimeEntry.DayOfWeek.WEDNESDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), completedProj);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any()))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId("ts_src")).thenReturn(List.of(srcMon, srcTue, srcWed));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of(holiday));
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of());
        when(projectRepository.findAllById(any())).thenReturn(List.of(activeProj, completedProj));
        when(timeEntryRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of(holiday));

        var result = timesheetService.copyFromPreviousWeek("ts_001", "emp_001");
        assertThat(result.getCopySummary().getCopiedCount()).isEqualTo(1);  // Tue
        assertThat(result.getCopySummary().getSkippedCount()).isEqualTo(2); // Mon (holiday) + Wed (completed)
    }

    @Test
    void copy_skipOnHoldProject() {
        Project onHoldProject = new Project();
        onHoldProject.setId("prj_hold");
        onHoldProject.setName("On Hold Project");
        onHoldProject.setStatus(Project.ProjectStatus.ON_HOLD);

        Timesheet sourceTs = sourceTsForPrevWeek();
        TimeEntry srcEntry = createWorkEntryForCopy("te_src", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), onHoldProject);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any()))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId("ts_src")).thenReturn(List.of(srcEntry));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of());
        when(projectRepository.findAllById(any())).thenReturn(List.of(onHoldProject));
        when(timeEntryRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());

        var result = timesheetService.copyFromPreviousWeek("ts_001", "emp_001");
        assertThat(result.getCopySummary().getSkippedCount()).isEqualTo(1);
        assertThat(result.getCopySummary().getSkippedEntries().get(0).getReason())
                .isEqualTo("PROJECT_NOT_ACTIVE");
    }

    @Test
    void addEntry_onHoldProject_throwsBusinessException() {
        Project onHoldProject = new Project();
        onHoldProject.setId("prj_hold");
        onHoldProject.setStatus(Project.ProjectStatus.ON_HOLD);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(projectRepository.findById("prj_hold")).thenReturn(Optional.of(onHoldProject));
        when(timeEntryRepository.findByTimesheetIdAndDay(any(), any())).thenReturn(List.of());

        AddTimeEntryRequest req = new AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.MONDAY);
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("prj_hold");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(17, 0));

        assertThatThrownBy(() -> timesheetService.addEntry("ts_001", "emp_001", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("inactive project");
    }

    @Test
    void copy_futureDayEntry_copied() {
        // Future dates in the target week are allowed to be copied (no FUTURE_DAY restriction).
        // Both Mon Mar 30 (past) and Thu Apr 2 (today/future) should be copied.
        Timesheet targetTs = new Timesheet();
        targetTs.setId("ts_future");
        targetTs.setEmployee(employee);
        targetTs.setWeekStartDate(LocalDate.of(2026, 3, 30));
        targetTs.setWeekEndDate(LocalDate.of(2026, 4, 3));
        targetTs.setStatus(Timesheet.TimesheetStatus.DRAFT);

        Timesheet sourceTs = new Timesheet();
        sourceTs.setId("ts_src_future");
        sourceTs.setEmployee(employee);
        sourceTs.setWeekStartDate(LocalDate.of(2026, 3, 23));
        sourceTs.setStatus(Timesheet.TimesheetStatus.DRAFT);

        Project project = activeProject("prj_001");
        TimeEntry srcMon = createWorkEntryForCopy("te_mon", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), project);  // Mar 30 — copies
        TimeEntry srcThu = createWorkEntryForCopy("te_thu", TimeEntry.DayOfWeek.THURSDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), project);  // Apr 2 — also copies

        when(timesheetRepository.findById("ts_future")).thenReturn(Optional.of(targetTs));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(any(), any()))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId("ts_src_future")).thenReturn(List.of(srcMon, srcThu));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(timeEntryRepository.findByTimesheetId("ts_future")).thenReturn(List.of());
        when(projectRepository.findAllById(any())).thenReturn(List.of(project));
        when(timeEntryRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());

        var result = timesheetService.copyFromPreviousWeek("ts_future", "emp_001");
        assertThat(result.getCopySummary().getCopiedCount()).isEqualTo(2);
        assertThat(result.getCopySummary().getSkippedCount()).isEqualTo(0);
    }

    @Test
    void updateEntry_hoursLogged_precision() {
        // 61-minute block (09:00-10:01) must be stored as 1.02 using HALF_UP scale-2.
        // Regression: double arithmetic BigDecimal.valueOf(61 / 60.0) = 1.0166... (wrong precision).
        TimeEntry entry = new TimeEntry();
        entry.setId("te_precision");
        entry.setTimesheet(timesheet);
        entry.setDay(TimeEntry.DayOfWeek.MONDAY);
        entry.setEntryType(TimeEntry.EntryType.WORK);
        entry.setStartTime(LocalTime.of(9, 0));
        entry.setEndTime(LocalTime.of(10, 0));
        entry.setHoursLogged(BigDecimal.valueOf(1.0));

        UpdateTimeEntryRequest req = new UpdateTimeEntryRequest();
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(10, 1));  // 61 minutes

        when(timeEntryRepository.findById("te_precision")).thenReturn(Optional.of(entry));
        when(timeEntryRepository.findByTimesheetIdAndDay(any(), any())).thenReturn(List.of(entry));
        when(timeEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(timeEntryRepository.findByTimesheetId(any())).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        timesheetService.updateEntry("te_precision", "emp_001", req);

        verify(timeEntryRepository).save(argThat(e ->
                e.getHoursLogged().compareTo(new BigDecimal("1.02")) == 0));
    }

    @Test
    void copy_targetApproved_throwsBusinessException() {
        // APPROVED timesheets are locked — copy must be blocked just like SUBMITTED
        timesheet.setStatus(Timesheet.TimesheetStatus.APPROVED);
        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));

        assertThatThrownBy(() -> timesheetService.copyFromPreviousWeek("ts_001", "emp_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("non-DRAFT");
    }

    @Test
    void copy_accessDenied_throwsAccessDeniedException() {
        // Timesheet belongs to emp_001; requester is emp_999 — must be rejected
        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));

        assertThatThrownBy(() -> timesheetService.copyFromPreviousWeek("ts_001", "emp_999"))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── TS-SUBMIT-01: all WORK entries are on future dates ────────────────────

    @Test
    void submit_onlyFutureEntries_throwsBusinessException() {
        // Place the timesheet in a future week so every day is in the future
        LocalDate nextMonday = LocalDate.now().plusWeeks(1).with(java.time.DayOfWeek.MONDAY);
        timesheet.setWeekStartDate(nextMonday);
        timesheet.setWeekEndDate(nextMonday.plusDays(4));

        TimeEntry futureEntry = new TimeEntry();
        futureEntry.setId("te_future");
        futureEntry.setEntryType(TimeEntry.EntryType.WORK);
        futureEntry.setDay(TimeEntry.DayOfWeek.MONDAY); // offset 0 → nextMonday → strictly future
        futureEntry.setHoursLogged(BigDecimal.valueOf(8));
        futureEntry.setTimesheet(timesheet);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of(futureEntry));

        assertThatThrownBy(() -> timesheetService.submit("ts_001", "emp_001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("future-dated");
    }

    // ── TS-SUBMIT-02: one past entry + one future entry → submit succeeds ─────

    @Test
    void submit_onePastOneFutureEntry_submitsSuccessfully() {
        // weekStart is in the past; Monday = past day, Friday = future day (fine together)
        // Use the existing timesheet (weekStartDate = 2026-03-16, a past Monday)
        TimeEntry pastEntry = new TimeEntry();
        pastEntry.setId("te_past");
        pastEntry.setEntryType(TimeEntry.EntryType.WORK);
        pastEntry.setDay(TimeEntry.DayOfWeek.MONDAY); // 2026-03-16 — past
        pastEntry.setHoursLogged(BigDecimal.valueOf(8));
        pastEntry.setTimesheet(timesheet);

        // weekStartDate(2026-03-16) + 4 days = 2026-03-20 (past as of April 2026, so this
        // test also passes — both are past; the key invariant is at least one is non-future)
        TimeEntry otherEntry = new TimeEntry();
        otherEntry.setId("te_other");
        otherEntry.setEntryType(TimeEntry.EntryType.WORK);
        otherEntry.setDay(TimeEntry.DayOfWeek.FRIDAY); // 2026-03-20 — also past, combination is fine
        otherEntry.setHoursLogged(BigDecimal.valueOf(6));
        otherEntry.setTimesheet(timesheet);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of(pastEntry, otherEntry));
        when(timesheetRepository.save(any())).thenReturn(timesheet);
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        var response = timesheetService.submit("ts_001", "emp_001");

        verify(timesheetRepository).save(argThat(ts ->
                ts.getStatus() == Timesheet.TimesheetStatus.SUBMITTED));
    }

    // ── TS-SUBMIT-03: all WORK entries on past dates → submit succeeds ────────

    @Test
    void submit_allPastEntries_submitsSuccessfully() {
        // timesheet.weekStartDate = 2026-03-16 — all entries in a past week
        TimeEntry e1 = new TimeEntry();
        e1.setId("te_1");
        e1.setEntryType(TimeEntry.EntryType.WORK);
        e1.setDay(TimeEntry.DayOfWeek.MONDAY);
        e1.setHoursLogged(BigDecimal.valueOf(8));
        e1.setTimesheet(timesheet);

        TimeEntry e2 = new TimeEntry();
        e2.setId("te_2");
        e2.setEntryType(TimeEntry.EntryType.WORK);
        e2.setDay(TimeEntry.DayOfWeek.TUESDAY);
        e2.setHoursLogged(BigDecimal.valueOf(8));
        e2.setTimesheet(timesheet);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(timeEntryRepository.findByTimesheetId("ts_001")).thenReturn(List.of(e1, e2));
        when(timesheetRepository.save(any())).thenReturn(timesheet);
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());

        timesheetService.submit("ts_001", "emp_001");

        verify(timesheetRepository).save(argThat(ts ->
                ts.getStatus() == Timesheet.TimesheetStatus.SUBMITTED));
    }
}
