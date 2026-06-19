package com.cityparking.backend.dto.enrollment;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Response for GET /api/enrollment/sessions/{token}/status
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SessionStatusResponse {
    private String sessionToken;
    private String status;
    private Integer totalFramesCaptured;
    private Integer qualityFramesAccepted;
    private Integer embeddingsGenerated;
    private Integer embeddingsAfterDedup;
    private Boolean livenessPassed;
    private Double livenessScore;
    private Map<String, Boolean> poseCompletion;
    private Map<String, Double> poseQualityScores;
    private Double overallQualityScore;
    private String failureReason;
    private java.util.List<String> validationErrors;
    private Double sessionDurationSeconds;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
}
