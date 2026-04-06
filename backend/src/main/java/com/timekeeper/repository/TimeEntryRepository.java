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

    /**
     * Returns [projectId, SUM(hoursLogged), COUNT(DISTINCT employeeId)] per project for a given week.
     * Used by Project Effort List report (ADMIN scope).
     */
    @Query("""
            SELECT te.project.id,
                   COALESCE(SUM(te.hoursLogged), 0),
                   COUNT(DISTINCT t.employee.id)
            FROM TimeEntry te
            JOIN te.timesheet t
            WHERE t.weekStartDate = :weekStart
              AND te.entryType = 'WORK'
              AND te.project IS NOT NULL
            GROUP BY te.project.id
            """)
    List<Object[]> sumHoursByProjectForWeek(@Param("weekStart") LocalDate weekStart);

    /**
     * Manager-scoped variant — only includes contributions from the manager's direct reports.
     */
    @Query("""
            SELECT te.project.id,
                   COALESCE(SUM(te.hoursLogged), 0),
                   COUNT(DISTINCT t.employee.id)
            FROM TimeEntry te
            JOIN te.timesheet t
            JOIN t.employee e
            WHERE t.weekStartDate = :weekStart
              AND te.entryType = 'WORK'
              AND te.project IS NOT NULL
              AND e.managerId = :managerId
            GROUP BY te.project.id
            """)
    List<Object[]> sumHoursByProjectForWeekAndManager(@Param("managerId") String managerId,
                                                       @Param("weekStart") LocalDate weekStart);

    /**
     * Returns [employeeId, employeeName, SUM(hoursLogged)] per contributor for a project in a specific week.
     * Used by Project Detail report (ADMIN scope).
     */
    @Query("""
            SELECT e.id, e.name, COALESCE(SUM(te.hoursLogged), 0)
            FROM TimeEntry te
            JOIN te.timesheet t
            JOIN t.employee e
            WHERE te.project.id = :projectId
              AND t.weekStartDate = :weekStart
              AND te.entryType = 'WORK'
            GROUP BY e.id, e.name
            """)
    List<Object[]> sumHoursByEmployeeForProjectAndWeek(@Param("projectId") String projectId,
                                                        @Param("weekStart") LocalDate weekStart);

    /**
     * Manager-scoped variant of sumHoursByEmployeeForProjectAndWeek.
     */
    @Query("""
            SELECT e.id, e.name, COALESCE(SUM(te.hoursLogged), 0)
            FROM TimeEntry te
            JOIN te.timesheet t
            JOIN t.employee e
            WHERE te.project.id = :projectId
              AND t.weekStartDate = :weekStart
              AND te.entryType = 'WORK'
              AND e.managerId = :managerId
            GROUP BY e.id, e.name
            """)
    List<Object[]> sumHoursByEmployeeForProjectAndWeekAndManager(@Param("projectId") String projectId,
                                                                   @Param("managerId") String managerId,
                                                                   @Param("weekStart") LocalDate weekStart);

    /**
     * Returns [weekStartDate, SUM(hoursLogged)] per week for a project within a date range.
     * Used for 6-week trend in Project Detail (ADMIN scope).
     * Missing weeks are not returned — fill with zero in the service layer.
     */
    @Query("""
            SELECT t.weekStartDate, COALESCE(SUM(te.hoursLogged), 0)
            FROM TimeEntry te
            JOIN te.timesheet t
            WHERE te.project.id = :projectId
              AND te.entryType = 'WORK'
              AND t.weekStartDate >= :rangeStart
              AND t.weekStartDate <= :rangeEnd
            GROUP BY t.weekStartDate
            ORDER BY t.weekStartDate ASC
            """)
    List<Object[]> sumWeeklyHoursByProjectInRange(@Param("projectId") String projectId,
                                                   @Param("rangeStart") LocalDate rangeStart,
                                                   @Param("rangeEnd") LocalDate rangeEnd);

    /**
     * Manager-scoped variant of sumWeeklyHoursByProjectInRange.
     */
    @Query("""
            SELECT t.weekStartDate, COALESCE(SUM(te.hoursLogged), 0)
            FROM TimeEntry te
            JOIN te.timesheet t
            JOIN t.employee e
            WHERE te.project.id = :projectId
              AND te.entryType = 'WORK'
              AND t.weekStartDate >= :rangeStart
              AND t.weekStartDate <= :rangeEnd
              AND e.managerId = :managerId
            GROUP BY t.weekStartDate
            ORDER BY t.weekStartDate ASC
            """)
    List<Object[]> sumWeeklyHoursByProjectInRangeAndManager(@Param("projectId") String projectId,
                                                              @Param("managerId") String managerId,
                                                              @Param("rangeStart") LocalDate rangeStart,
                                                              @Param("rangeEnd") LocalDate rangeEnd);
}
