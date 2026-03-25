package com.timekeeper.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.timekeeper.dto.request.LoginRequest;
import com.timekeeper.entity.Employee;
import com.timekeeper.entity.Notification;
import com.timekeeper.repository.EmployeeRepository;
import com.timekeeper.repository.NotificationRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class NotificationControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired EmployeeRepository employeeRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @MockBean JavaMailSender javaMailSender;

    private static final String EMP_ID    = "ntf_emp_001";
    private static final String EMP_EMAIL = "ntf_employee@example.com";
    private static final String PASSWORD  = "password123";

    @BeforeEach
    void setUp() {
        Employee employee = new Employee();
        employee.setId(EMP_ID);
        employee.setName("Notif Employee");
        employee.setEmail(EMP_EMAIL);
        employee.setPassword(passwordEncoder.encode(PASSWORD));
        employee.setRole(Employee.Role.EMPLOYEE);
        employee.setStatus(Employee.EmployeeStatus.ACTIVE);
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

    private Notification createUnreadNotification(String id, Notification.NotificationSection section) {
        Notification n = new Notification();
        n.setId(id);
        n.setUserId(EMP_ID);
        n.setTitle("Test Notification");
        n.setMessage("You have a test notification");
        n.setType(Notification.NotificationType.LEAVE_APPROVED);
        n.setTargetSection(section);
        n.setRead(false);
        return notificationRepository.save(n);
    }

    // ── NTF-01: authenticated user gets own notifications → 200 ──────────────
    @Test
    void getMyNotifications_authenticated_returns200WithDataMap() throws Exception {
        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        mockMvc.perform(get("/api/v1/notifications/my")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isMap());
    }

    // ── NTF-02: unauthenticated → 401 ─────────────────────────────────────────
    @Test
    void getMyNotifications_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/notifications/my"))
                .andExpect(status().isUnauthorized());
    }

    // ── NTF-03: mark single notification as read → 200 ────────────────────────
    @Test
    void markAsRead_ownNotification_returns200() throws Exception {
        createUnreadNotification("ntf_read_001", Notification.NotificationSection.LEAVE);

        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        mockMvc.perform(patch("/api/v1/notifications/ntf_read_001/read")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.read").value(true));
    }

    // ── NTF-04: mark all notifications as read → 200 ──────────────────────────
    @Test
    void markAllAsRead_authenticated_returns200() throws Exception {
        createUnreadNotification("ntf_all_001", Notification.NotificationSection.LEAVE);
        createUnreadNotification("ntf_all_002", Notification.NotificationSection.TIMESHEET);

        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        mockMvc.perform(patch("/api/v1/notifications/read-all")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ── NTF-05: mark all notifications in LEAVE section as read → 200 ─────────
    @Test
    void markSectionAsRead_leaveSection_returns200() throws Exception {
        createUnreadNotification("ntf_sec_001", Notification.NotificationSection.LEAVE);
        createUnreadNotification("ntf_sec_002", Notification.NotificationSection.TIMESHEET);

        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        mockMvc.perform(patch("/api/v1/notifications/section/LEAVE/read-all")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ── NTF-06: mark all notifications in TEAM_LEAVE section as read → 200 ────
    @Test
    void markSectionAsRead_teamLeaveSection_returns200() throws Exception {
        createUnreadNotification("ntf_tl_001", Notification.NotificationSection.TEAM_LEAVE);

        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        mockMvc.perform(patch("/api/v1/notifications/section/TEAM_LEAVE/read-all")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ── NTF-07: mark all notifications in TEAM_TIMESHEET section as read → 200 ─
    @Test
    void markSectionAsRead_teamTimesheetSection_returns200() throws Exception {
        createUnreadNotification("ntf_tt_001", Notification.NotificationSection.TEAM_TIMESHEET);

        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        mockMvc.perform(patch("/api/v1/notifications/section/TEAM_TIMESHEET/read-all")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ── NTF-08: mark all notifications in TIMESHEET section as read → 200 ─────
    @Test
    void markSectionAsRead_timesheetSection_returns200() throws Exception {
        createUnreadNotification("ntf_ts_001", Notification.NotificationSection.TIMESHEET);

        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        mockMvc.perform(patch("/api/v1/notifications/section/TIMESHEET/read-all")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ── NTF-09: response includes all expected badge keys ─────────────────────
    @Test
    void getMyNotifications_responseIncludesAllBadgeKeys() throws Exception {
        createUnreadNotification("ntf_badge_001", Notification.NotificationSection.LEAVE);
        createUnreadNotification("ntf_badge_002", Notification.NotificationSection.TIMESHEET);

        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        mockMvc.perform(get("/api/v1/notifications/my")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.notifications").isArray())
                .andExpect(jsonPath("$.data.unreadCount").isNumber())
                .andExpect(jsonPath("$.data.badges.leaves").isNumber())
                .andExpect(jsonPath("$.data.badges.timesheets").isNumber())
                .andExpect(jsonPath("$.data.badges.team_leaves").isNumber())
                .andExpect(jsonPath("$.data.badges.team_timesheets").isNumber())
                .andExpect(jsonPath("$.data.badges.leaves").value(1))
                .andExpect(jsonPath("$.data.badges.timesheets").value(1));
    }
}
