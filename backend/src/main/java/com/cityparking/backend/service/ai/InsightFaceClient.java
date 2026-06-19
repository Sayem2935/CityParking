package com.cityparking.backend.service.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import com.cityparking.backend.dto.enrollment.ValidateFrameResponse;

import java.util.List;
import java.util.Map;

/**
 * HTTP client for the FastAPI Face AI microservice.
 *
 * Provides typed methods for:
 *   - Single embedding extraction
 *   - Batch enrollment (multi-frame → deduplicated embeddings)
 *   - Liveness analysis
 *   - Quality checking
 *   - Gallery comparison
 */
@Service
public class InsightFaceClient {

    private static final Logger log = LoggerFactory.getLogger(InsightFaceClient.class);

    @Value("${insightface.base-url:http://localhost:8001}")
    private String faceAiBaseUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public InsightFaceClient(ObjectMapper objectMapper) {
        this.restTemplate = new RestTemplate();
        this.objectMapper = objectMapper;
    }

    /**
     * Extract a single embedding from an image.
     */
    public EmbeddingResult extractEmbedding(byte[] imageBytes) {
        String url = faceAiBaseUrl + "/face/extract-embedding";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("image", new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() {
                return "face.jpg";
            }
        });

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

        Map<String, Object> result = response.getBody();
        if (result == null || !Boolean.TRUE.equals(result.get("success"))) {
            throw new RuntimeException("Embedding extraction failed: " + result);
        }

        @SuppressWarnings("unchecked")
        List<Number> embeddingList = (List<Number>) result.get("embedding");
        float[] embedding = new float[embeddingList.size()];
        for (int i = 0; i < embeddingList.size(); i++) {
            embedding[i] = embeddingList.get(i).floatValue();
        }

        return EmbeddingResult.builder()
                .embedding(embedding)
                .faceScore(((Number) result.getOrDefault("face_score", 0.0)).floatValue())
                .build();
    }

    /**
     * Batch enroll — send multiple frames to FastAPI for processing.
     */
    public BatchEnrollResult batchEnroll(
            List<byte[]> frames,
            List<String> poseLabels,
            int userId
    ) {
        String url = faceAiBaseUrl + "/face/batch-enroll";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        for (int i = 0; i < frames.size(); i++) {
            final int idx = i;
            body.add("images", new ByteArrayResource(frames.get(i)) {
                @Override
                public String getFilename() {
                    return "frame_" + idx + ".jpg";
                }
            });
        }
        body.add("user_id", String.valueOf(userId));
        body.add("pose_labels", String.join(",", poseLabels));

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            Map<String, Object> result = response.getBody();
            if (result == null) {
                throw new RuntimeException("Null response from batch-enroll");
            }

            return objectMapper.convertValue(result, BatchEnrollResult.class);

        } catch (Exception e) {
            log.error("Batch enrollment call failed: {}", e.getMessage(), e);
            throw new RuntimeException("Batch enrollment failed: " + e.getMessage(), e);
        }
    }

    /**
     * Real-time pose validation for a single frame.
     */
    public ValidateFrameResponse validateFrame(byte[] imageBytes, String poseLabel) {
        try {
            String url = faceAiBaseUrl + "/face/validate-frame";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return "frame.jpg";
                }
            });
            body.add("pose_label", poseLabel);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<ValidateFrameResponse> response = restTemplate.exchange(
                    url, HttpMethod.POST, requestEntity, ValidateFrameResponse.class
            );

            return response.getBody();
        } catch (Exception e) {
            log.error("Validate frame call failed: {}", e.getMessage(), e);
            throw new RuntimeException("Validate frame failed: " + e.getMessage(), e);
        }
    }

    /**
     * Health check for the Face AI service.
     */
    public boolean isHealthy() {
        try {
            String url = faceAiBaseUrl + "/health";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> result = response.getBody();
            return result != null && "healthy".equals(result.get("status"));
        } catch (Exception e) {
            log.warn("Face AI health check failed: {}", e.getMessage());
            return false;
        }
    }

    // ── Result DTOs ──────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmbeddingResult {
        private float[] embedding;
        private float faceScore;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchEnrollResult {
        private boolean success;

        @JsonProperty("total_frames")
        private int totalFrames;

        @JsonProperty("quality_passed")
        private int qualityPassed;

        @JsonProperty("quality_failed")
        private int qualityFailed;

        @JsonProperty("embeddings_extracted")
        private int embeddingsExtracted;

        @JsonProperty("embeddings_after_dedup")
        private int embeddingsAfterDedup;

        private List<BatchEmbedding> embeddings;

        @JsonProperty("rejected_frames")
        private List<Map<String, Object>> rejectedFrames;

        @JsonProperty("processing_time_ms")
        private double processingTimeMs;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchEmbedding {
        private List<Double> embedding;

        @JsonProperty("pose_label")
        private String poseLabel;

        @JsonProperty("face_score")
        private double faceScore;

        private List<Integer> bbox;

        @JsonProperty("head_pose")
        private Map<String, Double> headPose;

        @JsonProperty("blur_score")
        private double blurScore;
    }
}
