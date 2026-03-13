package com.timekeeper.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDate;

@Data
public class CreateProjectRequest {
    @NotBlank
    private String name;
    private String clientName;
    private String departmentId;
    private LocalDate startDate;
    private LocalDate endDate;
}
