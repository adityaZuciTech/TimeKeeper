package com.timekeeper.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class NotificationResponse {
    private String id;
    private String title;
    private String message;
    private String type;
    private boolean read;
    private LocalDateTime createdAt;
    private String targetSection;
}
