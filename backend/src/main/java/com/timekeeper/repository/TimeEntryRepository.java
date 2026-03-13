package com.timekeeper.repository;

import com.timekeeper.entity.TimeEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TimeEntryRepository extends JpaRepository<TimeEntry, String> {
    List<TimeEntry> findByTimesheetId(String timesheetId);
    List<TimeEntry> findByTimesheetIdAndDay(String timesheetId, TimeEntry.DayOfWeek day);

    @Query("SELECT SUM(te.hoursLogged) FROM TimeEntry te WHERE te.timesheet.id = :timesheetId AND te.day = :day AND te.entryType = 'WORK'")
    java.math.BigDecimal sumHoursLoggedByTimesheetIdAndDay(@Param("timesheetId") String timesheetId,
                                                           @Param("day") TimeEntry.DayOfWeek day);

    @Query("SELECT SUM(te.hoursLogged) FROM TimeEntry te WHERE te.timesheet.id = :timesheetId AND te.entryType = 'WORK'")
    java.math.BigDecimal sumHoursLoggedByTimesheetId(@Param("timesheetId") String timesheetId);

    @Query("SELECT SUM(te.hoursLogged) FROM TimeEntry te WHERE te.project.id = :projectId AND te.entryType = 'WORK'")
    java.math.BigDecimal sumHoursLoggedByProjectId(@Param("projectId") String projectId);

    @Query("SELECT te FROM TimeEntry te WHERE te.project.id = :projectId AND te.entryType = 'WORK'")
    List<TimeEntry> findByProjectId(@Param("projectId") String projectId);
}
