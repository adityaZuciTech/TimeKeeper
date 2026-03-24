package com.timekeeper.dto.request;

import com.timekeeper.entity.Employee;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateEmployeeRequest {
    @NotBlank
    private String name;

    @NotBlank @Email
    private String email;

    @NotBlank
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotNull
    private Employee.Role role;

    private String departmentId;
    private String managerId;
}
