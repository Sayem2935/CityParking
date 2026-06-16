package com.cityparking.backend.dto.enrollment;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.List;
import java.util.Map;

/**
 * Response for POST /api/enrollment/sessions/{token}/frames
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FrameUploadResponse {
    private Integer framesReceived;
    private Integer framesAccepted;
    private Integer framesRejected;
    private List<RejectionDetail> rejectionReasons;
    private Map<String, PoseProgress> poseProgress;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RejectionDetail {
        private Integer frameIndex;
        private String reason;
        private Double blurScore;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PoseProgress {
        private boolean complete;
        private int framesAccepted;
    }
}
