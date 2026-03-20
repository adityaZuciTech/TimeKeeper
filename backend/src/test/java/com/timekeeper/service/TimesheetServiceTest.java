package com.timekeeper.service;

import com.timekeeper.dto.request.AddTimeEntryRequest;
import com.timekeeper.dto.request.CreateTimesheetRequest;
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

        AddTimeEntryRequest req = new AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.MONDAY);
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId("proj_001");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(17, 0));
        req.setDescription("Feature work");

        var response = timesheetService.addEntry("ts_001", "emp_001", req);

        assertThat(response.getEntryId()).isEqualTo("te_001");
        assertThat(response.getProjectId()).isEqualTo("proj_001");
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
}
