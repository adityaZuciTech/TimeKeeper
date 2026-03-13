package com.timekeeper.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "departments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Department {

    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private DepartmentStatus status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = "dep_" + UUID.randomUUID().toString().substring(0, 8);
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = DepartmentStatus.ACTIVE;
    }

    public enum DepartmentStatus {
        ACTIVE, INACTIVE
    }
}
