package com.timekeeper.service;

import com.timekeeper.dto.request.CreateLeaveRequest;
import com.timekeeper.dto.request.LeaveActionRequest;
import com.timekeeper.dto.response.LeaveResponse;

import java.util.List;

public interface LeaveService {
    LeaveResponse applyLeave(String employeeId, CreateLeaveRequest request);
    List<LeaveResponse> getMyLeaves(String employeeId);
    List<LeaveResponse> getTeamLeaves(String managerId);
    LeaveResponse approveLeave(String leaveId, String approverId, LeaveActionRequest request);
    LeaveResponse rejectLeave(String leaveId, String approverId, LeaveActionRequest request);
}
