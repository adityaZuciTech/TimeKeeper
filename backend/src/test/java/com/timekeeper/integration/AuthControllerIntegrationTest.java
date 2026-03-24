package com.timekeeper.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired EmployeeRepository employeeRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @MockBean JavaMailSender javaMailSender;

    @BeforeEach
    void createTestUser() {
        Employee emp = new Employee();
        emp.setId("int_emp_001");
        emp.setName("Test User");
        emp.setEmail("testuser@example.com");
        emp.setPassword(passwordEncoder.encode("password123"));
        emp.setRole(Employee.Role.EMPLOYEE);
        emp.setStatus(Employee.EmployeeStatus.ACTIVE);
        employeeRepository.save(emp);
    }

    @Test
    void login_validCredentials_returns200WithToken() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setEmail("testuser@example.com");
        req.setPassword("password123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.email").value("testuser@example.com"));
    }

    @Test
    void login_invalidPassword_returns401() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setEmail("testuser@example.com");
        req.setPassword("wrongpassword");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void login_unknownEmail_returns401() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setEmail("nobody@example.com");
        req.setPassword("password123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_missingEmail_returns400() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setPassword("password123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // AUTH-07: inactive employee login returns 401
    @Test
    void login_inactiveEmployee_returns401() throws Exception {
        Employee inactive = new Employee();
        inactive.setId("int_emp_inactive");
        inactive.setName("Inactive User");
        inactive.setEmail("inactive@example.com");
        inactive.setPassword(passwordEncoder.encode("password123"));
        inactive.setRole(Employee.Role.EMPLOYEE);
        inactive.setStatus(Employee.EmployeeStatus.INACTIVE);
        employeeRepository.save(inactive);

        LoginRequest req = new LoginRequest();
        req.setEmail("inactive@example.com");
        req.setPassword("password123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }
}
