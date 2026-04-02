package com.timekeeper.service;

import com.timekeeper.dto.response.CopyLastWeekResponse;
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
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the Copy Last Week feature.
 * Addresses gap G-03: copyFromPreviousWeek has zero existing tests.
 *
 * Coverage: T-matrix items CL-01 through CL-11 and C-08.
 *
 * Fixture layout:
 *
 *   SOURCE WEEK  — 2020-01-06 (Mon) to 2020-01-10 (Fri)  [ts_src]
 *   TARGET WEEK  — 2020-01-13 (Mon) to 2020-01-17 (Fri)  [ts_tgt]
 *
 * Both weeks are in the past — no clock dependency.
 */
@ExtendWith(MockitoExtension.class)
class CopyLastWeekServiceTest {

    @Mock TimesheetRepository   timesheetRepository;
    @Mock TimeEntryRepository   timeEntryRepository;
    @Mock EmployeeRepository    employeeRepository;
    @Mock ProjectRepository     projectRepository;
    @Mock LeaveRepository       leaveRepository;
    @Mock HolidayRepository     holidayRepository;
    @Mock NotificationService   notificationService;

    @InjectMocks TimesheetService timesheetService;

    private static final String EMP_ID    = "emp_copy";
    private static final String SRC_TS_ID = "ts_src";
    private static final String TGT_TS_ID = "ts_tgt";
    private static final String PROJ_ID   = "proj_active";

    private static final LocalDate SRC_MON = LocalDate.of(2020, 1, 6);
    private static final LocalDate TGT_MON = LocalDate.of(2020, 1, 13);
    private static final LocalDate TGT_FRI = LocalDate.of(2020, 1, 17);

    private Employee employee;
    private Timesheet sourceTs;
    private Timesheet targetTs;
    private Project   activeProject;

    @BeforeEach
    void setUp() {
        employee = new Employee();
        employee.setId(EMP_ID);
        employee.setName("Copy Tester");
        employee.setEmail("copy@example.com");
        employee.setRole(Employee.Role.EMPLOYEE);

        sourceTs = buildTimesheet(SRC_TS_ID, SRC_MON, SRC_MON.plusDays(4));
        targetTs = buildTimesheet(TGT_TS_ID, TGT_MON, TGT_FRI);

        activeProject = new Project();
        activeProject.setId(PROJ_ID);
        activeProject.setName("Active Project");
        activeProject.setStatus(Project.ProjectStatus.ACTIVE);
    }

    // ── CL-01: No previous week timesheet → message returned ─────────────────
    @Test
    void copyFromPreviousWeek_noPreviousWeek_returnsMessageNothingCopied() {
        when(timesheetRepository.findById(TGT_TS_ID)).thenReturn(Optional.of(targetTs));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(EMP_ID, SRC_MON))
                .thenReturn(Optional.empty()); // No previous week

        CopyLastWeekResponse result = timesheetService.copyFromPreviousWeek(TGT_TS_ID, EMP_ID);

