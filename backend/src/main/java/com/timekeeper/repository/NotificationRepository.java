package com.timekeeper.repository;

import com.timekeeper.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String> {

    List<Notification> findTop20ByUserIdOrderByCreatedAtDesc(String userId);

    long countByUserIdAndReadFalse(String userId);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.userId = :userId AND n.read = false")
    void markAllAsReadByUserId(@Param("userId") String userId);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.userId = :userId AND n.targetSection = :section AND n.read = false")
    void markAllAsReadByUserIdAndSection(@Param("userId") String userId, @Param("section") Notification.NotificationSection section);

    long countByUserIdAndReadFalseAndTargetSection(String userId, Notification.NotificationSection targetSection);
}
