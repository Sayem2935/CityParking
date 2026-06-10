package com.cityparking.backend.service.ai;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests for MockFaceRecognitionService.
 * Verifies that all mock methods return realistic, non-null responses.
 */
class MockFaceRecognitionServiceTest {

    private MockFaceRecognitionService mockFaceService;

    private byte[] testImageData;

    @BeforeEach
    void setUp() {
        mockFaceService = new MockFaceRecognitionService();
        testImageData = "fake-face-image-data".getBytes();
    }

    @Nested
    @DisplayName("enrollFace()")
    class EnrollFaceTests {

        @Test
        @DisplayName("should return successful enrollment result")
        void shouldReturnSuccessfulEnrollment() {
            FaceRecognitionService.FaceEnrollmentResult result =
                    mockFaceService.enrollFace(1L, testImageData);

            assertThat(result).isNotNull();
            assertThat(result.isSuccess()).isTrue();
        }

        @Test
        @DisplayName("should return correct userId")
        void shouldReturnCorrectUserId() {
            Long userId = 42L;
            FaceRecognitionService.FaceEnrollmentResult result =
                    mockFaceService.enrollFace(userId, testImageData);

            assertThat(result.getUserId()).isEqualTo(userId);
        }

        @Test
        @DisplayName("should return non-null faceId")
        void shouldReturnFaceId() {
            FaceRecognitionService.FaceEnrollmentResult result =
                    mockFaceService.enrollFace(1L, testImageData);

            assertThat(result.getFaceId()).isNotNull().startsWith("mock-face-");
        }

        @Test
        @DisplayName("should return success message")
        void shouldReturnMessage() {
            FaceRecognitionService.FaceEnrollmentResult result =
                    mockFaceService.enrollFace(1L, testImageData);

            assertThat(result.getMessage()).isNotNull().contains("enrolled");
        }
    }

    @Nested
    @DisplayName("verifyFace()")
    class VerifyFaceTests {

        @Test
        @DisplayName("should return verified=true")
        void shouldReturnVerified() {
            FaceRecognitionService.FaceVerificationResult result =
                    mockFaceService.verifyFace(1L, testImageData);

            assertThat(result).isNotNull();
            assertThat(result.isVerified()).isTrue();
        }

        @Test
        @DisplayName("should return correct userId")
        void shouldReturnCorrectUserId() {
            Long userId = 7L;
            FaceRecognitionService.FaceVerificationResult result =
                    mockFaceService.verifyFace(userId, testImageData);

            assertThat(result.getUserId()).isEqualTo(userId);
        }

        @Test
        @DisplayName("should return high confidence (95-99%)")
        void shouldReturnHighConfidence() {
            FaceRecognitionService.FaceVerificationResult result =
                    mockFaceService.verifyFace(1L, testImageData);

            assertThat(result.getConfidence()).isBetween(95.0, 99.5);
        }

        @Test
        @DisplayName("should return verification message")
        void shouldReturnMessage() {
            FaceRecognitionService.FaceVerificationResult result =
                    mockFaceService.verifyFace(1L, testImageData);

            assertThat(result.getMessage()).isNotNull().contains("verified");
        }
    }

    @Nested
    @DisplayName("searchFace()")
    class SearchFaceTests {

        @Test
        @DisplayName("should return match found")
        void shouldReturnMatchFound() {
            FaceRecognitionService.FaceSearchResult result =
                    mockFaceService.searchFace(testImageData);

            assertThat(result).isNotNull();
            assertThat(result.isMatchFound()).isTrue();
        }

        @Test
        @DisplayName("should return non-null userId")
        void shouldReturnUserId() {
            FaceRecognitionService.FaceSearchResult result =
                    mockFaceService.searchFace(testImageData);

            assertThat(result.getUserId()).isNotNull().isPositive();
        }

        @Test
        @DisplayName("should return high confidence (93-99%)")
        void shouldReturnHighConfidence() {
            FaceRecognitionService.FaceSearchResult result =
                    mockFaceService.searchFace(testImageData);

            assertThat(result.getConfidence()).isBetween(93.0, 99.5);
        }

        @Test
        @DisplayName("should return faceId")
        void shouldReturnFaceId() {
            FaceRecognitionService.FaceSearchResult result =
                    mockFaceService.searchFace(testImageData);

            assertThat(result.getFaceId()).isNotNull().startsWith("mock-face-");
        }

        @Test
        @DisplayName("should return search message")
        void shouldReturnMessage() {
            FaceRecognitionService.FaceSearchResult result =
                    mockFaceService.searchFace(testImageData);

            assertThat(result.getMessage()).isNotNull().contains("match");
        }
    }
}