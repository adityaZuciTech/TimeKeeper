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
        when(timeEntryRepository.sumHoursLoggedByTimesheetIdAndDay(any(), any())).thenReturn(null);
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
        when(timeEntryRepository.sumHoursLoggedByTimesheetIdAndDay(any(), any())).thenReturn(null);
        when(timeEntryRepository.findByTimesheetIdAndDay(any(), any())).thenReturn(List.of());

        AddTimeEntryRequest req = new AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.TUESDAY);
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("proj_001");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(12, 0));

        assertThatThrownBy(() -> timesheetService.addEntry("ts_001", "emp_001", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("completed project");
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

    // ── TS-08: daily 8h limit enforced ─────────────────────────────────────────
    @Test
    void addEntry_exceedsDailyHourLimit_throwsBusinessException() {
        Project project = new Project();
        project.setId("proj_001");
        project.setStatus(Project.ProjectStatus.ACTIVE);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(timeEntryRepository.sumHoursLoggedByTimesheetIdAndDay(any(), any()))
                .thenReturn(java.math.BigDecimal.valueOf(8.0)); // already 8h — any addition exceeds limit

        AddTimeEntryRequest req = new AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.MONDAY);
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("proj_001");
        req.setStartTime(LocalTime.of(8, 0));
        req.setEndTime(LocalTime.of(9, 0)); // +1h → total 9h

        assertThatThrownBy(() -> timesheetService.addEntry("ts_001", "emp_001", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Total daily hours cannot exceed 8");
    }

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
        when(timeEntryRepository.sumHoursLoggedByTimesheetIdAndDay(any(), any()))
                .thenReturn(BigDecimal.valueOf(4.0));
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
        // Sum = 4h (current total including this entry)
        when(timeEntryRepository.sumHoursLoggedByTimesheetIdAndDay(any(), any()))
                .thenReturn(BigDecimal.valueOf(4.0));
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
        when(timeEntryRepository.sumHoursLoggedByTimesheetIdAndDay(any(), any()))
                .thenReturn(BigDecimal.valueOf(4.0)); // existing 4h
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
        req.setEndTime(LocalTime.of(17, 0)); // +4h → total 8h (exactly at boundary)
        req.setDescription("afternoon work");

        assertThatNoException().isThrownBy(() -> timesheetService.addEntry("ts_001", "emp_001", req));
    }

    // ── EDGE-07: add entry that pushes daily total just over 8h ──────────────
    @Test
    void addEntry_justOverDailyLimit_throwsBusinessException() {
        Project project = new Project();
        project.setId("proj_001");
        project.setStatus(Project.ProjectStatus.ACTIVE);

        when(timesheetRepository.findById("ts_001")).thenReturn(Optional.of(timesheet));
        when(holidayRepository.findByDateBetween(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(any(), any(), any())).thenReturn(List.of());
        when(timeEntryRepository.sumHoursLoggedByTimesheetIdAndDay(any(), any()))
                .thenReturn(BigDecimal.valueOf(7.5)); // 7.5h existing

        AddTimeEntryRequest req = new AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.MONDAY);
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("proj_001");
        req.setStartTime(LocalTime.of(16, 0));
        req.setEndTime(LocalTime.of(17, 1)); // 1h1min → total 8.52h > 8h

        assertThatThrownBy(() -> timesheetService.addEntry("ts_001", "emp_001", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Total daily hours cannot exceed 8");
    }

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
}
