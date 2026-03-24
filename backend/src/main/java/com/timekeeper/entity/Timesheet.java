package com.timekeeper.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "timesheets", uniqueConstraints = @UniqueConstraint(columnNames = {"employee_id", "week_start_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Timesheet {

    @Id
    @Column(length = 50)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", referencedColumnName = "id", nullable = false)
    private Employee employee;

    @Column(name = "week_start_date", nullable = false)
    private LocalDate weekStartDate;

    @Column(name = "week_end_date", nullable = false)
    private LocalDate weekEndDate;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private TimesheetStatus status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /** Set when a manager/admin approves or rejects the timesheet */
    @Column(name = "approved_by", length = 50)
    private String approvedBy;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @OneToMany(mappedBy = "timesheet", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<TimeEntry> entries;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = "ts_" + UUID.randomUUID().toString().substring(0, 8);
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = TimesheetStatus.DRAFT;
    }

    public enum TimesheetStatus {
        DRAFT, SUBMITTED, APPROVED, REJECTED
    }
}
