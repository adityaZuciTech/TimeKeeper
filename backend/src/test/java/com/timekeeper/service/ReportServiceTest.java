package com.timekeeper.service;

import com.timekeeper.dto.response.ReportResponse;
import com.timekeeper.entity.*;
import com.timekeeper.exception.ResourceNotFoundException;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock EmployeeRepository   employeeRepository;
    @Mock TimesheetRepository  timesheetRepository;
    @Mock TimeEntryRepository  timeEntryRepository;
    @Mock ProjectRepository    projectRepository;
    @Mock DepartmentRepository departmentRepository;

    @InjectMocks ReportService reportService;

    private static final LocalDate WEEK = LocalDate.of(2026, 3, 16);

    // ── helpers ───────────────────────────────────────────────────────────────

    private Employee emp(String id, String name) {
        Employee e = new Employee();
        e.setId(id);
        e.setName(name);
        return e;
    }

    // ── RS-01: getTeamUtilization — absent member gets ZERO ───────────────────

    @Test
    void getTeamUtilization_absentMemberGetsZero() {
        Employee alice = emp("emp_1", "Alice");
        Employee bob   = emp("emp_2", "Bob");
        Employee carol = emp("emp_3", "Carol");
        when(employeeRepository.findByManagerId("mgr_1"))
                .thenReturn(List.of(alice, bob, carol));
        // Only alice and bob have rows in the aggregate query
        ArrayList<Object[]> hoursRows = new ArrayList<>();
        hoursRows.add(new Object[]{"emp_1", new BigDecimal("32.00")});
        hoursRows.add(new Object[]{"emp_2", new BigDecimal("40.00")});
        when(timeEntryRepository.sumHoursByTeamMemberForWeek("mgr_1", WEEK))
                .thenReturn(hoursRows);

        ReportResponse.TeamUtilizationReport report =
                reportService.getTeamUtilization("mgr_1", WEEK);

        assertThat(report.getTeam()).hasSize(3);
        assertThat(report.getTeam())
                .extracting("employeeId", "hoursLogged")
                .containsExactlyInAnyOrder(
                        tuple("emp_1", new BigDecimal("32.00")),
                        tuple("emp_2", new BigDecimal("40.00")),
                        tuple("emp_3", BigDecimal.ZERO)
                );
    }

    // ── RS-02: getTeamUtilization — empty team ─────────────────────────────────

    @Test
    void getTeamUtilization_emptyTeam_returnsEmptyList() {
        when(employeeRepository.findByManagerId("mgr_empty")).thenReturn(List.of());
        when(timeEntryRepository.sumHoursByTeamMemberForWeek("mgr_empty", WEEK))
                .thenReturn(List.of());

        ReportResponse.TeamUtilizationReport report =
                reportService.getTeamUtilization("mgr_empty", WEEK);

        assertThat(report.getTeam()).isEmpty();
    }

    // ── RS-03: getEmployeeTimesheetReport — MANAGER requests direct report ─────

    @Test
    void getEmployeeTimesheetReport_managerRequestsDirectReport_returnsBreakdown() {
        Employee direct = emp("emp_dr", "Direct Report");
        direct.setManagerId("mgr_1");

        Timesheet ts = new Timesheet();
        ts.setId("ts_dr");
        ts.setEmployee(direct);
        ts.setWeekStartDate(WEEK);

        TimeEntry mon = new TimeEntry();
        mon.setDay(TimeEntry.DayOfWeek.MONDAY);
        mon.setHoursLogged(new BigDecimal("8.00"));
        mon.setEntryType(TimeEntry.EntryType.WORK);

        TimeEntry tue = new TimeEntry();
        tue.setDay(TimeEntry.DayOfWeek.TUESDAY);
        tue.setHoursLogged(new BigDecimal("6.00"));
        tue.setEntryType(TimeEntry.EntryType.WORK);

        when(employeeRepository.findByManagerId("mgr_1")).thenReturn(List.of(direct));
        when(employeeRepository.findById("emp_dr")).thenReturn(Optional.of(direct));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate("emp_dr", WEEK))
                .thenReturn(Optional.of(ts));
        when(timeEntryRepository.findByTimesheetId("ts_dr")).thenReturn(List.of(mon, tue));

        ReportResponse.EmployeeTimesheetReport report =
                reportService.getEmployeeTimesheetReport("mgr_1", "MANAGER", "emp_dr", WEEK);

        assertThat(report.getTotalHours()).isEqualByComparingTo("14.00");
        assertThat(report.getDailySummary()).hasSize(5); // Mon-Fri always present
    }

    // ── RS-04: getEmployeeTimesheetReport — MANAGER requests non-direct-report ─

    @Test
    void getEmployeeTimesheetReport_managerRequestsNonDirectReport_throwsAccessDenied() {
        when(employeeRepository.findByManagerId("mgr_1")).thenReturn(List.of());

        assertThatThrownBy(() ->
                reportService.getEmployeeTimesheetReport("mgr_1", "MANAGER", "emp_other", WEEK))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── RS-05: getEmployeeTimesheetReport — ADMIN bypasses access check ────────

    @Test
    void getEmployeeTimesheetReport_adminRequestsAnyEmployee_succeeds() {
        Employee emp = emp("emp_any", "Anyone");

        Timesheet ts = new Timesheet();
        ts.setId("ts_any");
        ts.setEmployee(emp);
        ts.setWeekStartDate(WEEK);

        when(employeeRepository.findById("emp_any")).thenReturn(Optional.of(emp));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate("emp_any", WEEK))
                .thenReturn(Optional.of(ts));
        when(timeEntryRepository.findByTimesheetId("ts_any")).thenReturn(List.of());

        // ADMIN — no findByManagerId call should happen
        ReportResponse.EmployeeTimesheetReport report =
                reportService.getEmployeeTimesheetReport("admin_1", "ADMIN", "emp_any", WEEK);

        assertThat(report.getEmployeeId()).isEqualTo("emp_any");
        verify(employeeRepository, never()).findByManagerId(any());
    }

    // ── RS-06: getEmployeeTimesheetReport — no timesheet for week ─────────────

    @Test
    void getEmployeeTimesheetReport_noTimesheetForWeek_returnsZeroTotals() {
        Employee emp = emp("emp_notimesheet", "No Sheet");
        when(employeeRepository.findById("emp_notimesheet")).thenReturn(Optional.of(emp));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate("emp_notimesheet", WEEK))
                .thenReturn(Optional.empty());

        ReportResponse.EmployeeTimesheetReport report =
                reportService.getEmployeeTimesheetReport("admin_1", "ADMIN", "emp_notimesheet", WEEK);

        assertThat(report.getTotalHours()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(report.getDailySummary()).isEmpty();
    }

    // ── RS-07: getEmployeeTimesheetReport — multiple entries on same day are summed

    @Test
    void getEmployeeTimesheetReport_multipleEntriesSameDay_hoursSummed() {
        Employee emp = emp("emp_multi", "Multi Entry");

        Timesheet ts = new Timesheet();
        ts.setId("ts_multi");
        ts.setEmployee(emp);
        ts.setWeekStartDate(WEEK);

        TimeEntry e1 = new TimeEntry();
        e1.setDay(TimeEntry.DayOfWeek.MONDAY);
        e1.setHoursLogged(new BigDecimal("4.00"));

        TimeEntry e2 = new TimeEntry();
        e2.setDay(TimeEntry.DayOfWeek.MONDAY);
        e2.setHoursLogged(new BigDecimal("3.50"));

        when(employeeRepository.findById("emp_multi")).thenReturn(Optional.of(emp));
        when(timesheetRepository.findByEmployeeIdAndWeekStartDate("emp_multi", WEEK))
                .thenReturn(Optional.of(ts));
        when(timeEntryRepository.findByTimesheetId("ts_multi")).thenReturn(List.of(e1, e2));

        ReportResponse.EmployeeTimesheetReport report =
                reportService.getEmployeeTimesheetReport("admin_1", "ADMIN", "emp_multi", WEEK);

        assertThat(report.getTotalHours()).isEqualByComparingTo("7.50");
        assertThat(report.getDailySummary())
                .filteredOn(d -> "MONDAY".equals(d.getDay()))
                .extracting("hours")
                .containsExactly(new BigDecimal("7.50"));
    }

    // ── RS-08: getProjectEffort — project not found ────────────────────────────

    @Test
    void getProjectEffort_projectNotFound_throwsResourceNotFoundException() {
        when(projectRepository.findById("proj_unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reportService.getProjectEffort("proj_unknown"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── RS-09: getProjectEffort — 2 contributors, correct totals ──────────────

    @Test
    void getProjectEffort_twoContributors_correctTotal() {
        Project project = new Project();
        project.setId("proj_1");
        project.setName("Alpha");

        when(projectRepository.findById("proj_1")).thenReturn(Optional.of(project));
        ArrayList<Object[]> contribRows = new ArrayList<>();
        contribRows.add(new Object[]{"emp_1", "Alice", new BigDecimal("20.00")});
        contribRows.add(new Object[]{"emp_2", "Bob",   new BigDecimal("15.50")});
        when(timeEntryRepository.sumHoursByEmployeeForProject("proj_1"))
                .thenReturn(contribRows);

        ReportResponse.ProjectEffortReport report = reportService.getProjectEffort("proj_1");

        assertThat(report.getTotalHoursLogged()).isEqualByComparingTo("35.50");
        assertThat(report.getContributors()).hasSize(2);
    }

    // ── RS-10: getDepartmentUtilization — empty dept gets ZERO ───────────────

    @Test
    void getDepartmentUtilization_emptyDeptGetsZero() {
        Department eng = new Department(); eng.setId("dept_eng"); eng.setName("Engineering");
        Department hr  = new Department(); hr.setId("dept_hr");  hr.setName("HR");

        when(departmentRepository.findAll()).thenReturn(List.of(eng, hr));
        ArrayList<Object[]> deptRows = new ArrayList<>();
        deptRows.add(new Object[]{"dept_eng", new BigDecimal("160.00")});
        when(timeEntryRepository.sumHoursByDepartmentForWeek(WEEK))
                .thenReturn(deptRows);
        when(employeeRepository.countByDepartmentId("dept_eng")).thenReturn(5L);
        when(employeeRepository.countByDepartmentId("dept_hr")).thenReturn(2L);

        List<ReportResponse.DepartmentUtilization> result =
                reportService.getDepartmentUtilization(WEEK);

        assertThat(result).hasSize(2);
        assertThat(result)
                .extracting("departmentId", "totalHours")
                .containsExactlyInAnyOrder(
                        tuple("dept_eng", new BigDecimal("160.00")),
                        tuple("dept_hr",  BigDecimal.ZERO)
                );
    }
}
