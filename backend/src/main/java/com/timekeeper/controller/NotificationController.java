package com.timekeeper.controller;

import com.timekeeper.dto.response.ApiResponse;
import com.timekeeper.dto.response.NotificationResponse;
import com.timekeeper.entity.Employee;
import com.timekeeper.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Notifications", description = "User notification management")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "Get my notifications (last 20)")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyNotifications(
            @AuthenticationPrincipal Employee currentUser) {
        Map<String, Object> data = notificationService.getMyNotifications(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @Operation(summary = "Mark a notification as read")
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationResponse>> markAsRead(
            @PathVariable String id,
            @AuthenticationPrincipal Employee currentUser) {
        NotificationResponse response = notificationService.markAsRead(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Marked as read", response));
    }

    @Operation(summary = "Mark all notifications as read")
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(
            @AuthenticationPrincipal Employee currentUser) {
        notificationService.markAllAsRead(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read", null));
    }

    @Operation(summary = "Mark all notifications in a section as read")
    @PatchMapping("/section/{section}/read-all")
    public ResponseEntity<ApiResponse<Void>> markSectionAsRead(
            @PathVariable String section,
            @AuthenticationPrincipal Employee currentUser) {
        notificationService.markSectionAsRead(currentUser.getId(), section);
        return ResponseEntity.ok(ApiResponse.success("Section notifications marked as read", null));
    }

    @Operation(summary = "Delete a single notification")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            @PathVariable String id,
            @AuthenticationPrincipal Employee currentUser) {
        notificationService.deleteNotification(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Notification deleted", null));
    }

    @Operation(summary = "Delete all notifications for the current user")
    @DeleteMapping("/clear-all")
    public ResponseEntity<ApiResponse<Void>> clearAllNotifications(
            @AuthenticationPrincipal Employee currentUser) {
        notificationService.clearAllNotifications(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("All notifications cleared", null));
    }
}
