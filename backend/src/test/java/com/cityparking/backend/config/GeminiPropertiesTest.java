package com.cityparking.backend.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests for GeminiProperties configuration loading.
 */
@SpringBootTest
@ActiveProfiles("test")
class GeminiPropertiesTest {

    @Autowired
    private GeminiProperties properties;

    @Test
    @DisplayName("should load GeminiProperties from application-test.yml")
    void shouldLoadProperties() {
        assertThat(properties).isNotNull();
    }

    @Test
    @DisplayName("should have api-key from config")
    void shouldHaveApiKey() {
        assertThat(properties.getApiKey()).isNotNull();
    }

    @Test
    @DisplayName("should have model configured")
    void shouldHaveModel() {
        assertThat(properties.getModel()).isEqualTo("gemini-1.5-flash");
    }

    @Test
    @DisplayName("should have base URL configured")
    void shouldHaveBaseUrl() {
        assertThat(properties.getBaseUrl()).isEqualTo("https://generativelanguage.googleapis.com/v1beta");
    }

    @Test
    @DisplayName("should have timeout configured")
    void shouldHaveTimeout() {
        assertThat(properties.getTimeout()).isNotNull();
        assertThat(properties.getTimeout().getConnectMs()).isGreaterThan(0);
        assertThat(properties.getTimeout().getReadMs()).isGreaterThan(0);
    }

    @Test
    @DisplayName("should report hasApiKey correctly")
    void shouldReportHasApiKey() {
        // In test profile, api-key is set to "test-key"
        assertThat(properties.hasApiKey()).isTrue();
    }

    @Test
    @DisplayName("should detect empty API key")
    void shouldDetectEmptyApiKey() {
        GeminiProperties emptyProps = new GeminiProperties();
        emptyProps.setApiKey("");
        assertThat(emptyProps.hasApiKey()).isFalse();
    }

    @Test
    @DisplayName("should detect null API key")
    void shouldDetectNullApiKey() {
        GeminiProperties nullProps = new GeminiProperties();
        nullProps.setApiKey(null);
        assertThat(nullProps.hasApiKey()).isFalse();
    }
}