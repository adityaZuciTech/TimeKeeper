package com.timekeeper.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.timekeeper.dto.request.AddTimeEntryRequest;
import com.timekeeper.dto.request.CreateTimesheetRequest;
import com.timekeeper.dto.request.LoginRequest;
import com.timekeeper.dto.request.SaveOvertimeCommentRequest;
import com.timekeeper.entity.*;
import com.timekeeper.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

import org.hamcrest.Matchers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests addressing gaps G-02 (saveOvertimeComment), G-06/G-07
 * (manager/cross-employee access), O-07 (totalOvertimeHours in response),
 * and CL-03 (copy-last-week happy path via HTTP).
 *
 * All tests run inside @Transactional — H2 in-memory, rolled back after each.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TimesheetOvertimeIntegrationTest {

    @Autowired MockMvc         mockMvc;
    @Autowired ObjectMapper    objectMapper;
    @Autowired EmployeeRepository  employeeRepository;
    @Autowired TimesheetRepository timesheetRepository;
    @Autowired TimeEntryRepository timeEntryRepository;
    @Autowired ProjectRepository   projectRepository;
    @Autowired PasswordEncoder     passwordEncoder;
    @MockBean  JavaMailSender      javaMailSender;

    // Unique IDs prevent collisions with other integration tests in the same H2 DB
    private static final String EMP_ID    = "ot_int_emp_001";
    private static final String MGR_ID    = "ot_int_mgr_001";
    private static final String PROJ_ID   = "ot_int_proj_001";
    private static final String EMP_EMAIL = "ot.int.emp@example.com";
    private static final String MGR_EMAIL = "ot.int.mgr@example.com";
    private static final String PASSWORD  = "testPass#1";

    // Use a fixed Monday in the past to avoid clock-skew issues
    private static final LocalDate WEEK_MON = LocalDate.of(2020, 2, 17); // Monday
    private static final LocalDate WEEK_FRI = LocalDate.of(2020, 2, 21); // Friday

    // Previous week's Monday — for copy-last-week tests
    private static final LocalDate PREV_MON = LocalDate.of(2020, 2, 10);
    private static final LocalDate PREV_FRI = LocalDate.of(2020, 2, 14);

    @BeforeEach
    void setUp() {
        Employee manager = new Employee();
        manager.setId(MGR_ID);
        manager.setName("OT Integration Manager");
        manager.setEmail(MGR_EMAIL);
        manager.setPassword(passwordEncoder.encode(PASSWORD));
        manager.setRole(Employee.Role.MANAGER);
        manager.setStatus(Employee.EmployeeStatus.ACTIVE);
        employeeRepository.save(manager);

        Employee employee = new Employee();
        employee.setId(EMP_ID);
        employee.setName("OT Integration Employee");
        employee.setEmail(EMP_EMAIL);
        employee.setPassword(passwordEncoder.encode(PASSWORD));
        employee.setRole(Employee.Role.EMPLOYEE);
        employee.setStatus(Employee.EmployeeStatus.ACTIVE);
        employee.setManagerId(MGR_ID);
        employeeRepository.save(employee);

        Project project = new Project();
        project.setId(PROJ_ID);
        project.setName("Integration Active Project");
        project.setStatus(Project.ProjectStatus.ACTIVE);
        projectRepository.save(project);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // O-07: totalOvertimeHours exposed in GET /{timesheetId} response
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void getTimesheetById_withOvertimeEntry_exposesTotalOvertimeHours() throws Exception {
        String empToken = loginAndGetToken(EMP_EMAIL, PASSWORD);

        // Create timesheet for the week
        String tsId = createTimesheet(empToken, WEEK_MON);

        // Add a 10h work entry (Mon 07:00–17:00) → should produce 2h overtime
        addWorkEntry(empToken, tsId, "MONDAY",
                LocalTime.of(7, 0), LocalTime.of(17, 0), PROJ_ID);

        mockMvc.perform(get("/api/v1/timesheets/" + tsId)
                        .header("Authorization", "Bearer " + empToken))
                .andExpect(status().isOk())
                // totalOvertimeHours is serialised as a JSON decimal number; compare as double
                .andExpect(jsonPath("$.data.totalOvertimeHours").isNumber())
                .andExpect(jsonPath("$.data.totalOvertimeHours", Matchers.greaterThan(0.0)));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // C-01: saveOvertimeComment — happy path via HTTP PATCH
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void saveOvertimeComment_draftTimesheetByOwner_returns200WithComment() throws Exception {
        String empToken = loginAndGetToken(EMP_EMAIL, PASSWORD);
        String tsId = createTimesheet(empToken, WEEK_MON);

        // Add overtime entry first (comment endpoint requires OT > 0 at service level?
        // Actually service doesn't enforce OT > 0 — just status check. Test the endpoint directly.)

        SaveOvertimeCommentRequest req = new SaveOvertimeCommentRequest();
        req.setDay(TimeEntry.DayOfWeek.MONDAY);
        req.setComment("Extended hours for client demo");

        mockMvc.perform(patch("/api/v1/timesheets/" + tsId + "/overtime-comment")
                        .header("Authorization", "Bearer " + empToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // C-03: saveOvertimeComment on SUBMITTED timesheet → 400
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void saveOvertimeComment_submittedTimesheet_returns400() throws Exception {
        String empToken = loginAndGetToken(EMP_EMAIL, PASSWORD);
        Employee emp = employeeRepository.findById(EMP_ID).orElseThrow();

        // Create and persist a SUBMITTED timesheet directly
        Timesheet ts = submittedTimesheetFor(emp, WEEK_MON, "ot_submitted_ts");
        timesheetRepository.save(ts);

        SaveOvertimeCommentRequest req = new SaveOvertimeCommentRequest();
        req.setDay(TimeEntry.DayOfWeek.TUESDAY);
        req.setComment("Should not be saved");

        mockMvc.perform(patch("/api/v1/timesheets/ot_submitted_ts/overtime-comment")
                        .header("Authorization", "Bearer " + empToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // T-06: Manager can view employee's timesheet (GET /{id})
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void getTimesheetById_byManager_returns200() throws Exception {
        String empToken = loginAndGetToken(EMP_EMAIL, PASSWORD);
        String mgrToken = loginAndGetToken(MGR_EMAIL, PASSWORD);

        String tsId = createTimesheet(empToken, WEEK_MON);

        mockMvc.perform(get("/api/v1/timesheets/" + tsId)
                        .header("Authorization", "Bearer " + mgrToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.employeeId").value(EMP_ID));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // T-07: Employee cannot view another employee's timesheet → 403
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void getTimesheetById_byDifferentEmployee_returns403() throws Exception {
        // Create a second employee
        Employee other = new Employee();
        other.setId("ot_int_other_001");
        other.setName("Other Employee");
        other.setEmail("ot.other@example.com");
        other.setPassword(passwordEncoder.encode(PASSWORD));
        other.setRole(Employee.Role.EMPLOYEE);
        other.setStatus(Employee.EmployeeStatus.ACTIVE);
        employeeRepository.save(other);

        // Create timesheet owned by the MAIN employee
        String empToken = loginAndGetToken(EMP_EMAIL, PASSWORD);
        String tsId = createTimesheet(empToken, WEEK_MON);

        // Log in as the OTHER employee and try to access it
        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmail("ot.other@example.com");
        loginReq.setPassword(PASSWORD);
        String otherBody = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andReturn().getResponse().getContentAsString();
        String otherToken = objectMapper.readTree(otherBody).path("data").path("token").asText();

        mockMvc.perform(get("/api/v1/timesheets/" + tsId)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isForbidden());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CL-03: Copy last week via HTTP — copiedCount = 1
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void copyLastWeek_withPreviousWeekEntries_returns200WithCopiedCount1() throws Exception {
        String empToken = loginAndGetToken(EMP_EMAIL, PASSWORD);

        // Create PREVIOUS week's timesheet and add a work entry
        String prevTsId = createTimesheet(empToken, PREV_MON);
        addWorkEntry(empToken, prevTsId, "MONDAY",
                LocalTime.of(9, 0), LocalTime.of(17, 0), PROJ_ID);

        // Create TARGET week's timesheet (empty)
        String tgtTsId = createTimesheet(empToken, WEEK_MON);

        // Execute copy
        mockMvc.perform(post("/api/v1/timesheets/" + tgtTsId + "/copy-last-week")
                        .header("Authorization", "Bearer " + empToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.copySummary.copiedCount").value(1))
                .andExpect(jsonPath("$.data.copySummary.skippedCount").value(0));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CL-09: Dry-run via HTTP (?dryRun=true) does not persist entries
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void copyLastWeekDryRun_doesNotPersistEntries() throws Exception {
        String empToken = loginAndGetToken(EMP_EMAIL, PASSWORD);

        // Create PREVIOUS week timesheet with a work entry
        String prevTsId = createTimesheet(empToken, PREV_MON);
        addWorkEntry(empToken, prevTsId, "TUESDAY",
                LocalTime.of(9, 0), LocalTime.of(17, 0), PROJ_ID);

        // Create TARGET week timesheet (empty)
        String tgtTsId = createTimesheet(empToken, WEEK_MON);

        // Dry-run preview — should return pending but not persist
        mockMvc.perform(post("/api/v1/timesheets/" + tgtTsId + "/copy-last-week?dryRun=true")
                        .header("Authorization", "Bearer " + empToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.copySummary.pendingEntries").isArray())
                .andExpect(jsonPath("$.data.copySummary.pendingEntries.length()").value(1));

        // Verify target has still 0 work entries after dry-run
        long workEntryCount = timeEntryRepository.findByTimesheetId(tgtTsId).stream()
                .filter(e -> e.getEntryType() == TimeEntry.EntryType.WORK)
                .count();
        org.assertj.core.api.Assertions.assertThat(workEntryCount)
                .as("dry-run must not persist any entries to the DB")
                .isZero();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private String loginAndGetToken(String email, String password) throws Exception {
        LoginRequest req = new LoginRequest();
        req.setEmail(email);
        req.setPassword(password);
        String body = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).path("data").path("token").asText();
    }

    private String createTimesheet(String token, LocalDate weekStart) throws Exception {
        CreateTimesheetRequest req = new CreateTimesheetRequest();
        req.setWeekStartDate(weekStart);
        String body = mockMvc.perform(post("/api/v1/timesheets")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).path("data").path("id").asText();
    }

    private void addWorkEntry(String token, String tsId, String dayName,
                               LocalTime start, LocalTime end, String projectId) throws Exception {
        AddTimeEntryRequest req = new AddTimeEntryRequest();
        req.setDay(TimeEntry.DayOfWeek.valueOf(dayName));
        req.setEntryType(TimeEntry.EntryType.WORK);
        req.setProjectId(projectId);
        req.setStartTime(start);
        req.setEndTime(end);
        mockMvc.perform(post("/api/v1/timesheets/" + tsId + "/entries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
    }

    private Timesheet submittedTimesheetFor(Employee emp, LocalDate weekStart, String id) {
        Timesheet ts = new Timesheet();
        ts.setId(id);
        ts.setEmployee(emp);
        ts.setWeekStartDate(weekStart);
        ts.setWeekEndDate(weekStart.plusDays(4));
        ts.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        return ts;
    }
}
