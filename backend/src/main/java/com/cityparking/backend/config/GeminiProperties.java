package com.cityparking.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for Gemini API integration.
 * Loaded from application.yml under the 'gemini' prefix.
 *
 * Note: The existing GeminiConfig class owns the @ConfigurationProperties(prefix = "gemini")
 * and creates the WebClient bean. This class provides a typed properties accessor
 * for use in GeminiServiceImpl and AiProviderConfig.
 *
 * Tomorrow: Set GEMINI_API_KEY environment variable to enable real API calls.
 */
@Component
@ConfigurationProperties(prefix = "gemini")
public class GeminiProperties {

    /**
     * Gemini API key. Loaded from environment variable GEMINI_API_KEY.
     * Required when ai.provider.vision=gemini
     */
    private String apiKey = "";

    /**
     * Gemini model to use for vision tasks.
     * Default: gemini-1.5-flash (fast, cost-effective)
     */
    private String model = "gemini-1.5-flash";

    /**
     * Base URL for the Gemini API.
     */
    private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";

    /**
     * Timeout configuration.
     */
    private Timeout timeout = new Timeout();

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public Timeout getTimeout() {
        return timeout;
    }

    public void setTimeout(Timeout timeout) {
        this.timeout = timeout;
    }

    /**
     * Returns true if an API key has been configured.
     */
    public boolean hasApiKey() {
        return apiKey != null && !apiKey.isBlank();
    }

    public static class Timeout {
        private long connectMs = 5000;
        private long readMs = 30000;

        public long getConnectMs() {
            return connectMs;
        }

        public void setConnectMs(long connectMs) {
            this.connectMs = connectMs;
        }

        public long getReadMs() {
            return readMs;
        }

        public void setReadMs(long readMs) {
            this.readMs = readMs;
        }
    }
}