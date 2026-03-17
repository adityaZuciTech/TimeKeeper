package com.timekeeper.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "leaves")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Leave {

    @Id
    @Column(length = 50)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", referencedColumnName = "id", nullable = false)
    private Employee employee;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "leave_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private LeaveType leaveType;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private LeaveStatus status;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "approved_by", length = 50)
    private String approvedBy;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = "lv_" + UUID.randomUUID().toString().substring(0, 8);
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = LeaveStatus.PENDING;
    }

    public enum LeaveType {
        SICK, CASUAL, VACATION
    }

    public enum LeaveStatus {
        PENDING, APPROVED, REJECTED
    }
}
