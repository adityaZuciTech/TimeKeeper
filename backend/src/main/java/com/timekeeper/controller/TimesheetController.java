package com.timekeeper.controller;

import com.timekeeper.dto.request.AddTimeEntryRequest;
import com.timekeeper.dto.request.CreateTimesheetRequest;
import com.timekeeper.dto.request.UpdateTimeEntryRequest;
import com.timekeeper.dto.response.ApiResponse;
import com.timekeeper.dto.response.TimeEntryResponse;
import com.timekeeper.dto.response.TimesheetResponse;
import com.timekeeper.entity.Employee;
import com.timekeeper.service.TimesheetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.AccessDeniedException;

@Tag(name = "Timesheets", description = "Create, retrieve, and submit weekly timesheets and time entries")
@RestController
@RequestMapping("/api/v1/timesheets")
@RequiredArgsConstructor
public class TimesheetController {

    private final TimesheetService timesheetService;

    // Dashboard: last 5 timesheets
    @Operation(summary = "Get my recent timesheets", description = "Returns the 5 most recent timesheets for the current user")
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, List<TimesheetResponse>>>> getMyTimesheets(
            @AuthenticationPrincipal Employee currentUser) {
        List<TimesheetResponse> timesheets = timesheetService.getMyTimesheets(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("timesheets", timesheets)));
    }

    // Full paginated list of all my timesheets
    @Operation(summary = "Get all my timesheets (paginated)")
    @GetMapping("/my/all")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllMyTimesheets(
            @AuthenticationPrincipal Employee currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var result = timesheetService.getAllTimesheetsPaged(currentUser.getId(), page, size);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // Create timesheet for a week
    @Operation(summary = "Create or get timesheet for a week", description = "Idempotent: returns existing timesheet if one already exists for the week")
    @PostMapping
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<TimesheetResponse>> create(
            @AuthenticationPrincipal Employee currentUser,
            @Valid @RequestBody CreateTimesheetRequest request) {
        TimesheetResponse response = timesheetService.createOrGetForWeek(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    // Get by week
    @GetMapping
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<TimesheetResponse>> getByWeek(
            @AuthenticationPrincipal Employee currentUser,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate) {
        TimesheetResponse response = timesheetService.getByWeek(currentUser.getId(), weekStartDate);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // Get by ID — employees can only view their own timesheets
    @GetMapping("/{timesheetId}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<TimesheetResponse>> getById(
            @PathVariable String timesheetId,
            @AuthenticationPrincipal Employee currentUser) {
        TimesheetResponse response = timesheetService.getById(timesheetId);
        if (currentUser.getRole() == Employee.Role.EMPLOYEE
                && !response.getEmployeeId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Access denied");
        }
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // Submit timesheet
    @Operation(summary = "Submit timesheet for approval")
    @PostMapping("/{timesheetId}/submit")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<TimesheetResponse>> submit(
            @PathVariable String timesheetId,
            @AuthenticationPrincipal Employee currentUser) {
        TimesheetResponse response = timesheetService.submit(timesheetId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // Add entry — returns full updated timesheet (eliminates second client-side GET)
    @PostMapping("/{timesheetId}/entries")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<TimesheetResponse>> addEntry(
            @PathVariable String timesheetId,
            @AuthenticationPrincipal Employee currentUser,
            @Valid @RequestBody AddTimeEntryRequest request) {
        TimesheetResponse response = timesheetService.addEntry(timesheetId, currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    // Get entries
    @GetMapping("/{timesheetId}/entries")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<TimeEntryResponse>>> getEntries(
            @PathVariable String timesheetId) {
        return ResponseEntity.ok(ApiResponse.success(timesheetService.getEntries(timesheetId)));
    }

    // Update entry — returns full updated timesheet
    @PutMapping("/entries/{entryId}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<TimesheetResponse>> updateEntry(
            @PathVariable String entryId,
            @AuthenticationPrincipal Employee currentUser,
            @Valid @RequestBody UpdateTimeEntryRequest request) {
        TimesheetResponse response = timesheetService.updateEntry(entryId, currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // Delete entry — returns full updated timesheet
    @DeleteMapping("/entries/{entryId}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<TimesheetResponse>> deleteEntry(
            @PathVariable String entryId,
            @AuthenticationPrincipal Employee currentUser) {
        TimesheetResponse response = timesheetService.deleteEntry(entryId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // Approve timesheet (MANAGER/ADMIN only)
    @Operation(summary = "Approve a submitted timesheet")
    @PostMapping("/{timesheetId}/approve")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<TimesheetResponse>> approveTimesheet(
            @PathVariable String timesheetId,
            @AuthenticationPrincipal Employee currentUser) {
        TimesheetResponse response = timesheetService.approveTimesheet(
                timesheetId, currentUser.getId(), currentUser.getRole());
        return ResponseEntity.ok(ApiResponse.success("Timesheet approved", response));
    }

    // Reject timesheet (MANAGER/ADMIN only)
    @Operation(summary = "Reject a submitted timesheet")
    @PostMapping("/{timesheetId}/reject")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<TimesheetResponse>> rejectTimesheet(
            @PathVariable String timesheetId,
            @AuthenticationPrincipal Employee currentUser,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        TimesheetResponse response = timesheetService.rejectTimesheet(
                timesheetId, currentUser.getId(), currentUser.getRole(), reason);
        return ResponseEntity.ok(ApiResponse.success("Timesheet rejected", response));
    }
}
