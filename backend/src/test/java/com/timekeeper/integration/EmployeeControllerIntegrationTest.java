package com.timekeeper.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.timekeeper.dto.request.CreateEmployeeRequest;
import com.timekeeper.dto.request.LoginRequest;
import com.timekeeper.entity.Employee;
import com.timekeeper.repository.EmployeeRepository;
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

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class EmployeeControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired EmployeeRepository employeeRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @MockBean JavaMailSender javaMailSender;

    private static final String ADMIN_ID    = "ec_admin_001";
    private static final String MGR_ID      = "ec_mgr_001";
    private static final String EMP_ID      = "ec_emp_001";
    private static final String ADMIN_EMAIL = "ec_admin@example.com";
    private static final String MGR_EMAIL   = "ec_manager@example.com";
    private static final String EMP_EMAIL   = "ec_employee@example.com";
    private static final String PASSWORD    = "password123";

    @BeforeEach
    void setUp() {
        Employee admin = new Employee();
        admin.setId(ADMIN_ID);
        admin.setName("EC Admin");
        admin.setEmail(ADMIN_EMAIL);
        admin.setPassword(passwordEncoder.encode(PASSWORD));
        admin.setRole(Employee.Role.ADMIN);
        admin.setStatus(Employee.EmployeeStatus.ACTIVE);
        employeeRepository.save(admin);

        Employee manager = new Employee();
        manager.setId(MGR_ID);
        manager.setName("EC Manager");
        manager.setEmail(MGR_EMAIL);
        manager.setPassword(passwordEncoder.encode(PASSWORD));
        manager.setRole(Employee.Role.MANAGER);
        manager.setStatus(Employee.EmployeeStatus.ACTIVE);
        employeeRepository.save(manager);

        Employee employee = new Employee();
        employee.setId(EMP_ID);
        employee.setName("EC Employee");
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

    // ── EC-01: admin creates employee → 201 ───────────────────────────────────
    @Test
    void createEmployee_byAdmin_returns201WithActiveStatus() throws Exception {
        String token = loginAndGetToken(ADMIN_EMAIL, PASSWORD);

        CreateEmployeeRequest req = new CreateEmployeeRequest();
        req.setName("New Staff Member");
        req.setEmail("new_staff@example.com");
        req.setPassword("securePass1");
        req.setRole(Employee.Role.EMPLOYEE);

        mockMvc.perform(post("/api/v1/employees")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("new_staff@example.com"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    // ── EC-02: employee attempts to create → 403 ──────────────────────────────
    @Test
    void createEmployee_byEmployee_returns403() throws Exception {
        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        CreateEmployeeRequest req = new CreateEmployeeRequest();
        req.setName("Unauthorized");
        req.setEmail("unauthorized@example.com");
        req.setPassword("password123");
        req.setRole(Employee.Role.EMPLOYEE);

        mockMvc.perform(post("/api/v1/employees")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    // ── EC-03: manager attempts to create → 403 ───────────────────────────────
    @Test
    void createEmployee_byManager_returns403() throws Exception {
        String token = loginAndGetToken(MGR_EMAIL, PASSWORD);

        CreateEmployeeRequest req = new CreateEmployeeRequest();
        req.setName("Mgr Created");
        req.setEmail("mgr_created@example.com");
        req.setPassword("password123");
        req.setRole(Employee.Role.EMPLOYEE);

        mockMvc.perform(post("/api/v1/employees")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    // ── EC-04: unauthenticated create → 401 ───────────────────────────────────
    @Test
    void createEmployee_unauthenticated_returns401() throws Exception {
        CreateEmployeeRequest req = new CreateEmployeeRequest();
        req.setName("No Auth");
        req.setEmail("noauth@example.com");
        req.setPassword("password123");
        req.setRole(Employee.Role.EMPLOYEE);

        mockMvc.perform(post("/api/v1/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ── EC-05: duplicate email → 400 BusinessException ────────────────────────
    @Test
    void createEmployee_duplicateEmail_returns400() throws Exception {
        String token = loginAndGetToken(ADMIN_EMAIL, PASSWORD);

        CreateEmployeeRequest req = new CreateEmployeeRequest();
        req.setName("Duplicate Person");
        req.setEmail(EMP_EMAIL); // already registered
        req.setPassword("password123");
        req.setRole(Employee.Role.EMPLOYEE);

        mockMvc.perform(post("/api/v1/employees")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ── EC-06: admin gets all employees → 200 with employees array ───────────
    @Test
    void getAllEmployees_byAdmin_returns200WithEmployeesArray() throws Exception {
        String token = loginAndGetToken(ADMIN_EMAIL, PASSWORD);

        mockMvc.perform(get("/api/v1/employees")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.employees").isArray());
    }

    // ── EC-07: employee tries to list all → 403 ───────────────────────────────
    @Test
    void getAllEmployees_byEmployee_returns403() throws Exception {
        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        mockMvc.perform(get("/api/v1/employees")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ── EC-08: employee reads own profile → 200 ───────────────────────────────
    @Test
    void getById_employee_ownProfile_returns200() throws Exception {
        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        mockMvc.perform(get("/api/v1/employees/" + EMP_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(EMP_ID))
                .andExpect(jsonPath("$.data.email").value(EMP_EMAIL));
    }

    // ── EC-09: employee reads another employee's profile → 403 ───────────────
    @Test
    void getById_employee_otherProfile_returns403() throws Exception {
        String token = loginAndGetToken(EMP_EMAIL, PASSWORD);

        mockMvc.perform(get("/api/v1/employees/" + ADMIN_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ── EC-10: admin deactivates employee → 200 INACTIVE ─────────────────────
    @Test
    void updateStatus_adminDeactivatesEmployee_returns200Inactive() throws Exception {
        String token = loginAndGetToken(ADMIN_EMAIL, PASSWORD);

        mockMvc.perform(patch("/api/v1/employees/" + EMP_ID + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "INACTIVE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("INACTIVE"));
    }

    // ── EC-11: admin reactivates employee → 200 ACTIVE ────────────────────────
    @Test
    void updateStatus_adminReactivatesEmployee_returns200Active() throws Exception {
        // First deactivate via repo to set up state
        Employee emp = employeeRepository.findById(EMP_ID).orElseThrow();
        emp.setStatus(Employee.EmployeeStatus.INACTIVE);
        employeeRepository.save(emp);

        String token = loginAndGetToken(ADMIN_EMAIL, PASSWORD);

        mockMvc.perform(patch("/api/v1/employees/" + EMP_ID + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "ACTIVE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    // ── EC-12: admin updates employee with invalid status → 400 ──────────────
    @Test
    void updateStatus_invalidValue_returns400() throws Exception {
        String token = loginAndGetToken(ADMIN_EMAIL, PASSWORD);

        mockMvc.perform(patch("/api/v1/employees/" + EMP_ID + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "SUSPENDED"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
