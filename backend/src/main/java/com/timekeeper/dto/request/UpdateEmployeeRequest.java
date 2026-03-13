package com.timekeeper.dto.request;

import com.timekeeper.entity.Employee;
import lombok.Data;

@Data
public class UpdateEmployeeRequest {
    private String name;
    private String departmentId;
    private String managerId;
    private Employee.Role role;
}
