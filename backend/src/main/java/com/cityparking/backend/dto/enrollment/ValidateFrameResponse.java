package com.cityparking.backend.dto.enrollment;

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
public class ValidateFrameResponse {
    private boolean valid;
    private String feedback;
    private List<String> reasons;
    private Map<String, Object> poseMetrics;
    private Map<String, Object> qualityMetrics;
    private boolean poseComplete;
    private int acceptedFrames;
    private int targetFrames;
}
