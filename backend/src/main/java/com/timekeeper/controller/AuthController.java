package com.timekeeper.controller;

import com.timekeeper.dto.request.ChangePasswordRequest;
import com.timekeeper.dto.request.LoginRequest;
import com.timekeeper.dto.response.ApiResponse;
import com.timekeeper.dto.response.LoginResponse;
import com.timekeeper.entity.Employee;
import com.timekeeper.security.JwtService;
import com.timekeeper.security.LoginRateLimiter;
import com.timekeeper.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final LoginRateLimiter loginRateLimiter;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        String ip = resolveClientIp(httpRequest);

        if (loginRateLimiter.isRateLimited(ip)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error("Too many login attempts. Please try again later."));
        }

        try {
            LoginResponse response = authService.login(request);
            loginRateLimiter.clearAttempts(ip);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            boolean nowLimited = loginRateLimiter.recordFailedAttempt(ip);
            if (nowLimited) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(ApiResponse.error("Too many login attempts. Please try again in 1 minute."));
            }
            throw e; // re-throw so GlobalExceptionHandler handles it (BadCredentialsException → 401)
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest httpRequest) {
        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            jwtService.revokeToken(token);
        }
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal Employee currentUser,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
