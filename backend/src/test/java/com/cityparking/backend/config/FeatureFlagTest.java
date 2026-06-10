package com.cityparking.backend.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests verifying that feature flags are correctly loaded from configuration.
 */
@SpringBootTest
@ActiveProfiles("test")
class FeatureFlagTest {

    @Value("${ai.provider.face}")
    private String faceProvider;

    @Value("${ai.provider.vision}")
    private String visionProvider;

    @Autowired
    private GeminiProperties geminiProperties;

    @Autowired
    private AwsProperties awsProperties;

    @Test
    @DisplayName("should load face provider flag from configuration")
    void shouldLoadFaceProviderFlag() {
        assertThat(faceProvider).isNotNull().isEqualTo("mock");
    }

    @Test
    @DisplayName("should load vision provider flag from configuration")
    void shouldLoadVisionProviderFlag() {
        assertThat(visionProvider).isNotNull().isEqualTo("mock");
    }

    @Test
    @DisplayName("should have supported face provider values")
    void shouldHaveSupportedFaceProviders() {
        // Supported values: mock, aws
        assertThat(faceProvider).isIn("mock", "aws");
    }

    @Test
    @DisplayName("should have supported vision provider values")
    void shouldHaveSupportedVisionProviders() {
        // Supported values: mock, gemini
        assertThat(visionProvider).isIn("mock", "gemini");
    }

    @Test
    @DisplayName("should load GeminiProperties from config")
    void shouldLoadGeminiConfig() {
        assertThat(geminiProperties).isNotNull();
        assertThat(geminiProperties.getModel()).isEqualTo("gemini-1.5-flash");
    }

    @Test
    @DisplayName("should load AwsProperties from config")
    void shouldLoadAwsConfig() {
        assertThat(awsProperties).isNotNull();
        assertThat(awsProperties.getRegion()).isEqualTo("us-east-1");
    }
}