package com.timekeeper.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.timekeeper.dto.request.CreateTimesheetRequest;
import com.timekeeper.dto.request.LoginRequest;
import com.timekeeper.entity.Employee;
import com.timekeeper.entity.Timesheet;
import com.timekeeper.repository.EmployeeRepository;
import com.timekeeper.repository.TimesheetRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TimesheetControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired EmployeeRepository employeeRepository;
    @Autowired TimesheetRepository timesheetRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @MockBean JavaMailSender javaMailSender;

    private static final String EMP_ID      = "ts_emp_001";
    private static final String MGR_ID      = "ts_mgr_001";
    private static final String ADMIN_ID    = "ts_admin_001";
    private static final String EMP_EMAIL   = "ts_employee@example.com";
    private static final String MGR_EMAIL   = "ts_manager@example.com";
    private static final String ADMIN_EMAIL = "ts_admin@example.com";
    private static final String PASSWORD    = "password123";

    // A past Monday for deterministic week start
    private static final LocalDate WEEK_MON_JAN6  = LocalDate.of(2020, 1, 6);
    private static final LocalDate WEEK_MON_JAN13 = LocalDate.of(2020, 1, 13);
    private static final LocalDate WEEK_MON_JAN20 = LocalDate.of(2020, 1, 20);
    private static final LocalDate WEEK_MON_FEB3  = LocalDate.of(2020, 2, 3);

    @BeforeEach
    void setUp() {
        Employee manager = new Employee();
        manager.setId(MGR_ID);
        manager.setName("TS Manager");
        manager.setEmail(MGR_EMAIL);
        manager.setPassword(passwordEncoder.encode(PASSWORD));
        manager.setRole(Employee.Role.MANAGER);
        manager.setStatus(Employee.EmployeeStatus.ACTIVE);
        employeeRepository.save(manager);

        Employee admin = new Employee();
        admin.setId(ADMIN_ID);
        admin.setName("TS Admin");
        admin.setEmail(ADMIN_EMAIL);
        admin.setPassword(passwordEncoder.encode(PASSWORD));
        admin.setRole(Employee.Role.ADMIN);
        admin.setStatus(Employee.EmployeeStatus.ACTIVE);
        employeeRepository.save(admin);

        Employee employee = new Employee();
        employee.setId(EMP_ID);
        employee.setName("TS Employee");
        employee.setEmail(EMP_EMAIL);
        employee.setPassword(passwordEncoder.encode(PASSWORD));
        employee.setRole(Employee.Role.EMPLOYEE);
        employee.setStatus(Employee.EmployeeStatus.ACTIVE);
        employee.setManagerId(MGR_ID);
        employeeRepository.save(employee);
    }

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

    // ── TS-INT-01: create timesheet → 201 DRAFT ──────────────────────────────
    @Test
    void createTimesheet_validWeekDate_returns201Draft() throws Exception {
        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        CreateTimesheetRequest req = new CreateTimesheetRequest();
        req.setWeekStartDate(WEEK_MON_JAN6);

        mockMvc.perform(post("/api/v1/timesheets")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.employeeId").value(EMP_ID));
    }

    // ── TS-INT-02: unauthenticated create → 401 ───────────────────────────────
    @Test
    void createTimesheet_unauthenticated_returns401() throws Exception {
        CreateTimesheetRequest req = new CreateTimesheetRequest();
        req.setWeekStartDate(WEEK_MON_JAN6);

        mockMvc.perform(post("/api/v1/timesheets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ── TS-INT-03: creating timesheet for the same week is idempotent ─────────
    @Test
    void createTimesheet_sameWeekTwice_returnsExistingTimesheet() throws Exception {
        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        CreateTimesheetRequest req = new CreateTimesheetRequest();
        req.setWeekStartDate(WEEK_MON_JAN13);

        String firstBody = mockMvc.perform(post("/api/v1/timesheets")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String firstId = objectMapper.readTree(firstBody).path("data").path("id").asText();

        String secondBody = mockMvc.perform(post("/api/v1/timesheets")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String secondId = objectMapper.readTree(secondBody).path("data").path("id").asText();

        assertThat(firstId).isEqualTo(secondId);
    }

    // ── TS-INT-04: get own timesheets → 200 with timesheets array ─────────────
    @Test
    void getMyTimesheets_authenticated_returns200WithTimesheetsArray() throws Exception {
        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        mockMvc.perform(get("/api/v1/timesheets/my")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.timesheets").isArray());
    }

    // ── TS-INT-05: submit empty timesheet → 400 BusinessException ─────────────
    @Test
    void submitTimesheet_empty_returns400() throws Exception {
        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        // Create a DRAFT timesheet via API
        CreateTimesheetRequest req = new CreateTimesheetRequest();
        req.setWeekStartDate(WEEK_MON_FEB3);

        String createBody = mockMvc.perform(post("/api/v1/timesheets")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String timesheetId = objectMapper.readTree(createBody).path("data").path("id").asText();

        // Submitting empty timesheet → 400
        mockMvc.perform(post("/api/v1/timesheets/" + timesheetId + "/submit")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ── TS-INT-06: admin approves a submitted timesheet → 200 APPROVED ────────
    @Test
    void approveTimesheet_byAdmin_returns200Approved() throws Exception {
        Employee employee = employeeRepository.findById(EMP_ID).orElseThrow();

        Timesheet ts = new Timesheet();
        ts.setId("ts_int_approve");
        ts.setEmployee(employee);
        ts.setWeekStartDate(WEEK_MON_JAN6);
        ts.setWeekEndDate(WEEK_MON_JAN6.plusDays(6));
        ts.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        timesheetRepository.save(ts);

        String adminToken = loginAndGetToken(ADMIN_EMAIL, PASSWORD);

        mockMvc.perform(post("/api/v1/timesheets/ts_int_approve/approve")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
    }

    // ── TS-INT-07: manager rejects submitted timesheet with reason → 200 ──────
    @Test
    void rejectTimesheet_byManager_withReason_returns200Rejected() throws Exception {
        Employee employee = employeeRepository.findById(EMP_ID).orElseThrow();

        Timesheet ts = new Timesheet();
        ts.setId("ts_int_reject");
        ts.setEmployee(employee);
        ts.setWeekStartDate(WEEK_MON_JAN13);
        ts.setWeekEndDate(WEEK_MON_JAN13.plusDays(6));
        ts.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        timesheetRepository.save(ts);

        String managerToken = loginAndGetToken(MGR_EMAIL, PASSWORD);

        mockMvc.perform(post("/api/v1/timesheets/ts_int_reject/reject")
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Hours logged are insufficient\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("REJECTED"))
                .andExpect(jsonPath("$.data.rejectionReason").value("Hours logged are insufficient"));
    }

    // ── TS-INT-08: employee attempts to approve → 403 ─────────────────────────
    @Test
    void approveTimesheet_byEmployee_returns403() throws Exception {
        Employee employee = employeeRepository.findById(EMP_ID).orElseThrow();

        Timesheet ts = new Timesheet();
        ts.setId("ts_int_emp_deny");
        ts.setEmployee(employee);
        ts.setWeekStartDate(WEEK_MON_JAN20);
        ts.setWeekEndDate(WEEK_MON_JAN20.plusDays(6));
        ts.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        timesheetRepository.save(ts);

        String employeeToken = loginAndGetToken(EMP_EMAIL, PASSWORD);

        mockMvc.perform(post("/api/v1/timesheets/ts_int_emp_deny/approve")
                        .header("Authorization", "Bearer " + employeeToken))
                .andExpect(status().isForbidden());
    }

    // ── TS-INT-09: reject without a reason → 400 BusinessException ───────────
    @Test
    void rejectTimesheet_withoutReason_returns400() throws Exception {
        Employee employee = employeeRepository.findById(EMP_ID).orElseThrow();

        Timesheet ts = new Timesheet();
        ts.setId("ts_int_no_reason");
        ts.setEmployee(employee);
        ts.setWeekStartDate(LocalDate.of(2020, 2, 10));
        ts.setWeekEndDate(LocalDate.of(2020, 2, 10).plusDays(6));
        ts.setStatus(Timesheet.TimesheetStatus.SUBMITTED);
        timesheetRepository.save(ts);

        String managerToken = loginAndGetToken(MGR_EMAIL, PASSWORD);

        mockMvc.perform(post("/api/v1/timesheets/ts_int_no_reason/reject")
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
