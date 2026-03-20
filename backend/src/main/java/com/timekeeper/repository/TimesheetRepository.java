package com.timekeeper.repository;

import com.timekeeper.entity.Employee;
import com.timekeeper.entity.Timesheet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TimesheetRepository extends JpaRepository<Timesheet, String> {
    List<Timesheet> findByEmployeeIdOrderByWeekStartDateDesc(String employeeId);
    Optional<Timesheet> findByEmployeeIdAndWeekStartDate(String employeeId, LocalDate weekStartDate);

    @Query("SELECT t FROM Timesheet t WHERE t.employee.id = :employeeId ORDER BY t.weekStartDate DESC")
    List<Timesheet> findTop5ByEmployeeIdOrderByWeekStartDateDesc(@Param("employeeId") String employeeId,
                                                                   Pageable pageable);

    Page<Timesheet> findByEmployeeId(String employeeId, Pageable pageable);

    List<Timesheet> findByStatusAndWeekEndDateBefore(Timesheet.TimesheetStatus status, LocalDate date);

    @Query("SELECT t FROM Timesheet t WHERE t.employee.managerId = :managerId AND t.weekStartDate = :weekStartDate")
    List<Timesheet> findTeamTimesheetsByManagerIdAndWeek(@Param("managerId") String managerId,
                                                          @Param("weekStartDate") LocalDate weekStartDate);

    /**
     * Returns all active employees who do NOT have a SUBMITTED or APPROVED timesheet
     * for the given week start date.
     */
    @Query("""
            SELECT e FROM Employee e
            WHERE e.status = 'ACTIVE'
            AND e.id NOT IN (
                SELECT t.employee.id FROM Timesheet t
                WHERE t.weekStartDate = :weekStart
                AND t.status IN ('SUBMITTED', 'APPROVED')
            )
            """)
    List<Employee> findEmployeesWithoutSubmittedTimesheetForWeek(@Param("weekStart") LocalDate weekStart);
}
