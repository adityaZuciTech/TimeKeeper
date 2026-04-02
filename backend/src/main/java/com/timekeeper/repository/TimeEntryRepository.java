package com.timekeeper.repository;

import com.timekeeper.entity.TimeEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Repository
public interface TimeEntryRepository extends JpaRepository<TimeEntry, String> {
    List<TimeEntry> findByTimesheetId(String timesheetId);

    /** Batch-load entries for multiple timesheets in a single query — used by list/summary endpoints. */
    List<TimeEntry> findByTimesheetIdIn(Collection<String> timesheetIds);

    List<TimeEntry> findByTimesheetIdAndDay(String timesheetId, TimeEntry.DayOfWeek day);

    @Query("SELECT SUM(te.hoursLogged) FROM TimeEntry te WHERE te.timesheet.id = :timesheetId AND te.day = :day AND te.entryType = 'WORK'")
    BigDecimal sumHoursLoggedByTimesheetIdAndDay(@Param("timesheetId") String timesheetId,
                                                 @Param("day") TimeEntry.DayOfWeek day);

    @Query("SELECT SUM(te.hoursLogged) FROM TimeEntry te WHERE te.timesheet.id = :timesheetId AND te.entryType = 'WORK'")
    BigDecimal sumHoursLoggedByTimesheetId(@Param("timesheetId") String timesheetId);

    @Query("SELECT SUM(te.hoursLogged) FROM TimeEntry te WHERE te.project.id = :projectId AND te.entryType = 'WORK'")
    BigDecimal sumHoursLoggedByProjectId(@Param("projectId") String projectId);

    @Query("SELECT te FROM TimeEntry te WHERE te.project.id = :projectId AND te.entryType = 'WORK'")
    List<TimeEntry> findByProjectId(@Param("projectId") String projectId);

    /**
     * Returns [departmentId, SUM(hoursLogged)] for all departments for a given week.
     * Single aggregate query — replaces O(N×M) loop.
     */
    @Query("""
            SELECT e.department.id, COALESCE(SUM(te.hoursLogged), 0)
            FROM TimeEntry te
            JOIN te.timesheet t
            JOIN t.employee e
            WHERE t.weekStartDate = :weekStart
              AND te.entryType = 'WORK'
              AND e.department IS NOT NULL
            GROUP BY e.department.id
            """)
    List<Object[]> sumHoursByDepartmentForWeek(@Param("weekStart") LocalDate weekStart);

    /**
     * Returns [employeeId, employeeName, SUM(hoursLogged)] per contributor for a project.
     * Single aggregate query — replaces loading all entries into memory.
     */
    @Query("""
            SELECT e.id, e.name, COALESCE(SUM(te.hoursLogged), 0)
            FROM TimeEntry te
            JOIN te.timesheet t
            JOIN t.employee e
            WHERE te.project.id = :projectId
              AND te.entryType = 'WORK'
            GROUP BY e.id, e.name
            """)
    List<Object[]> sumHoursByEmployeeForProject(@Param("projectId") String projectId);

    /**
     * Returns [employeeId, SUM(hoursLogged)] for all employees in a manager's team for a given week.
     */
    @Query("""
            SELECT e.id, COALESCE(SUM(te.hoursLogged), 0)
            FROM TimeEntry te
            JOIN te.timesheet t
            JOIN t.employee e
            WHERE e.managerId = :managerId
              AND t.weekStartDate = :weekStart
              AND te.entryType = 'WORK'
            GROUP BY e.id
            """)
    List<Object[]> sumHoursByTeamMemberForWeek(@Param("managerId") String managerId,
                                                @Param("weekStart") LocalDate weekStart);
}
