package com.timekeeper.controller;

import com.timekeeper.dto.request.AddTimeEntryRequest;
import com.timekeeper.dto.request.CreateTimesheetRequest;
import com.timekeeper.dto.request.UpdateTimeEntryRequest;
import com.timekeeper.dto.response.ApiResponse;
import com.timekeeper.dto.response.TimeEntryResponse;
import com.timekeeper.dto.response.TimesheetResponse;
import com.timekeeper.entity.Employee;
import com.timekeeper.service.TimesheetService;
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

@RestController
@RequestMapping("/api/v1/timesheets")
@RequiredArgsConstructor
public class TimesheetController {

    private final TimesheetService timesheetService;

    // Dashboard: last 5 timesheets
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, List<TimesheetResponse>>>> getMyTimesheets(
            @AuthenticationPrincipal Employee currentUser) {
        List<TimesheetResponse> timesheets = timesheetService.getMyTimesheets(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("timesheets", timesheets)));
    }

    // Full paginated list of all my timesheets
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

    // Get by ID
    @GetMapping("/{timesheetId}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<TimesheetResponse>> getById(@PathVariable String timesheetId) {
        return ResponseEntity.ok(ApiResponse.success(timesheetService.getById(timesheetId)));
    }

    // Submit timesheet
    @PostMapping("/{timesheetId}/submit")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<TimesheetResponse>> submit(
            @PathVariable String timesheetId,
            @AuthenticationPrincipal Employee currentUser) {
        TimesheetResponse response = timesheetService.submit(timesheetId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // Add entry
    @PostMapping("/{timesheetId}/entries")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<TimeEntryResponse>> addEntry(
            @PathVariable String timesheetId,
            @AuthenticationPrincipal Employee currentUser,
            @Valid @RequestBody AddTimeEntryRequest request) {
        TimeEntryResponse response = timesheetService.addEntry(timesheetId, currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    // Get entries
    @GetMapping("/{timesheetId}/entries")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<TimeEntryResponse>>> getEntries(
            @PathVariable String timesheetId) {
        return ResponseEntity.ok(ApiResponse.success(timesheetService.getEntries(timesheetId)));
    }

    // Update entry
    @PutMapping("/entries/{entryId}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<TimeEntryResponse>> updateEntry(
            @PathVariable String entryId,
            @AuthenticationPrincipal Employee currentUser,
            @Valid @RequestBody UpdateTimeEntryRequest request) {
        TimeEntryResponse response = timesheetService.updateEntry(entryId, currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // Delete entry
    @DeleteMapping("/entries/{entryId}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteEntry(
            @PathVariable String entryId,
            @AuthenticationPrincipal Employee currentUser) {
        timesheetService.deleteEntry(entryId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Entry deleted", null));
    }
}
