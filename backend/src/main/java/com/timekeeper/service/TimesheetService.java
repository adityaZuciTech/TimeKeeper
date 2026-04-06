package com.timekeeper.service;

import com.timekeeper.dto.request.AddTimeEntryRequest;
import com.timekeeper.dto.request.CreateTimesheetRequest;
import com.timekeeper.dto.request.SaveOvertimeCommentRequest;
import com.timekeeper.dto.request.UpdateTimeEntryRequest;
import com.timekeeper.dto.response.CopyLastWeekResponse;
import com.timekeeper.dto.response.CopySummary;
import com.timekeeper.dto.response.SkippedEntryDetail;
import com.timekeeper.dto.response.TimeEntryResponse;
import com.timekeeper.dto.response.TimesheetResponse;
import com.timekeeper.entity.*;
import com.timekeeper.exception.BusinessException;
import com.timekeeper.exception.ResourceNotFoundException;
import com.timekeeper.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class TimesheetService {

    /** Explicit day-to-offset map. Avoids relying on enum ordinal() which is fragile. */
    private static final Map<TimeEntry.DayOfWeek, Integer> DAY_OFFSET = Map.of(
            TimeEntry.DayOfWeek.MONDAY,    0,
            TimeEntry.DayOfWeek.TUESDAY,   1,
            TimeEntry.DayOfWeek.WEDNESDAY, 2,
            TimeEntry.DayOfWeek.THURSDAY,  3,
            TimeEntry.DayOfWeek.FRIDAY,    4
    );

    private final TimesheetRepository timesheetRepository;
    private final TimeEntryRepository timeEntryRepository;
    private final EmployeeRepository employeeRepository;
    private final ProjectRepository projectRepository;
    private final LeaveRepository leaveRepository;
    private final HolidayRepository holidayRepository;
    private final NotificationService notificationService;

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

    @Transactional(readOnly = true)
    public TimesheetResponse getById(String timesheetId) {
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet not found: " + timesheetId));
        return toDetailResponse(timesheet);
    }

    @Transactional(readOnly = true)
    public List<TimesheetResponse> getMyTimesheets(String employeeId) {
        List<Timesheet> timesheets = timesheetRepository
                .findTop5ByEmployeeIdOrderByWeekStartDateDesc(employeeId, PageRequest.of(0, 5));
        return buildBatchedSummaryResponses(timesheets, employeeId);
    }

    @Transactional(readOnly = true)
    public List<TimesheetResponse> getAllTimesheets(String employeeId) {
        List<Timesheet> timesheets = timesheetRepository.findByEmployeeIdOrderByWeekStartDateDesc(employeeId);
        return buildBatchedSummaryResponses(timesheets, employeeId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAllTimesheetsPaged(String employeeId, int page, int size) {
        org.springframework.data.domain.Pageable pageable =
                PageRequest.of(page, Math.min(size, 50), org.springframework.data.domain.Sort.by("weekStartDate").descending());
        org.springframework.data.domain.Page<Timesheet> tsPage =
                timesheetRepository.findByEmployeeId(employeeId, pageable);
        List<TimesheetResponse> content = buildBatchedSummaryResponses(tsPage.getContent(), employeeId);
        return Map.of(
                "timesheets", content,
                "page", page,
                "size", size,
                "totalElements", tsPage.getTotalElements(),
                "totalPages", tsPage.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
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
            throw new AccessDeniedException("You can only submit your own timesheets");
        }
        if (timesheet.getStatus() == Timesheet.TimesheetStatus.SUBMITTED ||
                timesheet.getStatus() == Timesheet.TimesheetStatus.APPROVED) {
            throw new BusinessException("Cannot re-submit a timesheet that is already submitted or approved");
        }

        // Prevent submitting a timesheet with no logged hours
        List<TimeEntry> entries = timeEntryRepository.findByTimesheetId(timesheetId);
        boolean hasWorkEntries = entries.stream()
                .anyMatch(e -> e.getEntryType() == TimeEntry.EntryType.WORK);
        if (!hasWorkEntries) {
            throw new BusinessException("Cannot submit an empty timesheet. Please log at least one work entry.");
        }

        // Prevent submitting a timesheet whose only work entries are on future dates.
        // Copied entries for Wed/Thu/Fri are valid to keep as placeholders but cannot
        // be the sole basis for submission — the manager would be approving hours not yet worked.
        final LocalDate submitWeekStart = timesheet.getWeekStartDate();
        boolean hasCurrentOrPastWorkEntry = entries.stream()
                .filter(e -> e.getEntryType() == TimeEntry.EntryType.WORK)
                .anyMatch(e -> !submitWeekStart.plusDays(DAY_OFFSET.get(e.getDay())).isAfter(LocalDate.now()));
        if (!hasCurrentOrPastWorkEntry) {
            throw new BusinessException("Cannot submit a timesheet that only contains future-dated entries. Please log at least one work entry for today or a past day.");
        }

        timesheet.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        timesheet = timesheetRepository.save(timesheet);

        String managerId = timesheet.getEmployee().getManagerId();
        if (managerId != null) {
            String weekLabel = timesheet.getWeekStartDate() + " to " + timesheet.getWeekEndDate();
            notificationService.create(managerId,
                    "Timesheet Submitted",
                    timesheet.getEmployee().getName() + " submitted their timesheet for " + weekLabel,
                    Notification.NotificationType.TIMESHEET_SUBMITTED,
                    Notification.NotificationSection.TEAM_TIMESHEET); // team-scoped — badge appears on /team (Team Overview)
        }

        return toDetailResponse(timesheet);
    }

    @Transactional
    public TimesheetResponse addEntry(String timesheetId, String employeeId, AddTimeEntryRequest request) {
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet not found: " + timesheetId));

        if (!timesheet.getEmployee().getId().equals(employeeId)) {
            throw new AccessDeniedException("Access denied");
        }
        if (timesheet.getStatus() == Timesheet.TimesheetStatus.SUBMITTED ||
                timesheet.getStatus() == Timesheet.TimesheetStatus.APPROVED) {
            throw new BusinessException("Cannot modify a submitted or approved timesheet");
        }

        // Block entries on future dates
        LocalDate dayDate = timesheet.getWeekStartDate().plusDays(DAY_OFFSET.get(request.getDay()));
        if (dayDate.isAfter(LocalDate.now())) {
            throw new BusinessException("Cannot log time for a future date");
        }

        // Block entries on holidays or approved leave days
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
            if (project.getStatus() != Project.ProjectStatus.ACTIVE) {
                throw new BusinessException("Cannot log time to an inactive project");
            }

            entry.setProject(project);
            entry.setStartTime(request.getStartTime());
            entry.setEndTime(request.getEndTime());
            entry.setDescription(request.getDescription());

            long minutes = Duration.between(request.getStartTime(), request.getEndTime()).toMinutes();
            entry.setHoursLogged(BigDecimal.valueOf(minutes)
                    .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP));
        } else {
            // LEAVE or HOLIDAY
            removeExistingLeaveEntry(timesheetId, request.getDay());
            entry.setHoursLogged(BigDecimal.ZERO);
        }

        entry = timeEntryRepository.save(entry);
        clearOvertimeCommentIfNoLongerOT(timesheet, request.getDay());
        return toDetailResponse(timesheet);
    }

    @Transactional
    public TimesheetResponse updateEntry(String entryId, String employeeId, UpdateTimeEntryRequest request) {
        TimeEntry entry = timeEntryRepository.findById(entryId)
                .orElseThrow(() -> new ResourceNotFoundException("Time entry not found: " + entryId));

        if (!entry.getTimesheet().getEmployee().getId().equals(employeeId)) {
            throw new AccessDeniedException("Access denied");
        }
        if (entry.getTimesheet().getStatus() == Timesheet.TimesheetStatus.SUBMITTED ||
                entry.getTimesheet().getStatus() == Timesheet.TimesheetStatus.APPROVED) {
            throw new BusinessException("Cannot modify a submitted or approved timesheet");
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
        // Daily 8h cap removed — overtime is computed in the aggregation layer.
        long newMinutes = Duration.between(newStart, newEnd).toMinutes();
        BigDecimal newHours = BigDecimal.valueOf(newMinutes)
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);

        if (request.getProjectId() != null) {
            Project project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + request.getProjectId()));
            if (project.getStatus() != Project.ProjectStatus.ACTIVE) {
                throw new BusinessException("Cannot log time to an inactive project");
            }
            entry.setProject(project);
        }

        entry.setStartTime(newStart);
        entry.setEndTime(newEnd);
        entry.setHoursLogged(newHours);
        if (request.getDescription() != null) entry.setDescription(request.getDescription());

        timeEntryRepository.save(entry);
        clearOvertimeCommentIfNoLongerOT(entry.getTimesheet(), entry.getDay());
        return toDetailResponse(entry.getTimesheet());
    }

    @Transactional
    public TimesheetResponse deleteEntry(String entryId, String employeeId) {
        TimeEntry entry = timeEntryRepository.findById(entryId)
                .orElseThrow(() -> new ResourceNotFoundException("Time entry not found: " + entryId));

        if (!entry.getTimesheet().getEmployee().getId().equals(employeeId)) {
            throw new AccessDeniedException("Access denied");
        }
        if (entry.getTimesheet().getStatus() == Timesheet.TimesheetStatus.SUBMITTED ||
                entry.getTimesheet().getStatus() == Timesheet.TimesheetStatus.APPROVED) {
            throw new BusinessException("Cannot modify a submitted or approved timesheet");
        }

        Timesheet timesheet = entry.getTimesheet();
        TimeEntry.DayOfWeek affectedDay = entry.getDay();
        timeEntryRepository.delete(entry);
        clearOvertimeCommentIfNoLongerOT(timesheet, affectedDay);
        return toDetailResponse(timesheet);
    }

    @Transactional
    public TimesheetResponse saveOvertimeComment(String timesheetId, String employeeId,
                                                  SaveOvertimeCommentRequest request) {
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet not found: " + timesheetId));

        if (!timesheet.getEmployee().getId().equals(employeeId)) {
            throw new AccessDeniedException("Access denied");
        }
        Timesheet.TimesheetStatus status = timesheet.getStatus();
        if (status == Timesheet.TimesheetStatus.SUBMITTED || status == Timesheet.TimesheetStatus.APPROVED) {
            throw new BusinessException("Cannot edit overtime comments on a submitted or approved timesheet");
        }

        if (timesheet.getOvertimeComments() == null) {
            timesheet.setOvertimeComments(new EnumMap<>(TimeEntry.DayOfWeek.class));
        }

        String trimmed = request.getComment() != null ? request.getComment().trim() : "";
        if (trimmed.isEmpty()) {
            timesheet.getOvertimeComments().remove(request.getDay());
        } else {
            timesheet.getOvertimeComments().put(request.getDay(), trimmed);
        }

        timesheetRepository.save(timesheet);
        return toDetailResponse(timesheet);
    }

    /**
     * If the given day no longer has overtime after an entry change, remove any stored comment
     * for that day to avoid stale data. Called after addEntry, updateEntry, and deleteEntry.
     */
    private void clearOvertimeCommentIfNoLongerOT(Timesheet timesheet, TimeEntry.DayOfWeek day) {
        Map<TimeEntry.DayOfWeek, String> comments = timesheet.getOvertimeComments();
        if (comments == null || !comments.containsKey(day)) return;

        LocalDate weekStart = timesheet.getWeekStartDate();
        LocalDate dayDate = weekStart.plusDays(DAY_OFFSET.get(day));
        LocalDate weekEnd = weekStart.plusDays(4);

        Set<LocalDate> holidayDates = holidayRepository.findByDateBetween(weekStart, weekEnd)
                .stream().map(Holiday::getDate).collect(Collectors.toSet());
        List<Leave> leaves = leaveRepository.findApprovedLeavesForWeek(
                timesheet.getEmployee().getId(), weekStart, weekEnd);

        List<TimeEntry> allEntries = timeEntryRepository.findByTimesheetId(timesheet.getId());
        DayOvertimeData ot = computeDayOvertime(allEntries, dayDate, holidayDates, leaves);

        if (ot.overtimeHours().compareTo(BigDecimal.ZERO) == 0) {
            comments.remove(day);
            timesheetRepository.save(timesheet);
        }
    }

    @Transactional(readOnly = true)
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
        // Daily 8h cap removed — overtime is computed in the aggregation layer.
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
        // Timesheet is locked (non-editable) when SUBMITTED or APPROVED
        boolean isLocked = timesheet.getStatus() == Timesheet.TimesheetStatus.SUBMITTED
                || timesheet.getStatus() == Timesheet.TimesheetStatus.APPROVED;

        // Pre-fetch holidays and approved leaves for this week (Mon–Fri)
        LocalDate weekStart = timesheet.getWeekStartDate();
        LocalDate weekEnd   = weekStart.plusDays(4);
        List<Holiday> weekHolidays = holidayRepository.findByDateBetweenOrderByDateAsc(weekStart, weekEnd);
        Set<LocalDate> holidayDates = weekHolidays.stream()
                .map(Holiday::getDate).collect(Collectors.toSet());

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
        BigDecimal totalRegularHours = BigDecimal.ZERO;
        BigDecimal totalOvertimeHours = BigDecimal.ZERO;
        int dayIndex = 0;

        for (Map.Entry<TimeEntry.DayOfWeek, List<TimeEntry>> dayEntry : byDay.entrySet()) {
            LocalDate dayDate = weekStart.plusDays(dayIndex++);
            List<TimeEntry> dayEntries = dayEntry.getValue();

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

            boolean editable = !isLocked && dayStatus.equals("WORK");

            DayOvertimeData overtime = computeDayOvertime(allEntries, dayDate, holidayDates, weekLeaves);
            totalRegularHours = totalRegularHours.add(overtime.regularHours());
            totalOvertimeHours = totalOvertimeHours.add(overtime.overtimeHours());

            // Resolve overtime comment — only exposed when day actually has overtime
            Map<TimeEntry.DayOfWeek, String> commentMap = timesheet.getOvertimeComments();
            TimeEntry.DayOfWeek dayKey = dayEntry.getKey();
            String overtimeComment = (overtime.overtimeHours().compareTo(BigDecimal.ZERO) > 0 && commentMap != null)
                    ? commentMap.get(dayKey) : null;

            List<TimeEntryResponse> entryResponses = dayEntries.stream()
                    .map(this::toEntryResponse)
                    .collect(Collectors.toList());

            days.add(TimesheetResponse.DayResponse.builder()
                    .day(dayEntry.getKey().name())
                    .totalHours(overtime.workHours())
                    .regularHours(overtime.regularHours())
                    .overtimeHours(overtime.overtimeHours())
                    .dayStatus(dayStatus)
                    .leaveType(leaveType)
                    .leaveId(leaveId)
                    .editable(editable)
                    .overtimeComment(overtimeComment)
                    .entries(entryResponses)
                    .build());
        }

        return TimesheetResponse.builder()
                .id(timesheet.getId())
                .employeeId(timesheet.getEmployee().getId())
                .employeeName(timesheet.getEmployee().getName())
                .weekStartDate(timesheet.getWeekStartDate())
                .weekEndDate(timesheet.getWeekEndDate())
                .totalHours(totalRegularHours.add(totalOvertimeHours))
                .totalRegularHours(totalRegularHours)
                .totalOvertimeHours(totalOvertimeHours)
                .status(timesheet.getStatus().name())
                .approvedBy(timesheet.getApprovedBy())
                .approvedByName(resolveApproverName(timesheet.getApprovedBy()))
                .rejectionReason(timesheet.getRejectionReason())
                .days(days)
                .build();
    }

    public TimesheetResponse toSummaryResponse(Timesheet timesheet) {
        List<TimeEntry> entries = timeEntryRepository.findByTimesheetId(timesheet.getId());
        LocalDate start = timesheet.getWeekStartDate();
        LocalDate end   = start.plusDays(4);
        Set<LocalDate> holidayDates = holidayRepository.findByDateBetween(start, end)
                .stream().map(Holiday::getDate).collect(Collectors.toSet());
        List<Leave> leaves = leaveRepository.findApprovedLeavesForWeek(
                timesheet.getEmployee().getId(), start, end);
        return toSummaryResponseWithData(timesheet, entries, holidayDates, leaves);
    }

    // --- Batch summary builder used by all list methods (3 queries regardless of page size) ---

    private List<TimesheetResponse> buildBatchedSummaryResponses(List<Timesheet> timesheets,
                                                                   String employeeId) {
        if (timesheets.isEmpty()) return List.of();

        List<String> ids = timesheets.stream().map(Timesheet::getId).collect(Collectors.toList());
        List<TimeEntry> allEntries = timeEntryRepository.findByTimesheetIdIn(ids);
        Map<String, List<TimeEntry>> entriesByTs = allEntries.stream()
                .collect(Collectors.groupingBy(e -> e.getTimesheet().getId()));

        LocalDate minStart = timesheets.stream()
                .map(Timesheet::getWeekStartDate).min(LocalDate::compareTo).orElseThrow();
        LocalDate maxEnd = timesheets.stream()
                .map(Timesheet::getWeekEndDate).max(LocalDate::compareTo).orElseThrow();

        Set<LocalDate> holidayDates = holidayRepository.findByDateBetween(minStart, maxEnd)
                .stream().map(Holiday::getDate).collect(Collectors.toSet());
        List<Leave> leaves = leaveRepository.findApprovedLeavesForWeek(employeeId, minStart, maxEnd);

        return timesheets.stream()
                .map(ts -> toSummaryResponseWithData(
                        ts,
                        entriesByTs.getOrDefault(ts.getId(), List.of()),
                        holidayDates,
                        leaves))
                .collect(Collectors.toList());
    }

    private TimesheetResponse toSummaryResponseWithData(Timesheet timesheet, List<TimeEntry> entries,
                                                         Set<LocalDate> holidayDates, List<Leave> leaves) {
        LocalDate weekStart = timesheet.getWeekStartDate();
        BigDecimal totalRegularHours  = BigDecimal.ZERO;
        BigDecimal totalOvertimeHours = BigDecimal.ZERO;
        for (int i = 0; i < 5; i++) {
            DayOvertimeData data = computeDayOvertime(entries, weekStart.plusDays(i), holidayDates, leaves);
            totalRegularHours  = totalRegularHours.add(data.regularHours());
            totalOvertimeHours = totalOvertimeHours.add(data.overtimeHours());
        }
        return TimesheetResponse.builder()
                .id(timesheet.getId())
                .employeeId(timesheet.getEmployee().getId())
                .employeeName(timesheet.getEmployee().getName())
                .weekStartDate(timesheet.getWeekStartDate())
                .weekEndDate(timesheet.getWeekEndDate())
                .totalHours(totalRegularHours.add(totalOvertimeHours))
                .totalRegularHours(totalRegularHours)
                .totalOvertimeHours(totalOvertimeHours)
                .status(timesheet.getStatus().name())
                .approvedBy(timesheet.getApprovedBy())
                .rejectionReason(timesheet.getRejectionReason())
                .build();
    }

    /** Resolve approver's display name for detail responses. Returns null if no approver. */
    private String resolveApproverName(String approverId) {
        if (approverId == null) return null;
        return employeeRepository.findById(approverId)
                .map(Employee::getName)
                .orElse(null);
    }

    /**
     * Approve a SUBMITTED timesheet.
     * MANAGER can only approve timesheets of their own direct reports.
     */
    @Transactional
    public TimesheetResponse approveTimesheet(String timesheetId, String approverId,
                                              Employee.Role approverRole) {
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet not found: " + timesheetId));

        if (timesheet.getStatus() != Timesheet.TimesheetStatus.SUBMITTED) {
            throw new BusinessException("Only SUBMITTED timesheets can be approved");
        }

        if (approverId.equals(timesheet.getEmployee().getId())) {
            throw new AccessDeniedException("You cannot approve your own timesheet");
        }

        if (approverRole == Employee.Role.MANAGER
                && !approverId.equals(timesheet.getEmployee().getManagerId())) {
            throw new AccessDeniedException(
                    "Managers can only approve timesheets of their direct reports");
        }

        timesheet.setStatus(Timesheet.TimesheetStatus.APPROVED);
        timesheet.setApprovedBy(approverId);
        timesheet = timesheetRepository.save(timesheet);

        String weekLabel = timesheet.getWeekStartDate() + " to " + timesheet.getWeekEndDate();
        notificationService.create(timesheet.getEmployee().getId(),
                "Timesheet Approved",
                "Your timesheet for " + weekLabel + " has been approved.",
                Notification.NotificationType.TIMESHEET_APPROVED,
                Notification.NotificationSection.TIMESHEET);

        return toDetailResponse(timesheet);
    }

    /**
     * Reject a SUBMITTED timesheet.
     * MANAGER can only reject timesheets of their own direct reports.
     * Employee can then edit and re-submit (status goes back to editable mode).
     */
    @Transactional
    public TimesheetResponse rejectTimesheet(String timesheetId, String approverId,
                                             Employee.Role approverRole, String reason) {
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet not found: " + timesheetId));

        if (timesheet.getStatus() != Timesheet.TimesheetStatus.SUBMITTED) {
            throw new BusinessException("Only SUBMITTED timesheets can be rejected");
        }

        if (approverId.equals(timesheet.getEmployee().getId())) {
            throw new AccessDeniedException("You cannot reject your own timesheet");
        }

        if (approverRole == Employee.Role.MANAGER
                && !approverId.equals(timesheet.getEmployee().getManagerId())) {
            throw new AccessDeniedException(
                    "Managers can only reject timesheets of their direct reports");
        }

        if (reason == null || reason.isBlank()) {
            throw new BusinessException("A rejection reason is required");
        }

        timesheet.setStatus(Timesheet.TimesheetStatus.REJECTED);
        timesheet.setApprovedBy(approverId);
        timesheet.setRejectionReason(reason);
        timesheet = timesheetRepository.save(timesheet);

        String weekLabel = timesheet.getWeekStartDate() + " to " + timesheet.getWeekEndDate();
        String displayReason = (reason != null && !reason.isBlank()) ? reason : "No reason provided";
        notificationService.create(timesheet.getEmployee().getId(),
                "Timesheet Rejected",
                "Your timesheet for " + weekLabel + " has been rejected. Reason: " + displayReason,
                Notification.NotificationType.TIMESHEET_REJECTED,
                Notification.NotificationSection.TIMESHEET);

        return toDetailResponse(timesheet);
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

    // -------------------------------------------------------------------------
    // Overtime computation helpers
    // -------------------------------------------------------------------------

    private record DayOvertimeData(BigDecimal workHours, BigDecimal regularHours, BigDecimal overtimeHours) {}

    /**
     * Computes overtime data for a single calendar day.
     * <p>
     * Rules:
     * <ul>
     *   <li>HOLIDAY or APPROVED LEAVE days → all fields 0.00</li>
     *   <li>Only WORK entries with non-null startTime/endTime contribute</li>
     *   <li>Arithmetic is done in minutes to avoid floating-point accumulation</li>
     *   <li>Results are rounded HALF_UP to 2 decimal places</li>
     * </ul>
     */
    private DayOvertimeData computeDayOvertime(List<TimeEntry> allEntries, LocalDate dayDate,
                                                Set<LocalDate> holidayDates, List<Leave> approvedLeaves) {
        if (holidayDates.contains(dayDate)) {
            return new DayOvertimeData(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }
        for (Leave leave : approvedLeaves) {
            if (!dayDate.isBefore(leave.getStartDate()) && !dayDate.isAfter(leave.getEndDate())) {
                return new DayOvertimeData(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
            }
        }

        // Convert java.time.DayOfWeek to the custom TimeEntry.DayOfWeek enum (same name strings)
        TimeEntry.DayOfWeek customDay = TimeEntry.DayOfWeek.valueOf(dayDate.getDayOfWeek().name());

        long totalMinutes = 0;
        for (TimeEntry entry : allEntries) {
            if (entry.getDay() == customDay && entry.getEntryType() == TimeEntry.EntryType.WORK
                    && entry.getStartTime() != null && entry.getEndTime() != null) {
                totalMinutes += Duration.between(entry.getStartTime(), entry.getEndTime()).toMinutes();
            }
        }

        long regularMinutes  = Math.min(totalMinutes, 480);
        long overtimeMinutes = Math.max(totalMinutes - 480, 0);

        BigDecimal regularHours  = BigDecimal.valueOf(regularMinutes)
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        BigDecimal overtimeHours = BigDecimal.valueOf(overtimeMinutes)
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        BigDecimal workHours = regularHours.add(overtimeHours);

        return new DayOvertimeData(workHours, regularHours, overtimeHours);
    }

    // -------------------------------------------------------------------------
    // Copy Last Week feature
    // -------------------------------------------------------------------------

    /**
     * MERGE copy of WORK entries from the immediately preceding week into the target timesheet.
     * Idempotent: re-running produces copiedCount=0 (all entries already exist as DUPLICATE_ENTRY).
     */
    @Transactional
    public CopyLastWeekResponse copyFromPreviousWeek(String timesheetId, String employeeId) {
        return doCopyFromPreviousWeek(timesheetId, employeeId, false);
    }

    /**
     * Dry-run variant — runs in a read-only transaction so Hibernate can never flush
     * the transient TimeEntry objects, regardless of CascadeType.ALL on Timesheet.entries.
     */
    @Transactional(readOnly = true)
    public CopyLastWeekResponse previewCopyFromPreviousWeek(String timesheetId, String employeeId) {
        return doCopyFromPreviousWeek(timesheetId, employeeId, true);
    }

    private CopyLastWeekResponse doCopyFromPreviousWeek(String timesheetId, String employeeId, boolean dryRun) {
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet not found: " + timesheetId));

        if (!timesheet.getEmployee().getId().equals(employeeId)) {
            throw new AccessDeniedException("Access denied");
        }

        Timesheet.TimesheetStatus status = timesheet.getStatus();
        if (status == Timesheet.TimesheetStatus.SUBMITTED || status == Timesheet.TimesheetStatus.APPROVED) {
            throw new BusinessException("Cannot copy into a non-DRAFT timesheet");
        }

        LocalDate sourceWeekStart = timesheet.getWeekStartDate().minusDays(7);
        Optional<Timesheet> sourceOptional =
                timesheetRepository.findByEmployeeIdAndWeekStartDate(employeeId, sourceWeekStart);

        if (sourceOptional.isEmpty()) {
            return CopyLastWeekResponse.builder()
                    .timesheet(dryRun ? null : toDetailResponse(timesheet))
                    .copySummary(CopySummary.builder()
                            .copiedCount(0).skippedCount(0)
                            .sourceWeekStart(sourceWeekStart.toString())
                            .message("No previous week timesheet found")
                            .skippedEntries(List.of())
                            .pendingEntries(List.of()).build())
                    .build();
        }

        List<TimeEntry> sourceEntries = timeEntryRepository.findByTimesheetId(sourceOptional.get().getId())
                .stream().filter(e -> e.getEntryType() == TimeEntry.EntryType.WORK)
                .collect(Collectors.toList());

        if (sourceEntries.isEmpty()) {
            return CopyLastWeekResponse.builder()
                    .timesheet(dryRun ? null : toDetailResponse(timesheet))
                    .copySummary(CopySummary.builder()
                            .copiedCount(0).skippedCount(0)
                            .sourceWeekStart(sourceWeekStart.toString())
                            .message("Previous week has no work entries")
                            .skippedEntries(List.of())
                            .pendingEntries(List.of()).build())
                    .build();
        }

        // Pre-fetch target week data (3 queries)
        LocalDate targetWeekStart = timesheet.getWeekStartDate();
        LocalDate targetWeekEnd   = timesheet.getWeekEndDate();

        Set<LocalDate> targetHolidayDates = holidayRepository.findByDateBetween(targetWeekStart, targetWeekEnd)
                .stream().map(Holiday::getDate).collect(Collectors.toSet());
        List<Leave> targetLeaves = leaveRepository.findApprovedLeavesForWeek(
                employeeId, targetWeekStart, targetWeekEnd);

        // Mutable virtual list: pre-populated with existing WORK entries; updated as entries are accepted.
        // Critical for preventing duplicate saves when source week contains self-overlapping entries.
        List<TimeEntry> virtualEntries = new ArrayList<>(
                timeEntryRepository.findByTimesheetId(timesheetId).stream()
                        .filter(e -> e.getEntryType() == TimeEntry.EntryType.WORK)
                        .collect(Collectors.toList()));

        // Pre-fetch all referenced projects in one query instead of one-per-entry
        Set<String> srcProjectIds = sourceEntries.stream()
                .map(e -> e.getProject().getId())
                .collect(Collectors.toSet());
        Map<String, Project> projectMap = projectRepository.findAllById(srcProjectIds)
                .stream().collect(Collectors.toMap(Project::getId, p -> p));

        // Sort: day ordinal ascending, then startTime ascending (null-safe)
        sourceEntries.sort(Comparator
                .comparingInt((TimeEntry e) -> e.getDay().ordinal())
                .thenComparing(e -> e.getStartTime() != null ? e.getStartTime() : LocalTime.MIN));

        List<TimeEntry>          toSave  = new ArrayList<>();
        List<SkippedEntryDetail> skipped = new ArrayList<>();

        for (TimeEntry se : sourceEntries) {
            // Null-guard: silently skip corrupt/seed entries (not counted in skipped)
            if (se.getStartTime() == null || se.getEndTime() == null) {
                continue;
            }

            LocalDate targetDayDate = targetWeekStart.plusDays(DAY_OFFSET.get(se.getDay()));

            // a. HOLIDAY
            if (targetHolidayDates.contains(targetDayDate)) {
                skipped.add(buildSkippedDetail(se, "HOLIDAY_DAY", null));
                continue;
            }

            // b. LEAVE
            boolean onLeave = false;
            for (Leave leave : targetLeaves) {
                if (!targetDayDate.isBefore(leave.getStartDate()) && !targetDayDate.isAfter(leave.getEndDate())) {
                    onLeave = true;
                    break;
                }
            }
            if (onLeave) {
                skipped.add(buildSkippedDetail(se, "LEAVE_DAY", null));
                continue;
            }

            // c. Project check: missing or not ACTIVE (covers COMPLETED and ON_HOLD)
            Project resolvedProject = projectMap.get(se.getProject().getId());
            if (resolvedProject == null || resolvedProject.getStatus() != Project.ProjectStatus.ACTIVE) {
                skipped.add(buildSkippedDetail(se, "PROJECT_NOT_ACTIVE", null));
                continue;
            }

            // d. Duplicate (same project + start + end already in virtualEntries)
            String srcProjectId = se.getProject().getId();
            boolean isDuplicate = virtualEntries.stream().anyMatch(ve ->
                    ve.getDay() == se.getDay()
                    && ve.getProject() != null
                    && ve.getProject().getId().equals(srcProjectId)
                    && se.getStartTime().equals(ve.getStartTime())
                    && se.getEndTime().equals(ve.getEndTime()));
            if (isDuplicate) {
                skipped.add(buildSkippedDetail(se, "DUPLICATE_ENTRY", null));
                continue;
            }

            // e. Overlap check (boundary-touching is allowed, same as manual entry)
            TimeEntry conflictEntry = null;
            for (TimeEntry ve : virtualEntries) {
                if (ve.getDay() == se.getDay() && ve.getStartTime() != null && ve.getEndTime() != null) {
                    if (hasOverlap(se.getStartTime(), se.getEndTime(),
                            ve.getStartTime(), ve.getEndTime())) {
                        conflictEntry = ve;
                        break;
                    }
                }
            }
            if (conflictEntry != null) {
                String conflictRange = conflictEntry.getStartTime() + "\u2013" + conflictEntry.getEndTime();
                skipped.add(buildSkippedDetail(se, "OVERLAP_STRICT", conflictRange));
                continue;
            }

            // f. Accept entry
            long minutes = Duration.between(se.getStartTime(), se.getEndTime()).toMinutes();
            BigDecimal hours = BigDecimal.valueOf(minutes)
                    .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);

            TimeEntry newEntry = TimeEntry.builder()
                    .timesheet(timesheet)
                    .project(resolvedProject)
                    .day(se.getDay())
                    .entryType(TimeEntry.EntryType.WORK)
                    .startTime(se.getStartTime())
                    .endTime(se.getEndTime())
                    .hoursLogged(hours)
                    .description(se.getDescription())
                    .build();
            toSave.add(newEntry);
            virtualEntries.add(newEntry); // update virtual list for subsequent iteration checks
        }

        if (!dryRun) {
            timeEntryRepository.saveAll(toSave);
        }

        List<SkippedEntryDetail> pending = toSave.stream()
                .map(e -> buildSkippedDetail(e, null, null))
                .collect(Collectors.toList());

        return CopyLastWeekResponse.builder()
                .timesheet(dryRun ? null : toDetailResponse(timesheet))
                .copySummary(CopySummary.builder()
                        .copiedCount(toSave.size())
                        .skippedCount(skipped.size())
                        .sourceWeekStart(sourceWeekStart.toString())
                        .message(null)
                        .pendingEntries(pending)
                        .skippedEntries(skipped)
                        .build())
                .build();
    }

    private SkippedEntryDetail buildSkippedDetail(TimeEntry se, String reason, String conflictingRange) {
        return SkippedEntryDetail.builder()
                .day(se.getDay().name())
                .projectId(se.getProject() != null ? se.getProject().getId() : null)
                .projectName(se.getProject() != null ? se.getProject().getName() : null)
                .startTime(se.getStartTime() != null ? se.getStartTime().toString() : null)
                .endTime(se.getEndTime() != null ? se.getEndTime().toString() : null)
                .reason(reason)
                .conflictingRange(conflictingRange)
                .build();
    }

    /**
     * Overlap check used by the copy path — exclusive boundary semantics (same as manual entry).
     * <p>
     * Back-to-back entries (e.g., 09:00–13:00 and 13:00–17:00) share only a boundary point
     * and are NOT considered overlapping.
     * Condition: newStart &lt; existEnd AND newEnd &gt; existStart (both exclusive).
     */
    private boolean hasOverlap(LocalTime newStart, LocalTime newEnd,
                                LocalTime existStart, LocalTime existEnd) {
        // newStart < existEnd AND newEnd > existStart
        return newStart.isBefore(existEnd) && newEnd.isAfter(existStart);
    }
}
