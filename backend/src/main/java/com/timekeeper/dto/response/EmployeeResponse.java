package com.timekeeper.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class EmployeeResponse {
    private String id;
    private String name;
    private String email;
    private String role;
    private String departmentId;
    private String departmentName;
    private String managerId;
    private String status;
}
