package com.timekeeper.service;

import com.timekeeper.entity.Notification;
import com.timekeeper.exception.ResourceNotFoundException;
import com.timekeeper.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock NotificationRepository notificationRepository;

    @InjectMocks NotificationService notificationService;

    // ── helpers ───────────────────────────────────────────────────────────────

    private Notification notif(String id, String userId, boolean read,
                                Notification.NotificationType type,
                                Notification.NotificationSection section) {
        Notification n = Notification.builder()
                .id(id)
                .userId(userId)
                .title("Title")
                .message("Message")
                .type(type)
                .targetSection(section)
                .read(read)
                .build();
        n.setCreatedAt(LocalDateTime.now());
        return n;
    }

    // ── NS-01: create() — saves notification with correct fields ──────────────

    @Test
    void create_savesNotificationWithCorrectFields() {
        notificationService.create(
                "emp_1", "Timesheet Approved", "Your timesheet was approved.",
                Notification.NotificationType.TIMESHEET_APPROVED,
                Notification.NotificationSection.TIMESHEET);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification saved = captor.getValue();

        assertThat(saved.getUserId()).isEqualTo("emp_1");
        assertThat(saved.getTitle()).isEqualTo("Timesheet Approved");
        assertThat(saved.getType()).isEqualTo(Notification.NotificationType.TIMESHEET_APPROVED);
        assertThat(saved.getTargetSection()).isEqualTo(Notification.NotificationSection.TIMESHEET);
        assertThat(saved.isRead()).isFalse();
    }

    // ── NS-02: create() — repository exception is swallowed ───────────────────

    @Test
    void create_repositoryThrows_exceptionSwallowed() {
        when(notificationRepository.save(any())).thenThrow(new RuntimeException("DB down"));

        // Must NOT propagate
        assertThatCode(() ->
                notificationService.create("emp_1", "T", "M",
                        Notification.NotificationType.TIMESHEET_SUBMITTED,
                        Notification.NotificationSection.TEAM_TIMESHEET)
        ).doesNotThrowAnyException();
    }

    // ── NS-03: getMyNotifications() — unreadCount and list size correct ────────

    @Test
    void getMyNotifications_mixedReadUnread_correctCounts() {
        List<Notification> stored = List.of(
                notif("n1", "emp_1", false, Notification.NotificationType.TIMESHEET_APPROVED,
                        Notification.NotificationSection.TIMESHEET),
                notif("n2", "emp_1", false, Notification.NotificationType.TIMESHEET_REJECTED,
                        Notification.NotificationSection.TIMESHEET),
                notif("n3", "emp_1", true,  Notification.NotificationType.LEAVE_APPROVED,
                        Notification.NotificationSection.LEAVE),
                notif("n4", "emp_1", false, Notification.NotificationType.LEAVE_REJECTED,
                        Notification.NotificationSection.LEAVE)
        );
        when(notificationRepository.findTop20ByUserIdOrderByCreatedAtDesc("emp_1"))
                .thenReturn(stored);

        @SuppressWarnings("unchecked")
        Map<String, Object> result = notificationService.getMyNotifications("emp_1");

        assertThat((long) result.get("unreadCount")).isEqualTo(3L);
        @SuppressWarnings("unchecked")
        List<?> notifications = (List<?>) result.get("notifications");
        assertThat(notifications).hasSize(4);
    }

    // ── NS-04: getMyNotifications() — TEAM_TIMESHEET badge count ──────────────

    @Test
    void getMyNotifications_unreadTeamTimesheetNotification_badgeCountCorrect() {
        List<Notification> stored = List.of(
                notif("n1", "mgr_1", false, Notification.NotificationType.TIMESHEET_SUBMITTED,
                        Notification.NotificationSection.TEAM_TIMESHEET),
                notif("n2", "mgr_1", true,  Notification.NotificationType.TIMESHEET_SUBMITTED,
                        Notification.NotificationSection.TEAM_TIMESHEET)
        );
        when(notificationRepository.findTop20ByUserIdOrderByCreatedAtDesc("mgr_1"))
                .thenReturn(stored);

        @SuppressWarnings("unchecked")
        Map<String, Object> result = notificationService.getMyNotifications("mgr_1");

        @SuppressWarnings("unchecked")
        Map<String, Long> badges = (Map<String, Long>) result.get("badges");
        assertThat(badges.get("team_timesheets")).isEqualTo(1L);
        assertThat(badges.get("timesheets")).isEqualTo(0L);
        assertThat(badges.get("leaves")).isEqualTo(0L);
        assertThat(badges.get("team_leaves")).isEqualTo(0L);
    }

    // ── NS-05: getMyNotifications() — multiple sections, badge counts match ───

    @Test
    void getMyNotifications_multipleUnreadSections_eachBadgeCorrect() {
        List<Notification> stored = List.of(
                notif("n1", "u1", false, Notification.NotificationType.TIMESHEET_APPROVED,
                        Notification.NotificationSection.TIMESHEET),
                notif("n2", "u1", false, Notification.NotificationType.LEAVE_APPLIED,
                        Notification.NotificationSection.TEAM_LEAVE),
                notif("n3", "u1", false, Notification.NotificationType.LEAVE_APPLIED,
                        Notification.NotificationSection.TEAM_LEAVE)
        );
        when(notificationRepository.findTop20ByUserIdOrderByCreatedAtDesc("u1"))
                .thenReturn(stored);

        @SuppressWarnings("unchecked")
        Map<String, Object> result = notificationService.getMyNotifications("u1");

        @SuppressWarnings("unchecked")
        Map<String, Long> badges = (Map<String, Long>) result.get("badges");
        assertThat(badges.get("timesheets")).isEqualTo(1L);
        assertThat(badges.get("team_leaves")).isEqualTo(2L);
    }

    // ── NS-06: markAsRead() — wrong owner throws AccessDeniedException ─────────

    @Test
    void markAsRead_wrongOwner_throwsAccessDeniedException() {
        Notification n = notif("n1", "emp_1", false,
                Notification.NotificationType.TIMESHEET_APPROVED,
                Notification.NotificationSection.TIMESHEET);
        when(notificationRepository.findById("n1")).thenReturn(Optional.of(n));

        assertThatThrownBy(() -> notificationService.markAsRead("n1", "emp_OTHER"))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── NS-07: markAsRead() — not found throws ResourceNotFoundException ───────

    @Test
    void markAsRead_notFound_throwsResourceNotFoundException() {
        when(notificationRepository.findById("n_missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markAsRead("n_missing", "emp_1"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── NS-08: markSectionAsRead() — delegates to repository ─────────────────

    @Test
    void markSectionAsRead_callsRepositoryWithCorrectSection() {
        notificationService.markSectionAsRead("emp_1", "TIMESHEET");

        verify(notificationRepository).markAllAsReadByUserIdAndSection(
                "emp_1", Notification.NotificationSection.TIMESHEET);
    }
}
