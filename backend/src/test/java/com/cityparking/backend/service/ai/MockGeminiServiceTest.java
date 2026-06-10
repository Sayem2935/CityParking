package com.cityparking.backend.service.ai;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests for MockGeminiService.
 * Verifies that all mock methods return realistic, non-null responses.
 */
class MockGeminiServiceTest {

    private MockGeminiService mockGeminiService;

    private MockMultipartFile testImage;

    @BeforeEach
    void setUp() {
        mockGeminiService = new MockGeminiService();
        testImage = new MockMultipartFile(
                "image", "test-car.jpg", "image/jpeg", "fake-image-data".getBytes());
    }

    @Nested
    @DisplayName("detectPlate()")
    class DetectPlateTests {

        @Test
        @DisplayName("should return non-null plate detection result")
        void shouldReturnNonNullResult() {
            PlateDetectionResult result = mockGeminiService.detectPlate(testImage);
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("should return valid plate number")
        void shouldReturnValidPlateNumber() {
            PlateDetectionResult result = mockGeminiService.detectPlate(testImage);
            assertThat(result.getPlateNumber()).isNotNull().isNotEmpty();
        }

        @Test
        @DisplayName("should return confidence between 0 and 1")
        void shouldReturnValidConfidence() {
            PlateDetectionResult result = mockGeminiService.detectPlate(testImage);
            assertThat(result.getConfidence()).isBetween(0.0, 1.0);
        }

        @Test
        @DisplayName("should return vehicle type")
        void shouldReturnVehicleType() {
            PlateDetectionResult result = mockGeminiService.detectPlate(testImage);
            assertThat(result.getVehicleType()).isNotNull().isNotEmpty();
        }

        @Test
        @DisplayName("should return vehicle color")
        void shouldReturnVehicleColor() {
            PlateDetectionResult result = mockGeminiService.detectPlate(testImage);
            assertThat(result.getVehicleColor()).isNotNull().isNotEmpty();
        }

        @Test
        @DisplayName("should return bounding box")
        void shouldReturnBoundingBox() {
            PlateDetectionResult result = mockGeminiService.detectPlate(testImage);
            assertThat(result.getBoundingBox()).isNotNull();
            assertThat(result.getBoundingBox().getWidth()).isGreaterThan(0);
            assertThat(result.getBoundingBox().getHeight()).isGreaterThan(0);
        }

        @Test
        @DisplayName("should return Bangladesh-style plate number format")
        void shouldReturnBangladeshPlateFormat() {
            PlateDetectionResult result = mockGeminiService.detectPlate(testImage);
            assertThat(result.getPlateNumber()).contains("-").hasSizeGreaterThan(5);
        }
    }

    @Nested
    @DisplayName("analyzeVehicle()")
    class AnalyzeVehicleTests {

        @Test
        @DisplayName("should return non-null vehicle analysis result")
        void shouldReturnNonNullResult() {
            VehicleAnalysisResult result = mockGeminiService.analyzeVehicle(testImage);
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("should return vehicle type")
        void shouldReturnVehicleType() {
            VehicleAnalysisResult result = mockGeminiService.analyzeVehicle(testImage);
            assertThat(result.getVehicleType()).isNotNull().isNotEmpty();
        }

        @Test
        @DisplayName("should return vehicle color")
        void shouldReturnVehicleColor() {
            VehicleAnalysisResult result = mockGeminiService.analyzeVehicle(testImage);
            assertThat(result.getVehicleColor()).isNotNull().isNotEmpty();
        }

        @Test
        @DisplayName("should return vehicle make")
        void shouldReturnVehicleMake() {
            VehicleAnalysisResult result = mockGeminiService.analyzeVehicle(testImage);
            assertThat(result.getMake()).isNotNull().isNotEmpty();
        }

        @Test
        @DisplayName("should return vehicle model")
        void shouldReturnVehicleModel() {
            VehicleAnalysisResult result = mockGeminiService.analyzeVehicle(testImage);
            assertThat(result.getModel()).isNotNull().isNotEmpty();
        }

        @Test
        @DisplayName("should return reasonable year estimate")
        void shouldReturnReasonableYearEstimate() {
            VehicleAnalysisResult result = mockGeminiService.analyzeVehicle(testImage);
            assertThat(result.getYearEstimate()).isBetween(2015, 2025);
        }

        @Test
        @DisplayName("should return confidence between 0 and 1")
        void shouldReturnValidConfidence() {
            VehicleAnalysisResult result = mockGeminiService.analyzeVehicle(testImage);
            assertThat(result.getConfidence()).isBetween(0.0, 1.0);
        }
    }

    @Nested
    @DisplayName("detectParkingSlots()")
    class DetectParkingSlotsTests {

        @Test
        @DisplayName("should return non-null parking detection result")
        void shouldReturnNonNullResult() {
            ParkingDetectionResult result = mockGeminiService.detectParkingSlots(testImage);
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("should return valid total slots")
        void shouldReturnValidTotalSlots() {
            ParkingDetectionResult result = mockGeminiService.detectParkingSlots(testImage);
            assertThat(result.getTotalSlots()).isGreaterThan(0);
        }

        @Test
        @DisplayName("should return consistent slot counts")
        void shouldReturnConsistentSlotCounts() {
            ParkingDetectionResult result = mockGeminiService.detectParkingSlots(testImage);
            assertThat(result.getOccupiedSlots() + result.getFreeSlots())
                    .isEqualTo(result.getTotalSlots());
        }

        @Test
        @DisplayName("should return slot details list")
        void shouldReturnSlotDetails() {
            ParkingDetectionResult result = mockGeminiService.detectParkingSlots(testImage);
            assertThat(result.getSlots()).isNotNull().isNotEmpty();
        }

        @Test
        @DisplayName("should return confidence between 0 and 1")
        void shouldReturnValidConfidence() {
            ParkingDetectionResult result = mockGeminiService.detectParkingSlots(testImage);
            assertThat(result.getConfidence()).isBetween(0.0, 1.0);
        }

        @Test
        @DisplayName("should return slots with IDs and zones")
        void shouldReturnSlotsWithIdsAndZones() {
            ParkingDetectionResult result = mockGeminiService.detectParkingSlots(testImage);
            result.getSlots().forEach(slot -> {
                assertThat(slot.getSlotId()).isNotNull().isNotEmpty();
                assertThat(slot.getZone()).isNotNull().isNotEmpty();
                assertThat(slot.getConfidence()).isBetween(0.0, 1.0);
            });
        }
    }

    @Nested
    @DisplayName("analyzeParkingImage()")
    class AnalyzeParkingImageTests {

        @Test
        @DisplayName("should return non-null analysis")
        void shouldReturnNonNullAnalysis() {
            String result = mockGeminiService.analyzeParkingImage(testImage, "Analyze this parking lot");
            assertThat(result).isNotNull().isNotEmpty();
        }

        @Test
        @DisplayName("should return JSON-formatted response")
        void shouldReturnJsonResponse() {
            String result = mockGeminiService.analyzeParkingImage(testImage, "test prompt");
            assertThat(result).contains("{").contains("}");
            assertThat(result).contains("analysis");
            assertThat(result).contains("observations");
            assertThat(result).contains("recommendations");
        }

        @Test
        @DisplayName("should return confidence in response")
        void shouldReturnConfidence() {
            String result = mockGeminiService.analyzeParkingImage(testImage, "test");
            assertThat(result).contains("confidence");
        }
    }
}