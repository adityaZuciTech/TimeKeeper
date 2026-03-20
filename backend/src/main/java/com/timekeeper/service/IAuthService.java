package com.timekeeper.service;

import com.timekeeper.dto.request.ChangePasswordRequest;
import com.timekeeper.dto.request.LoginRequest;
import com.timekeeper.dto.response.LoginResponse;

public interface IAuthService {
    LoginResponse login(LoginRequest request);
    void changePassword(String employeeId, ChangePasswordRequest request);
}
