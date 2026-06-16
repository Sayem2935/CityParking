package com.cityparking.backend.dto.enrollment;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Response for POST /api/enrollment/sessions/start
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StartSessionResponse {
    private String sessionToken;
    private List<PoseConfig> poses;
    private CaptureConfig captureConfig;
    private LocalDateTime expiresAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PoseConfig {
        private String name;
        private String instruction;
        private int durationMs;
        private int order;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CaptureConfig {
        private int targetFps;
        private int minFramesPerPose;
        private int maxFramesPerPose;
        private String imageFormat;
        private int imageQuality;
        private Resolution resolution;

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class Resolution {
            private int width;
            private int height;
        }
    }
}