        assertThat(result.getCopySummary().getMessage())
                .as("should report no previous week timesheet found")
                .isEqualTo("No previous week timesheet found");
        assertThat(result.getCopySummary().getCopiedCount()).isZero();
        verify(timeEntryRepository, never()).saveAll(any());
    }

    // ── CL-02: Previous week has no WORK entries → message returned ───────────
    @Test
    void copyFromPreviousWeek_previousWeekNoWorkEntries_returnsMessage() {
        // Source has only a LEAVE entry, no WORK
        TimeEntry leave = new TimeEntry();
        leave.setId("te_leave");
        leave.setEntryType(TimeEntry.EntryType.LEAVE);
        leave.setDay(TimeEntry.DayOfWeek.MONDAY);
        leave.setTimesheet(sourceTs);
        leave.setHoursLogged(BigDecimal.ZERO);

        when(timesheetRepository.findById(TGT_TS_ID)).thenReturn(Optional.of(targetTs));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(EMP_ID, SRC_MON))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId(SRC_TS_ID)).thenReturn(List.of(leave));

        CopyLastWeekResponse result = timesheetService.copyFromPreviousWeek(TGT_TS_ID, EMP_ID);

        assertThat(result.getCopySummary().getMessage())
                .isEqualTo("Previous week has no work entries");
        assertThat(result.getCopySummary().getCopiedCount()).isZero();
        verify(timeEntryRepository, never()).saveAll(any());
    }

    // ── CL-03: Successful copy — valid entry copied, count = 1 ───────────────
    @Test
    void copyFromPreviousWeek_validEntry_copiesOneEntry() {
        TimeEntry src = workEntry("te_src_1", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), sourceTs, activeProject);

        stubTargetWeekPrereqs(List.of(), List.of()); // no holidays, no leaves
        when(projectRepository.findAllById(anyCollection())).thenReturn(List.of(activeProject));
        when(timesheetRepository.findById(TGT_TS_ID)).thenReturn(Optional.of(targetTs));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(EMP_ID, SRC_MON))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId(SRC_TS_ID)).thenReturn(List.of(src));
        when(timeEntryRepository.findByTimesheetId(TGT_TS_ID)).thenReturn(List.of()); // target empty
        when(timeEntryRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        stubDetailResponse();

        CopyLastWeekResponse result = timesheetService.copyFromPreviousWeek(TGT_TS_ID, EMP_ID);

        assertThat(result.getCopySummary().getCopiedCount())
                .as("one entry should be copied")
                .isEqualTo(1);
        assertThat(result.getCopySummary().getSkippedCount()).isZero();
        verify(timeEntryRepository).saveAll(argThat(list ->
                !((List<?>) list).isEmpty()));
    }

    // ── CL-04: Holiday in target week → entry skipped with HOLIDAY_DAY ────────
    @Test
    void copyFromPreviousWeek_holidayInTarget_skipsEntryAsHolidayDay() {
        TimeEntry src = workEntry("te_src_1", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), sourceTs, activeProject);

        Holiday holiday = new Holiday();
        holiday.setId("hol_1");
        holiday.setName("National Day");
        holiday.setDate(TGT_MON); // 2020-01-13 = Monday of target week

        when(timesheetRepository.findById(TGT_TS_ID)).thenReturn(Optional.of(targetTs));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(EMP_ID, SRC_MON))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId(SRC_TS_ID)).thenReturn(List.of(src));
        when(timeEntryRepository.findByTimesheetId(TGT_TS_ID)).thenReturn(List.of());
        when(holidayRepository.findByDateBetween(TGT_MON, TGT_FRI)).thenReturn(List.of(holiday));
        when(leaveRepository.findApprovedLeavesForWeek(eq(EMP_ID), any(), any()))
                .thenReturn(List.of());
        when(projectRepository.findAllById(anyCollection())).thenReturn(List.of(activeProject));

        CopyLastWeekResponse result = timesheetService.copyFromPreviousWeek(TGT_TS_ID, EMP_ID);

        assertThat(result.getCopySummary().getCopiedCount()).isZero();
        assertThat(result.getCopySummary().getSkippedCount()).isEqualTo(1);
        assertThat(result.getCopySummary().getSkippedEntries().get(0).getReason())
                .isEqualTo("HOLIDAY_DAY");
        // Service always calls saveAll (even with empty toSave list) when dryRun=false
        verify(timeEntryRepository).saveAll(argThat(list -> ((java.util.List<?>) list).isEmpty()));
    }

    // ── CL-05: Leave in target week → entry skipped with LEAVE_DAY ───────────
    @Test
    void copyFromPreviousWeek_leaveInTarget_skipsEntryAsLeaveDay() {
        TimeEntry src = workEntry("te_src_1", TimeEntry.DayOfWeek.TUESDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), sourceTs, activeProject);

        Leave leave = new Leave();
        leave.setId("lv_1");
        leave.setEmployee(employee);
        leave.setStartDate(TGT_MON.plusDays(1)); // Tuesday
        leave.setEndDate(TGT_MON.plusDays(1));
        leave.setStatus(Leave.LeaveStatus.APPROVED);
        leave.setLeaveType(Leave.LeaveType.SICK);

        when(timesheetRepository.findById(TGT_TS_ID)).thenReturn(Optional.of(targetTs));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(EMP_ID, SRC_MON))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId(SRC_TS_ID)).thenReturn(List.of(src));
        when(timeEntryRepository.findByTimesheetId(TGT_TS_ID)).thenReturn(List.of());
        when(holidayRepository.findByDateBetween(TGT_MON, TGT_FRI)).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(eq(EMP_ID), any(), any()))
                .thenReturn(List.of(leave));
        when(projectRepository.findAllById(anyCollection())).thenReturn(List.of(activeProject));

        CopyLastWeekResponse result = timesheetService.copyFromPreviousWeek(TGT_TS_ID, EMP_ID);

        assertThat(result.getCopySummary().getSkippedCount()).isEqualTo(1);
        assertThat(result.getCopySummary().getSkippedEntries().get(0).getReason())
                .isEqualTo("LEAVE_DAY");
    }

    // ── CL-06: Inactive project → skipped with PROJECT_NOT_ACTIVE ────────────
    @Test
    void copyFromPreviousWeek_inactiveProject_skipsEntryAsProjectNotActive() {
        Project completed = new Project();
        completed.setId("proj_done");
        completed.setName("Completed");
        completed.setStatus(Project.ProjectStatus.COMPLETED);

        TimeEntry src = workEntry("te_src_1", TimeEntry.DayOfWeek.WEDNESDAY,
                LocalTime.of(9, 0), LocalTime.of(13, 0), sourceTs, completed);

        stubTargetWeekPrereqs(List.of(), List.of());
        when(timesheetRepository.findById(TGT_TS_ID)).thenReturn(Optional.of(targetTs));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(EMP_ID, SRC_MON))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId(SRC_TS_ID)).thenReturn(List.of(src));
        when(timeEntryRepository.findByTimesheetId(TGT_TS_ID)).thenReturn(List.of());
        when(projectRepository.findAllById(anyCollection())).thenReturn(List.of(completed));

        CopyLastWeekResponse result = timesheetService.copyFromPreviousWeek(TGT_TS_ID, EMP_ID);

        assertThat(result.getCopySummary().getSkippedCount()).isEqualTo(1);
        assertThat(result.getCopySummary().getSkippedEntries().get(0).getReason())
                .isEqualTo("PROJECT_NOT_ACTIVE");
    }

    // ── CL-07: Duplicate entry → skipped with DUPLICATE_ENTRY ────────────────
    @Test
    void copyFromPreviousWeek_duplicateEntry_skippedAsDuplicate() {
        TimeEntry src = workEntry("te_src_1", TimeEntry.DayOfWeek.THURSDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), sourceTs, activeProject);

        // Target already has the exact same project+start+end on the same day
        TimeEntry existing = workEntry("te_existing", TimeEntry.DayOfWeek.THURSDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), targetTs, activeProject);

        stubTargetWeekPrereqs(List.of(), List.of());
        when(timesheetRepository.findById(TGT_TS_ID)).thenReturn(Optional.of(targetTs));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(EMP_ID, SRC_MON))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId(SRC_TS_ID)).thenReturn(List.of(src));
        when(timeEntryRepository.findByTimesheetId(TGT_TS_ID)).thenReturn(List.of(existing));
        when(projectRepository.findAllById(anyCollection())).thenReturn(List.of(activeProject));

        CopyLastWeekResponse result = timesheetService.copyFromPreviousWeek(TGT_TS_ID, EMP_ID);

        assertThat(result.getCopySummary().getSkippedCount()).isEqualTo(1);
        assertThat(result.getCopySummary().getSkippedEntries().get(0).getReason())
                .isEqualTo("DUPLICATE_ENTRY");
        // Service always calls saveAll (even with empty toSave list) when dryRun=false
        verify(timeEntryRepository).saveAll(argThat(list -> ((java.util.List<?>) list).isEmpty()));
    }

    // ── CL-08: Overlap in target week → skipped with OVERLAP_STRICT ──────────
    @Test
    void copyFromPreviousWeek_overlapInTarget_skipsEntryAsOverlapStrict() {
        // Source entry: 9:00–17:00 on FRIDAY
        TimeEntry src = workEntry("te_src_1", TimeEntry.DayOfWeek.FRIDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), sourceTs, activeProject);

        // Target already has 12:00–18:00 on FRIDAY (different project/time → not a duplicate)
        Project other = new Project();
        other.setId("proj_other");
        other.setStatus(Project.ProjectStatus.ACTIVE);
        TimeEntry occupying = workEntry("te_occ", TimeEntry.DayOfWeek.FRIDAY,
                LocalTime.of(12, 0), LocalTime.of(18, 0), targetTs, other);

        stubTargetWeekPrereqs(List.of(), List.of());
        when(timesheetRepository.findById(TGT_TS_ID)).thenReturn(Optional.of(targetTs));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(EMP_ID, SRC_MON))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId(SRC_TS_ID)).thenReturn(List.of(src));
        when(timeEntryRepository.findByTimesheetId(TGT_TS_ID)).thenReturn(List.of(occupying));
        when(projectRepository.findAllById(anyCollection())).thenReturn(List.of(activeProject, other));

        CopyLastWeekResponse result = timesheetService.copyFromPreviousWeek(TGT_TS_ID, EMP_ID);

        assertThat(result.getCopySummary().getSkippedCount()).isEqualTo(1);
        assertThat(result.getCopySummary().getSkippedEntries().get(0).getReason())
                .isEqualTo("OVERLAP_STRICT");
    }

    // ── CL-09: Dry-run does NOT persist entries ────────────────────────────────
    @Test
    void previewCopyFromPreviousWeek_dryRun_doesNotPersistEntries() {
        TimeEntry src = workEntry("te_src_1", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), sourceTs, activeProject);

        stubTargetWeekPrereqs(List.of(), List.of());
        when(timesheetRepository.findById(TGT_TS_ID)).thenReturn(Optional.of(targetTs));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(EMP_ID, SRC_MON))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId(SRC_TS_ID)).thenReturn(List.of(src));
        when(timeEntryRepository.findByTimesheetId(TGT_TS_ID)).thenReturn(List.of());
        when(projectRepository.findAllById(anyCollection())).thenReturn(List.of(activeProject));

        CopyLastWeekResponse result = timesheetService.previewCopyFromPreviousWeek(TGT_TS_ID, EMP_ID);

        // Dry-run: entries must appear in pendingEntries but NOT be persisted
        verify(timeEntryRepository, never()).saveAll(any());
        assertThat(result.getCopySummary().getPendingEntries())
                .as("dry-run should populate pendingEntries")
                .hasSize(1);
        assertThat(result.getTimesheet())
                .as("dry-run returns null timesheet (not fetched)")
                .isNull();
    }

    // ── CL-10: Copy into SUBMITTED target timesheet blocked ───────────────────
    @Test
    void copyFromPreviousWeek_submittedTarget_throwsBusinessException() {
        targetTs.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        when(timesheetRepository.findById(TGT_TS_ID)).thenReturn(Optional.of(targetTs));

        assertThatThrownBy(() -> timesheetService.copyFromPreviousWeek(TGT_TS_ID, EMP_ID))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot copy into a non-DRAFT timesheet");
    }

    // ── CL-10b: Copy into APPROVED target blocked ────────────────────────────
    @Test
    void copyFromPreviousWeek_approvedTarget_throwsBusinessException() {
        targetTs.setStatus(Timesheet.TimesheetStatus.APPROVED);
        when(timesheetRepository.findById(TGT_TS_ID)).thenReturn(Optional.of(targetTs));

        assertThatThrownBy(() -> timesheetService.copyFromPreviousWeek(TGT_TS_ID, EMP_ID))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot copy into a non-DRAFT timesheet");
    }

    // ── CL-10c: Wrong employee denied ────────────────────────────────────────
    @Test
    void copyFromPreviousWeek_wrongEmployee_throwsAccessDeniedException() {
        when(timesheetRepository.findById(TGT_TS_ID)).thenReturn(Optional.of(targetTs));

        assertThatThrownBy(() -> timesheetService.copyFromPreviousWeek(TGT_TS_ID, "emp_WRONG"))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── CL-11: Copy is idempotent — second run produces DUPLICATE_ENTRY ───────
    @Test
    void copyFromPreviousWeek_idempotent_secondRunZeroCopied() {
        TimeEntry src = workEntry("te_src_1", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), sourceTs, activeProject);

        // After first copy, the same entry exists in the target
        TimeEntry alreadyCopied = workEntry("te_copied", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), targetTs, activeProject);

        stubTargetWeekPrereqs(List.of(), List.of());
        when(timesheetRepository.findById(TGT_TS_ID)).thenReturn(Optional.of(targetTs));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(EMP_ID, SRC_MON))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId(SRC_TS_ID)).thenReturn(List.of(src));
        when(timeEntryRepository.findByTimesheetId(TGT_TS_ID)).thenReturn(List.of(alreadyCopied));
        when(projectRepository.findAllById(anyCollection())).thenReturn(List.of(activeProject));

        CopyLastWeekResponse result = timesheetService.copyFromPreviousWeek(TGT_TS_ID, EMP_ID);

        assertThat(result.getCopySummary().getCopiedCount())
                .as("second copy run must produce 0 new entries (idempotent)")
                .isZero();
        assertThat(result.getCopySummary().getSkippedEntries().get(0).getReason())
                .isEqualTo("DUPLICATE_ENTRY");
        // Service always calls saveAll (even with empty toSave list) when dryRun=false
        verify(timeEntryRepository).saveAll(argThat(list -> ((java.util.List<?>) list).isEmpty()));
    }

    // ── C-08: OvertimeComments NOT copied with copyFromPreviousWeek ──────────
    @Test
    void copyFromPreviousWeek_doesNotCopyOvertimeComments() {
        // Source has an OT comment on MONDAY
        EnumMap<TimeEntry.DayOfWeek, String> srcComments = new EnumMap<>(TimeEntry.DayOfWeek.class);
        srcComments.put(TimeEntry.DayOfWeek.MONDAY, "Deadline crunch");
        sourceTs.setOvertimeComments(srcComments);

        TimeEntry src = workEntry("te_src_1", TimeEntry.DayOfWeek.MONDAY,
                LocalTime.of(9, 0), LocalTime.of(17, 0), sourceTs, activeProject);

        stubTargetWeekPrereqs(List.of(), List.of());
        when(timesheetRepository.findById(TGT_TS_ID)).thenReturn(Optional.of(targetTs));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate(EMP_ID, SRC_MON))
                .thenReturn(Optional.of(sourceTs));
        when(timeEntryRepository.findByTimesheetId(SRC_TS_ID)).thenReturn(List.of(src));
        when(timeEntryRepository.findByTimesheetId(TGT_TS_ID)).thenReturn(List.of());
        when(projectRepository.findAllById(anyCollection())).thenReturn(List.of(activeProject));
        when(timeEntryRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        stubDetailResponse();

        timesheetService.copyFromPreviousWeek(TGT_TS_ID, EMP_ID);

        // Target timesheet must NOT have had any OT comments set via save
        verify(timesheetRepository, never()).save(argThat(ts ->
                ts.getId().equals(TGT_TS_ID) && ts.getOvertimeComments() != null
                && !ts.getOvertimeComments().isEmpty()));
        assertThat(targetTs.getOvertimeComments())
                .as("OT comments must not be transferred to the target timesheet")
                .isNullOrEmpty();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private Timesheet buildTimesheet(String id, LocalDate start, LocalDate end) {
        Timesheet ts = new Timesheet();
        ts.setId(id);
        ts.setEmployee(employee);
        ts.setWeekStartDate(start);
        ts.setWeekEndDate(end);
        ts.setStatus(Timesheet.TimesheetStatus.DRAFT);
        return ts;
    }

    private TimeEntry workEntry(String id, TimeEntry.DayOfWeek day,
                                 LocalTime start, LocalTime end,
                                 Timesheet ts, Project project) {
        TimeEntry e = new TimeEntry();
        e.setId(id);
        e.setTimesheet(ts);
        e.setDay(day);
        e.setEntryType(TimeEntry.EntryType.WORK);
        e.setStartTime(start);
        e.setEndTime(end);
        e.setProject(project);
        long minutes = Duration.between(start, end).toMinutes();
        e.setHoursLogged(BigDecimal.valueOf(minutes)
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP));
        return e;
    }

    private void stubTargetWeekPrereqs(List<Holiday> holidays, List<Leave> leaves) {
        // lenient: these stubs may be shadowed when stubDetailResponse is also called in the same test
        lenient().when(holidayRepository.findByDateBetween(TGT_MON, TGT_FRI)).thenReturn(holidays);
        lenient().when(leaveRepository.findApprovedLeavesForWeek(eq(EMP_ID), any(), any())).thenReturn(leaves);
    }

    private void stubDetailResponse() {
        when(timeEntryRepository.findByTimesheetId(TGT_TS_ID)).thenReturn(List.of());
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of());
        when(leaveRepository.findApprovedLeavesForWeek(eq(EMP_ID), any(), any())).thenReturn(List.of());
    }
}
