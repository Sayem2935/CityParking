package com.cityparking.backend.dto.enrollment;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ValidateFrameResponse {
    private boolean valid;
    private String feedback;
    private List<String> reasons;
    @JsonAlias({"pose_detected"})
    private String poseDetected;

    // FastAPI returns these as snake_case (pose_metrics / quality_metrics).
    // @JsonAlias maps the snake_case keys on INPUT (deserializing the FastAPI
    // response) while the field name keeps serializing OUT as camelCase, which
    // is what the React frontend reads (res.data.poseMetrics / qualityMetrics).
    @JsonAlias({"pose_metrics"})
    private Map<String, Object> poseMetrics;

    @JsonAlias({"quality_metrics"})
    private Map<String, Object> qualityMetrics;

    private boolean poseComplete;
    private int acceptedFrames;
    private int targetFrames;
}
