package com.timekeeper.controller;

import com.timekeeper.dto.request.ChangePasswordRequest;
import com.timekeeper.dto.request.LoginRequest;
import com.timekeeper.dto.response.ApiResponse;
import com.timekeeper.dto.response.LoginResponse;
import com.timekeeper.entity.Employee;
import com.timekeeper.security.JwtService;
import com.timekeeper.security.LoginRateLimiter;
import com.timekeeper.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Authentication", description = "Login, logout, and password management")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final LoginRateLimiter loginRateLimiter;

    @Operation(summary = "Login", description = "Authenticate with email and password; returns a JWT token")
    @SecurityRequirements  // login is public — no Bearer token needed in Swagger
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        String ip  = resolveClientIp(httpRequest);
        // Composite key: one user's failures cannot block another on the same NAT/VPN IP.
        String key = request.getEmail() + ":" + ip;

        if (loginRateLimiter.isRateLimited(key)) {
            long retryAfter = loginRateLimiter.getRetryAfterSeconds(key);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header("Retry-After", String.valueOf(retryAfter))
                    .body(ApiResponse.error("Too many login attempts. Please try again in " + retryAfter + " seconds."));
        }

        try {
            LoginResponse response = authService.login(request);
            loginRateLimiter.clearAttempts(key);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            boolean nowLimited = loginRateLimiter.recordFailedAttempt(key);
            if (nowLimited) {
                long retryAfter = loginRateLimiter.getRetryAfterSeconds(key);
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .header("Retry-After", String.valueOf(retryAfter))
                        .body(ApiResponse.error("Too many login attempts. Please try again in " + retryAfter + " seconds."));
            }
            throw e; // re-throw so GlobalExceptionHandler handles it (BadCredentialsException → 401)
        }
    }

    @Operation(summary = "Logout", description = "Revoke the current JWT token (adds it to the server-side blacklist)")
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest httpRequest) {
        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            jwtService.revokeToken(token);
        }
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }

    @Operation(summary = "Change password", description = "Change the authenticated user's password")
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal Employee currentUser,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
    }

    /**
     * Only trust X-Forwarded-For when the direct connection comes from a known
     * local proxy (127.0.0.1 / ::1).  Blindly trusting it allows an attacker to
     * send a spoofed header and bypass the rate limiter.
     */
    private String resolveClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        if ("127.0.0.1".equals(remoteAddr) || "::1".equals(remoteAddr)) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        return remoteAddr;
    }
}
