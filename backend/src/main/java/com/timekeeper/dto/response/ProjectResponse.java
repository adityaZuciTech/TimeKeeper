package com.timekeeper.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ProjectResponse {
    private String id;
    private String name;
    private String clientName;
    private String departmentId;
    private String departmentName;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
}
