package com.cityparking.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for the InsightFace FastAPI microservice.
 *
 * Bound from application.yml under the "insightface" prefix.
 * Example:
 *   insightface:
 *     base-url: http://localhost:8001
 *     similarity-threshold: 0.45
 */
@Component
@ConfigurationProperties(prefix = "insightface")
@Getter
@Setter
public class InsightFaceProperties {

    /** Base URL of the FastAPI face-ai service. */
    private String baseUrl = "http://localhost:8001";

    /** Connection timeout in milliseconds. */
    private int connectTimeoutMs = 5000;

    /** Read timeout in milliseconds. */
    private int readTimeoutMs = 30000;

    /** Cosine similarity threshold for face verification (0.0 - 1.0). */
    private double similarityThreshold = 0.45;

    /** Interval (ms) between embedding cache refreshes. */
    private long cacheRefreshIntervalMs = 300000; // 5 minutes

    /**
     * Check if the service URL is configured (non-blank).
     */
    public boolean isConfigured() {
        return baseUrl != null && !baseUrl.isBlank();
    }
}
