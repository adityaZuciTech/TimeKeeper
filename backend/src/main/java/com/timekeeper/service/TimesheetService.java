package com.timekeeper.service;

import com.timekeeper.dto.request.AddTimeEntryRequest;
import com.timekeeper.dto.request.CreateTimesheetRequest;
import com.timekeeper.dto.request.UpdateTimeEntryRequest;
import com.timekeeper.dto.response.TimeEntryResponse;
import com.timekeeper.dto.response.TimesheetResponse;
import com.timekeeper.entity.*;
import com.timekeeper.exception.BusinessException;
import com.timekeeper.exception.ResourceNotFoundException;
import com.timekeeper.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimesheetService {

    private final TimesheetRepository timesheetRepository;
    private final TimeEntryRepository timeEntryRepository;
    private final EmployeeRepository employeeRepository;
    private final ProjectRepository projectRepository;
    private final LeaveRepository leaveRepository;
    private final HolidayRepository holidayRepository;

    @Transactional
    public TimesheetResponse createOrGetForWeek(String employeeId, CreateTimesheetRequest request) {
        LocalDate weekStart = normalizeToMonday(request.getWeekStartDate());
        LocalDate today = LocalDate.now();
        LocalDate currentWeekStart = today.with(DayOfWeek.MONDAY);

        if (weekStart.isAfter(currentWeekStart)) {
            throw new BusinessException("Cannot create a timesheet for a future week.");
        }

        LocalDate weekEnd = weekStart.plusDays(4); // Friday

        Optional<Timesheet> existing = timesheetRepository.findByEmployeeIdAndWeekStartDate(employeeId, weekStart);
        if (existing.isPresent()) {
            return toDetailResponse(existing.get());
        }

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        Timesheet timesheet = Timesheet.builder()
                .employee(employee)
                .weekStartDate(weekStart)
                .weekEndDate(weekEnd)
                .status(Timesheet.TimesheetStatus.DRAFT)
                .build();

        timesheet = timesheetRepository.save(timesheet);
        return toDetailResponse(timesheet);
    }

    public TimesheetResponse getById(String timesheetId) {
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet not found: " + timesheetId));
        return toDetailResponse(timesheet);
    }

    public List<TimesheetResponse> getMyTimesheets(String employeeId) {
        List<Timesheet> timesheets = timesheetRepository
                .findTop5ByEmployeeIdOrderByWeekStartDateDesc(employeeId, PageRequest.of(0, 5));
        return timesheets.stream().map(this::toSummaryResponse).collect(Collectors.toList());
    }

    public List<TimesheetResponse> getAllTimesheets(String employeeId) {
        List<Timesheet> timesheets = timesheetRepository.findByEmployeeIdOrderByWeekStartDateDesc(employeeId);
        return timesheets.stream().map(this::toSummaryResponse).collect(Collectors.toList());
    }

    public TimesheetResponse getByWeek(String employeeId, LocalDate weekStartDate) {
        LocalDate weekStart = normalizeToMonday(weekStartDate);
        return timesheetRepository.findByEmployeeIdAndWeekStartDate(employeeId, weekStart)
                .map(this::toDetailResponse)
                .orElseThrow(() -> new ResourceNotFoundException("No timesheet found for that week"));
    }

    @Transactional
    public TimesheetResponse submit(String timesheetId, String employeeId) {
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet not found: " + timesheetId));

        if (!timesheet.getEmployee().getId().equals(employeeId)) {
            throw new BusinessException("You can only submit your own timesheets");
        }
        if (timesheet.getStatus() == Timesheet.TimesheetStatus.SUBMITTED) {
            throw new BusinessException("Timesheet is already submitted");
        }

        timesheet.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        timesheet = timesheetRepository.save(timesheet);
        return toDetailResponse(timesheet);
    }

    @Transactional
    public TimeEntryResponse addEntry(String timesheetId, String employeeId, AddTimeEntryRequest request) {
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet not found: " + timesheetId));

        if (!timesheet.getEmployee().getId().equals(employeeId)) {
            throw new BusinessException("Access denied");
        }
        if (timesheet.getStatus() == Timesheet.TimesheetStatus.SUBMITTED) {
            throw new BusinessException("Cannot modify a submitted timesheet");
        }

        // Block entries on holidays or approved leave days
        LocalDate dayDate = timesheet.getWeekStartDate().plusDays(request.getDay().ordinal());
        List<Holiday> holidaysOnDay = holidayRepository.findByDateBetween(dayDate, dayDate);
        if (!holidaysOnDay.isEmpty()) {
            throw new BusinessException("Cannot log time on a company holiday: " + holidaysOnDay.get(0).getName());
        }
        List<Leave> leavesOnDay = leaveRepository.findApprovedLeavesForWeek(employeeId, dayDate, dayDate);
        if (!leavesOnDay.isEmpty()) {
            throw new BusinessException("Cannot log time on an approved leave day");
        }

        TimeEntry entry = new TimeEntry();
        entry.setTimesheet(timesheet);
        entry.setDay(request.getDay());
        entry.setEntryType(request.getEntryType());

        if (request.getEntryType() == TimeEntry.EntryType.WORK) {
            validateWorkEntry(timesheetId, request);

            Project project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + request.getProjectId()));
            if (project.getStatus() == Project.ProjectStatus.COMPLETED) {
                throw new BusinessException("Cannot log time to a completed project");
            }

            entry.setProject(project);
            entry.setStartTime(request.getStartTime());
            entry.setEndTime(request.getEndTime());
            entry.setDescription(request.getDescription());

            long minutes = java.time.Duration.between(request.getStartTime(), request.getEndTime()).toMinutes();
            entry.setHoursLogged(BigDecimal.valueOf(minutes / 60.0));
        } else {
            // LEAVE or HOLIDAY
            removeExistingLeaveEntry(timesheetId, request.getDay());
            entry.setHoursLogged(BigDecimal.ZERO);
        }

        entry = timeEntryRepository.save(entry);
        return toEntryResponse(entry);
    }

    @Transactional
    public TimeEntryResponse updateEntry(String entryId, String employeeId, UpdateTimeEntryRequest request) {
        TimeEntry entry = timeEntryRepository.findById(entryId)
                .orElseThrow(() -> new ResourceNotFoundException("Time entry not found: " + entryId));

        if (!entry.getTimesheet().getEmployee().getId().equals(employeeId)) {
            throw new BusinessException("Access denied");
        }
        if (entry.getTimesheet().getStatus() == Timesheet.TimesheetStatus.SUBMITTED) {
            throw new BusinessException("Cannot modify a submitted timesheet");
        }
        if (entry.getEntryType() != TimeEntry.EntryType.WORK) {
            throw new BusinessException("Can only update WORK entries via this endpoint");
        }

        LocalTime newStart = request.getStartTime() != null ? request.getStartTime() : entry.getStartTime();
        LocalTime newEnd = request.getEndTime() != null ? request.getEndTime() : entry.getEndTime();

        if (newStart.isAfter(newEnd) || newStart.equals(newEnd)) {
            throw new BusinessException("Start time must be before end time");
        }

        // Validate no overlaps (excluding this entry itself)
        validateNoOverlapExcluding(entry.getTimesheet().getId(), entry.getDay(), newStart, newEnd, entryId);

        // Validate total daily hours
        BigDecimal currentHours = timeEntryRepository.sumHoursLoggedByTimesheetIdAndDay(
                entry.getTimesheet().getId(), entry.getDay());
        BigDecimal currentEntryHours = entry.getHoursLogged();
        long newMinutes = java.time.Duration.between(newStart, newEnd).toMinutes();
        BigDecimal newHours = BigDecimal.valueOf(newMinutes / 60.0);

        BigDecimal totalAfterUpdate = (currentHours == null ? BigDecimal.ZERO : currentHours)
                .subtract(currentEntryHours).add(newHours);
        if (totalAfterUpdate.compareTo(BigDecimal.valueOf(8)) > 0) {
            throw new BusinessException("Total daily hours cannot exceed 8");
        }

        if (request.getProjectId() != null) {
            Project project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + request.getProjectId()));
            if (project.getStatus() == Project.ProjectStatus.COMPLETED) {
                throw new BusinessException("Cannot log time to a completed project");
            }
            entry.setProject(project);
        }

        entry.setStartTime(newStart);
        entry.setEndTime(newEnd);
        entry.setHoursLogged(newHours);
        if (request.getDescription() != null) entry.setDescription(request.getDescription());

        entry = timeEntryRepository.save(entry);
        return toEntryResponse(entry);
    }

    @Transactional
    public void deleteEntry(String entryId, String employeeId) {
        TimeEntry entry = timeEntryRepository.findById(entryId)
                .orElseThrow(() -> new ResourceNotFoundException("Time entry not found: " + entryId));

        if (!entry.getTimesheet().getEmployee().getId().equals(employeeId)) {
            throw new BusinessException("Access denied");
        }
        if (entry.getTimesheet().getStatus() == Timesheet.TimesheetStatus.SUBMITTED) {
            throw new BusinessException("Cannot modify a submitted timesheet");
        }

        timeEntryRepository.delete(entry);
    }

    public List<TimeEntryResponse> getEntries(String timesheetId) {
        return timeEntryRepository.findByTimesheetId(timesheetId).stream()
                .map(this::toEntryResponse)
                .collect(Collectors.toList());
    }

    // --- Private helpers ---

    private void validateWorkEntry(String timesheetId, AddTimeEntryRequest request) {
        if (request.getProjectId() == null || request.getStartTime() == null || request.getEndTime() == null) {
            throw new BusinessException("Work entries require projectId, startTime and endTime");
        }
        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new BusinessException("Start time must be before end time");
        }

        // Check existing daily hours
        BigDecimal existingHours = timeEntryRepository.sumHoursLoggedByTimesheetIdAndDay(timesheetId, request.getDay());
        long newMinutes = java.time.Duration.between(request.getStartTime(), request.getEndTime()).toMinutes();
        BigDecimal newHours = BigDecimal.valueOf(newMinutes / 60.0);

        if ((existingHours == null ? BigDecimal.ZERO : existingHours).add(newHours)
                .compareTo(BigDecimal.valueOf(8)) > 0) {
            throw new BusinessException("Total daily hours cannot exceed 8");
        }

        validateNoOverlapExcluding(timesheetId, request.getDay(), request.getStartTime(), request.getEndTime(), null);
    }

    private void validateNoOverlapExcluding(String timesheetId, TimeEntry.DayOfWeek day,
                                             LocalTime newStart, LocalTime newEnd, String excludeEntryId) {
        List<TimeEntry> existing = timeEntryRepository.findByTimesheetIdAndDay(timesheetId, day)
                .stream()
                .filter(e -> e.getEntryType() == TimeEntry.EntryType.WORK)
                .filter(e -> excludeEntryId == null || !e.getId().equals(excludeEntryId))
                .collect(Collectors.toList());

        for (TimeEntry existing_entry : existing) {
            LocalTime existStart = existing_entry.getStartTime();
            LocalTime existEnd = existing_entry.getEndTime();
            // Overlap condition: newStart < existEnd AND newEnd > existStart
            if (newStart.isBefore(existEnd) && newEnd.isAfter(existStart)) {
                throw new BusinessException("Time blocks cannot overlap. Conflict with " +
                        existStart + "–" + existEnd);
            }
        }
    }

    private void removeExistingLeaveEntry(String timesheetId, TimeEntry.DayOfWeek day) {
        List<TimeEntry> existing = timeEntryRepository.findByTimesheetIdAndDay(timesheetId, day)
                .stream()
                .filter(e -> e.getEntryType() != TimeEntry.EntryType.WORK)
                .collect(Collectors.toList());
        if (!existing.isEmpty()) {
            timeEntryRepository.deleteAll(existing);
        }
    }

    private LocalDate normalizeToMonday(LocalDate date) {
        return date.with(DayOfWeek.MONDAY);
    }

    // Build the full detail response with days and entries, overlaying leave/holiday awareness
    public TimesheetResponse toDetailResponse(Timesheet timesheet) {
        List<TimeEntry> allEntries = timeEntryRepository.findByTimesheetId(timesheet.getId());
        boolean isSubmitted = timesheet.getStatus() == Timesheet.TimesheetStatus.SUBMITTED;

        // Pre-fetch holidays and approved leaves for this week (Mon–Fri)
        LocalDate weekStart = timesheet.getWeekStartDate();
        LocalDate weekEnd   = weekStart.plusDays(4);
        List<Holiday> weekHolidays = holidayRepository.findByDateBetweenOrderByDateAsc(weekStart, weekEnd);
        Set<LocalDate> holidayDates = weekHolidays.stream()
                .map(Holiday::getDate).collect(Collectors.toSet());
        Map<LocalDate, Holiday> holidayMap = weekHolidays.stream()
                .collect(Collectors.toMap(Holiday::getDate, h -> h));

        List<Leave> weekLeaves = leaveRepository.findApprovedLeavesForWeek(
                timesheet.getEmployee().getId(), weekStart, weekEnd);

        Map<TimeEntry.DayOfWeek, List<TimeEntry>> byDay = new LinkedHashMap<>();
        for (TimeEntry.DayOfWeek day : TimeEntry.DayOfWeek.values()) {
            byDay.put(day, new ArrayList<>());
        }
        for (TimeEntry entry : allEntries) {
            byDay.get(entry.getDay()).add(entry);
        }

        List<TimesheetResponse.DayResponse> days = new ArrayList<>();
        BigDecimal totalHours = BigDecimal.ZERO;
        int dayIndex = 0;

        for (Map.Entry<TimeEntry.DayOfWeek, List<TimeEntry>> dayEntry : byDay.entrySet()) {
            LocalDate dayDate = weekStart.plusDays(dayIndex++);
            List<TimeEntry> dayEntries = dayEntry.getValue();
            BigDecimal dayHours = BigDecimal.ZERO;

            // Priority: HOLIDAY > LEAVE > WORK (from entries)
            String dayStatus = "WORK";
            String leaveType = null;
            String leaveId   = null;

            if (holidayDates.contains(dayDate)) {
                dayStatus = "HOLIDAY";
            } else {
                // Check approved leave coverage
                for (Leave leave : weekLeaves) {
                    if (!dayDate.isBefore(leave.getStartDate()) && !dayDate.isAfter(leave.getEndDate())) {
                        dayStatus = "LEAVE";
                        leaveType = leave.getLeaveType().name();
                        leaveId   = leave.getId();
                        break;
                    }
                }
                // Fallback: check time-entry-based leave/holiday markers if present
                if (dayStatus.equals("WORK") && !dayEntries.isEmpty()) {
                    TimeEntry first = dayEntries.get(0);
                    if (first.getEntryType() == TimeEntry.EntryType.LEAVE) dayStatus = "LEAVE";
                    else if (first.getEntryType() == TimeEntry.EntryType.HOLIDAY) dayStatus = "HOLIDAY";
                }
            }

            boolean editable = !isSubmitted && dayStatus.equals("WORK");

            for (TimeEntry e : dayEntries) {
                if (e.getHoursLogged() != null) dayHours = dayHours.add(e.getHoursLogged());
            }
            totalHours = totalHours.add(dayHours);

            List<TimeEntryResponse> entryResponses = dayEntries.stream()
                    .map(this::toEntryResponse)
                    .collect(Collectors.toList());

            days.add(TimesheetResponse.DayResponse.builder()
                    .day(dayEntry.getKey().name())
                    .totalHours(dayHours)
                    .dayStatus(dayStatus)
                    .leaveType(leaveType)
                    .leaveId(leaveId)
                    .editable(editable)
                    .entries(entryResponses)
                    .build());
        }

        return TimesheetResponse.builder()
                .id(timesheet.getId())
                .employeeId(timesheet.getEmployee().getId())
                .employeeName(timesheet.getEmployee().getName())
                .weekStartDate(timesheet.getWeekStartDate())
                .weekEndDate(timesheet.getWeekEndDate())
                .totalHours(totalHours)
                .status(timesheet.getStatus().name())
                .days(days)
                .build();
    }

    public TimesheetResponse toSummaryResponse(Timesheet timesheet) {
        BigDecimal total = timeEntryRepository.sumHoursLoggedByTimesheetId(timesheet.getId());
        return TimesheetResponse.builder()
                .id(timesheet.getId())
                .employeeId(timesheet.getEmployee().getId())
                .employeeName(timesheet.getEmployee().getName())
                .weekStartDate(timesheet.getWeekStartDate())
                .weekEndDate(timesheet.getWeekEndDate())
                .totalHours(total != null ? total : BigDecimal.ZERO)
                .status(timesheet.getStatus().name())
                .build();
    }

    private TimeEntryResponse toEntryResponse(TimeEntry entry) {
        return TimeEntryResponse.builder()
                .entryId(entry.getId())
                .day(entry.getDay().name())
                .entryType(entry.getEntryType().name())
                .projectId(entry.getProject() != null ? entry.getProject().getId() : null)
                .projectName(entry.getProject() != null ? entry.getProject().getName() : null)
                .startTime(entry.getStartTime())
                .endTime(entry.getEndTime())
                .hoursLogged(entry.getHoursLogged())
                .description(entry.getDescription())
                .build();
    }
}
