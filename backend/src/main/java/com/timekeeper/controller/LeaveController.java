package com.timekeeper.controller;

import com.timekeeper.dto.request.CreateLeaveRequest;
import com.timekeeper.dto.request.LeaveActionRequest;
import com.timekeeper.dto.response.ApiResponse;
import com.timekeeper.dto.response.LeaveResponse;
import com.timekeeper.entity.Employee;
import com.timekeeper.service.LeaveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/leaves")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService leaveService;

    /** Employee: apply for leave */
    @PostMapping
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<LeaveResponse>> applyLeave(
            @AuthenticationPrincipal Employee currentUser,
            @Valid @RequestBody CreateLeaveRequest request) {
        LeaveResponse response = leaveService.applyLeave(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Leave applied successfully", response));
    }

    /** Employee: view own leaves */
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, List<LeaveResponse>>>> getMyLeaves(
            @AuthenticationPrincipal Employee currentUser) {
        List<LeaveResponse> leaves = leaveService.getMyLeaves(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("leaves", leaves)));
    }

    /** Manager/Admin: view team leave requests */
    @GetMapping("/team")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, List<LeaveResponse>>>> getTeamLeaves(
            @AuthenticationPrincipal Employee currentUser) {
        List<LeaveResponse> leaves = leaveService.getTeamLeaves(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("leaves", leaves)));
    }

    /** Manager/Admin: approve a leave */
    @PatchMapping("/{leaveId}/approve")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<LeaveResponse>> approveLeave(
            @PathVariable String leaveId,
            @AuthenticationPrincipal Employee currentUser,
            @RequestBody(required = false) LeaveActionRequest request) {
        LeaveResponse response = leaveService.approveLeave(leaveId, currentUser.getId(),
                request != null ? request : new LeaveActionRequest());
        return ResponseEntity.ok(ApiResponse.success("Leave approved", response));
    }

    /** Manager/Admin: reject a leave */
    @PatchMapping("/{leaveId}/reject")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<LeaveResponse>> rejectLeave(
            @PathVariable String leaveId,
            @AuthenticationPrincipal Employee currentUser,
            @RequestBody(required = false) LeaveActionRequest request) {
        LeaveResponse response = leaveService.rejectLeave(leaveId, currentUser.getId(),
                request != null ? request : new LeaveActionRequest());
        return ResponseEntity.ok(ApiResponse.success("Leave rejected", response));
    }
}
