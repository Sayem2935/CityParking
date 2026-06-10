package com.cityparking.backend.service.ai;

import com.cityparking.backend.config.AwsProperties;
import com.cityparking.backend.config.GeminiProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class BeanSelectionTest {

    @Autowired(required = false)
    private GeminiService geminiService;

    @Autowired(required = false)
    private FaceRecognitionService faceRecognitionService;

    @Autowired(required = false)
    private GeminiProperties geminiProperties;

    @Autowired(required = false)
    private AwsProperties awsProperties;

    @Nested
    @DisplayName("Vision Provider (ai.provider.vision=mock)")
    class VisionProviderTests {

        @Test
        @DisplayName("should load GeminiService bean")
        void shouldLoadGeminiService() {
            assertThat(geminiService).isNotNull();
        }

        @Test
        @DisplayName("should load MockGeminiService when vision=mock")
        void shouldLoadMockGeminiService() {
            assertThat(geminiService).isInstanceOf(MockGeminiService.class);
        }
    }

    @Nested
    @DisplayName("Face Provider (ai.provider.face=mock)")
    class FaceProviderTests {

        @Test
        @DisplayName("should load FaceRecognitionService bean")
        void shouldLoadFaceRecognitionService() {
            assertThat(faceRecognitionService).isNotNull();
        }

        @Test
        @DisplayName("should load MockFaceRecognitionService when face=mock")
        void shouldLoadMockFaceRecognitionService() {
            assertThat(faceRecognitionService).isInstanceOf(MockFaceRecognitionService.class);
        }
    }

    @Nested
    @DisplayName("Configuration Properties")
    class ConfigPropertiesTests {

        @Test
        @DisplayName("should load GeminiProperties")
        void shouldLoadGeminiProperties() {
            assertThat(geminiProperties).isNotNull();
            assertThat(geminiProperties.getModel()).isEqualTo("gemini-1.5-flash");
            assertThat(geminiProperties.getBaseUrl()).contains("googleapis.com");
        }

        @Test
        @DisplayName("should load AwsProperties")
        void shouldLoadAwsProperties() {
            assertThat(awsProperties).isNotNull();
            assertThat(awsProperties.getRegion()).isEqualTo("us-east-1");
            assertThat(awsProperties.getCollectionId()).isEqualTo("test-collection");
        }

        @Test
        @DisplayName("should have test Gemini API key configured")
        void shouldHaveTestGeminiApiKey() {
            assertThat(geminiProperties.getApiKey()).isEqualTo("test-key");
        }

        @Test
        @DisplayName("should have test AWS credentials configured")
        void shouldHaveTestAwsCredentials() {
            assertThat(awsProperties.getAccessKeyId()).isEqualTo("test-access-key");
            assertThat(awsProperties.getSecretAccessKey()).isEqualTo("test-secret-key");
        }
    }

    @Nested
    @DisplayName("Feature Flags")
    class FeatureFlagTests {

        @Test
        @DisplayName("GeminiService should respond to detectPlate calls")
        void geminiServiceShouldWork() {
            var result = geminiService.detectPlate(
                    new MockMultipartFile("image", "test.jpg", "image/jpeg", "data".getBytes()));
            assertThat(result).isNotNull();
            assertThat(result.getPlateNumber()).isNotNull();
        }

        @Test
        @DisplayName("FaceRecognitionService should respond to verifyFace calls")
        void faceServiceShouldWork() {
            var result = faceRecognitionService.verifyFace(1L, "test-data".getBytes());
            assertThat(result).isNotNull();
            assertThat(result.isVerified()).isTrue();
        }
    }
}