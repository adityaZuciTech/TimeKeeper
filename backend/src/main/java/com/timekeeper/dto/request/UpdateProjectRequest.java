package com.timekeeper.dto.request;

import com.timekeeper.entity.Project;
import lombok.Data;
import java.time.LocalDate;

@Data
public class UpdateProjectRequest {
    private String name;
    private String clientName;
    private String departmentId;
    private LocalDate startDate;
    private LocalDate endDate;
    private Project.ProjectStatus status;
}
