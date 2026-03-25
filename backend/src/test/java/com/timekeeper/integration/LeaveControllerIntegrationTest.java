package com.timekeeper.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.timekeeper.dto.request.CreateLeaveRequest;
import com.timekeeper.dto.request.LoginRequest;
import com.timekeeper.entity.Employee;
import com.timekeeper.entity.Leave;
import com.timekeeper.repository.EmployeeRepository;
import com.timekeeper.repository.LeaveRepository;
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
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class LeaveControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired EmployeeRepository employeeRepository;
    @Autowired LeaveRepository leaveRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @MockBean JavaMailSender javaMailSender;

    private static final String EMP_ID    = "lv_emp_001";
    private static final String MGR_ID    = "lv_mgr_001";
    private static final String EMP_EMAIL = "lv_employee@example.com";
    private static final String MGR_EMAIL = "lv_manager@example.com";
    private static final String PASSWORD  = "password123";

    @BeforeEach
    void setUp() {
        Employee manager = new Employee();
        manager.setId(MGR_ID);
        manager.setName("Leave Manager");
        manager.setEmail(MGR_EMAIL);
        manager.setPassword(passwordEncoder.encode(PASSWORD));
        manager.setRole(Employee.Role.MANAGER);
        manager.setStatus(Employee.EmployeeStatus.ACTIVE);
        employeeRepository.save(manager);

        Employee employee = new Employee();
        employee.setId(EMP_ID);
        employee.setName("Leave Employee");
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

    // ── LC-01: employee applies leave → 201 PENDING ───────────────────────────
    @Test
    void applyLeave_validRequest_returns201WithPendingStatus() throws Exception {
        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        CreateLeaveRequest req = new CreateLeaveRequest();
        req.setStartDate(LocalDate.of(2025, 6, 16));
        req.setEndDate(LocalDate.of(2025, 6, 18));
        req.setLeaveType(Leave.LeaveType.SICK);
        req.setReason("Feeling unwell");

        mockMvc.perform(post("/api/v1/leaves")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.leaveType").value("SICK"));
    }

    // ── LC-02: unauthenticated apply → 401 ────────────────────────────────────
    @Test
    void applyLeave_unauthenticated_returns401() throws Exception {
        CreateLeaveRequest req = new CreateLeaveRequest();
        req.setStartDate(LocalDate.of(2025, 6, 16));
        req.setEndDate(LocalDate.of(2025, 6, 18));
        req.setLeaveType(Leave.LeaveType.CASUAL);

        mockMvc.perform(post("/api/v1/leaves")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ── LC-03: get own leaves → 200 with "leaves" array ──────────────────────
    @Test
    void getMyLeaves_authenticated_returns200WithLeavesArray() throws Exception {
        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        mockMvc.perform(get("/api/v1/leaves/my")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.leaves").isArray());
    }

    // ── LC-04: manager gets team leaves → 200 with "leaves" array ────────────
    @Test
    void getTeamLeaves_manager_returns200WithLeavesArray() throws Exception {
        String token = loginAndGetToken(MGR_EMAIL, PASSWORD);

        mockMvc.perform(get("/api/v1/leaves/team")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.leaves").isArray());
    }

    // ── LC-05: employee attempts to view team leaves → 403 ───────────────────
    @Test
    void getTeamLeaves_employee_returns403() throws Exception {
        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        mockMvc.perform(get("/api/v1/leaves/team")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ── LC-06: manager approves pending leave → 200 APPROVED ─────────────────
    @Test
    void approveLeave_byManager_returns200Approved() throws Exception {
        Employee employee = employeeRepository.findById(EMP_ID).orElseThrow();
        Leave leave = new Leave();
        leave.setId("lv_test_approve");
        leave.setEmployee(employee);
        leave.setStartDate(LocalDate.of(2025, 7, 7));
        leave.setEndDate(LocalDate.of(2025, 7, 8));
        leave.setLeaveType(Leave.LeaveType.CASUAL);
        leave.setStatus(Leave.LeaveStatus.PENDING);
        leaveRepository.save(leave);

        String token = loginAndGetToken(MGR_EMAIL, PASSWORD);

        mockMvc.perform(patch("/api/v1/leaves/lv_test_approve/approve")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
    }

    // ── LC-07: manager rejects pending leave with note → 200 REJECTED ─────────
    @Test
    void rejectLeave_byManager_withNote_returns200Rejected() throws Exception {
        Employee employee = employeeRepository.findById(EMP_ID).orElseThrow();
        Leave leave = new Leave();
        leave.setId("lv_test_reject");
        leave.setEmployee(employee);
        leave.setStartDate(LocalDate.of(2025, 8, 4));
        leave.setEndDate(LocalDate.of(2025, 8, 6));
        leave.setLeaveType(Leave.LeaveType.VACATION);
        leave.setStatus(Leave.LeaveStatus.PENDING);
        leaveRepository.save(leave);

        String token = loginAndGetToken(MGR_EMAIL, PASSWORD);

        mockMvc.perform(patch("/api/v1/leaves/lv_test_reject/reject")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("note", "Team is fully booked during this period"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("REJECTED"));
    }

    // ── LC-08: employee attempts to approve leave → 403 ──────────────────────
    @Test
    void approveLeave_byEmployee_returns403() throws Exception {
        Employee employee = employeeRepository.findById(EMP_ID).orElseThrow();
        Leave leave = new Leave();
        leave.setId("lv_test_emp_deny");
        leave.setEmployee(employee);
        leave.setStartDate(LocalDate.of(2025, 9, 1));
        leave.setEndDate(LocalDate.of(2025, 9, 3));
        leave.setLeaveType(Leave.LeaveType.SICK);
        leave.setStatus(Leave.LeaveStatus.PENDING);
        leaveRepository.save(leave);

        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        mockMvc.perform(patch("/api/v1/leaves/lv_test_emp_deny/approve")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }
}
