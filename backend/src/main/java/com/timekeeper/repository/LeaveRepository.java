package com.timekeeper.repository;

import com.timekeeper.entity.Leave;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRepository extends JpaRepository<Leave, String> {

    List<Leave> findByEmployeeIdOrderByCreatedAtDesc(String employeeId);

    @Query("SELECT l FROM Leave l WHERE l.employee.managerId = :managerId ORDER BY l.createdAt DESC")
    List<Leave> findTeamLeavesByManagerId(@Param("managerId") String managerId);

    @Query("SELECT l FROM Leave l WHERE l.employee.id = :employeeId " +
           "AND l.status IN ('PENDING', 'APPROVED') " +
           "AND l.startDate <= :endDate AND l.endDate >= :startDate")
    List<Leave> findPendingOrApprovedOverlapping(@Param("employeeId") String employeeId,
                                                  @Param("startDate") LocalDate startDate,
                                                  @Param("endDate") LocalDate endDate);

    @Query("SELECT l FROM Leave l WHERE l.employee.id = :employeeId " +
           "AND l.status = 'APPROVED' " +
           "AND l.startDate <= :weekEnd AND l.endDate >= :weekStart")
    List<Leave> findApprovedLeavesForWeek(@Param("employeeId") String employeeId,
                                           @Param("weekStart") LocalDate weekStart,
                                           @Param("weekEnd") LocalDate weekEnd);
}
