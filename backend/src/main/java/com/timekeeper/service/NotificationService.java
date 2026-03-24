package com.timekeeper.service;

import com.timekeeper.dto.response.NotificationResponse;
import com.timekeeper.entity.Notification;
import com.timekeeper.exception.ResourceNotFoundException;
import com.timekeeper.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;

    /**
     * Creates a notification for a user. Runs in its own transaction (REQUIRES_NEW)
     * so that a notification failure never rolls back the caller's transaction.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void create(String userId, String title, String message,
                       Notification.NotificationType type,
                       Notification.NotificationSection targetSection) {
        try {
            notificationRepository.save(Notification.builder()
                    .userId(userId)
                    .title(title)
                    .message(message)
                    .type(type)
                    .targetSection(targetSection)
                    .read(false)
                    .build());
        } catch (Exception e) {
            log.warn("Failed to create notification for user {}: {}", userId, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMyNotifications(String userId) {
        List<NotificationResponse> notifications = notificationRepository
                .findTop20ByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        long unreadCount = notifications.stream().filter(n -> !n.isRead()).count();

        Map<String, Long> badges = Map.of(
                "timesheets", notifications.stream()
                        .filter(n -> !n.isRead() && "TIMESHEET".equals(n.getTargetSection())).count(),
                "leaves", notifications.stream()
                        .filter(n -> !n.isRead() && "LEAVE".equals(n.getTargetSection())).count(),
                "team", notifications.stream()
                        .filter(n -> !n.isRead() && "TEAM".equals(n.getTargetSection())).count()
        );

        return Map.of(
                "notifications", notifications,
                "unreadCount", unreadCount,
                "badges", badges
        );
    }

    @Transactional
    public NotificationResponse markAsRead(String notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));

        if (!notification.getUserId().equals(userId)) {
            throw new AccessDeniedException("Access denied");
        }

        notification.setRead(true);
        notification = notificationRepository.save(notification);
        return toResponse(notification);
    }

    @Transactional
    public void markAllAsRead(String userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    @Transactional
    public void markSectionAsRead(String userId, String section) {
        try {
            Notification.NotificationSection s = Notification.NotificationSection.valueOf(section.toUpperCase());
            notificationRepository.markAllAsReadByUserIdAndSection(userId, s);
        } catch (IllegalArgumentException e) {
            log.warn("Unknown notification section: {}", section);
        }
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType().name())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .targetSection(n.getTargetSection() != null ? n.getTargetSection().name() : null)
                .build();
    }
}
