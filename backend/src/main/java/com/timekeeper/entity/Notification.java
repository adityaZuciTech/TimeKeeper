package com.timekeeper.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notifications_user_id", columnList = "user_id"),
    @Index(name = "idx_notifications_created_at", columnList = "created_at")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {

    @Id
    @Column(length = 50)
    private String id;

    /** Target user who receives this notification */
    @Column(name = "user_id", nullable = false, length = 50)
    private String userId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(nullable = false, length = 40)
    @Enumerated(EnumType.STRING)
    private NotificationType type;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean read = false;

    @Column(name = "target_section", length = 20, columnDefinition = "VARCHAR(20)")
    @Enumerated(EnumType.STRING)
    private NotificationSection targetSection;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = "ntf_" + UUID.randomUUID().toString().substring(0, 8);
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    public enum NotificationType {
        TIMESHEET_SUBMITTED,
        TIMESHEET_APPROVED,
        TIMESHEET_REJECTED,
        LEAVE_APPLIED,
        LEAVE_APPROVED,
        LEAVE_REJECTED
    }

    public enum NotificationSection {
        TIMESHEET,       // Personal timesheet outcomes (approved/rejected) — received by the employee
        TEAM_TIMESHEET,  // Team timesheet submissions — received by the manager at /team
        LEAVE,           // Personal leave outcomes (approved/rejected) — received by the employee
        TEAM_LEAVE,      // Team leave requests — received by the manager at /leaves/team
        TEAM             // Legacy; no new notifications are created with this value
    }
}
