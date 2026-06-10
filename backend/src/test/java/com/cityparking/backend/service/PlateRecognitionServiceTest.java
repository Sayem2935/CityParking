package com.cityparking.backend.service;

import com.cityparking.backend.dto.plateverification.PlateDetectionResult;
import com.cityparking.backend.dto.plateverification.PlateVerificationResponse;
import com.cityparking.backend.entity.PlateVerificationLog;
import com.cityparking.backend.entity.Vehicle;
import com.cityparking.backend.repository.PlateVerificationLogRepository;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.repository.VehicleRepository;
import com.cityparking.backend.service.ai.GeminiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PlateRecognitionService Tests")
class PlateRecognitionServiceTest {

    @Mock
    private PlateVerificationLogRepository plateVerificationLogRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GeminiService geminiService;

    @InjectMocks
    private PlateRecognitionService plateRecognitionService;

    private Vehicle testVehicle;
    private MockMultipartFile testImage;

    @BeforeEach
    void setUp() {
        // Re-initialize service with mock GeminiService
        plateRecognitionService = new PlateRecognitionService(
                plateVerificationLogRepository,
                vehicleRepository,
                userRepository,
                geminiService
        );

        testVehicle = new Vehicle();
        testVehicle.setId(1L);
        testVehicle.setLicensePlate("DHAKA-METRO-GA-1234");
        // userId is via User entity relationship

        testImage = new MockMultipartFile(
                "image", "plate.jpg", "image/jpeg", "fake-image-data".getBytes()
        );
    }

    @Nested
    @DisplayName("matchPlateToVehicle Tests")
    class MatchPlateToVehicleTests {

        @Test
        @DisplayName("Should match exact plate number")
        void shouldMatchExactPlateNumber() {
            List<Vehicle> vehicles = Arrays.asList(testVehicle);
            when(vehicleRepository.findByUserId(1L)).thenReturn(vehicles);

            Optional<Vehicle> result = plateRecognitionService.matchPlateToVehicle(1L, "DHAKA-METRO-GA-1234");

            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("Should match plate ignoring case")
        void shouldMatchPlateIgnoringCase() {
            List<Vehicle> vehicles = Arrays.asList(testVehicle);
            when(vehicleRepository.findByUserId(1L)).thenReturn(vehicles);

            Optional<Vehicle> result = plateRecognitionService.matchPlateToVehicle(1L, "dhaka-metro-ga-1234");

            assertThat(result).isPresent();
        }

        @Test
        @DisplayName("Should match plate ignoring spaces and hyphens")
        void shouldMatchPlateIgnoringSpacesAndHyphens() {
            List<Vehicle> vehicles = Arrays.asList(testVehicle);
            when(vehicleRepository.findByUserId(1L)).thenReturn(vehicles);

            Optional<Vehicle> result = plateRecognitionService.matchPlateToVehicle(1L, "DHAKAMETROGA1234");

            assertThat(result).isPresent();
        }

        @Test
        @DisplayName("Should fuzzy match similar plates")
        void shouldFuzzyMatchSimilarPlates() {
            testVehicle.setLicensePlate("DHAKA-METRO-GA-1234");
            List<Vehicle> vehicles = Arrays.asList(testVehicle);
            when(vehicleRepository.findByUserId(1L)).thenReturn(vehicles);

            // Test with O/0 confusion
            testVehicle.setLicensePlate("TEST-O-1234");
            Optional<Vehicle> result = plateRecognitionService.matchPlateToVehicle(1L, "TEST-0-1234");
            assertThat(result).isPresent();
        }

        @Test
        @DisplayName("Should not match different plate")
        void shouldNotMatchDifferentPlate() {
            List<Vehicle> vehicles = Arrays.asList(testVehicle);
            when(vehicleRepository.findByUserId(1L)).thenReturn(vehicles);

            Optional<Vehicle> result = plateRecognitionService.matchPlateToVehicle(1L, "XYZ-9999");

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should return empty for blank plate text")
        void shouldReturnEmptyForBlankPlate() {
            Optional<Vehicle> result = plateRecognitionService.matchPlateToVehicle(1L, "");
            assertThat(result).isEmpty();
            verifyNoInteractions(vehicleRepository);
        }

        @Test
        @DisplayName("Should return empty for null plate text")
        void shouldReturnEmptyForNullPlate() {
            Optional<Vehicle> result = plateRecognitionService.matchPlateToVehicle(1L, null);
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should return empty when user has no vehicles")
        void shouldReturnEmptyWhenNoVehicles() {
            when(vehicleRepository.findByUserId(1L)).thenReturn(Collections.emptyList());

            Optional<Vehicle> result = plateRecognitionService.matchPlateToVehicle(1L, "DHAKA-METRO-GA-1234");

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("VerifyPlate Response Tests")
    class VerifyPlateResponseTests {

        @Test
        @DisplayName("noPlate response should have correct structure")
        void noPlateResponseShouldHaveCorrectStructure() {
            PlateVerificationResponse response = PlateVerificationResponse.noPlate();

            assertThat(response.isVerified()).isFalse();
            assertThat(response.getDetectedPlate()).isEmpty();
            assertThat(response.getConfidence()).isEqualTo(0.0);
            assertThat(response.getMatchedVehicleId()).isNull();
        }

        @Test
        @DisplayName("matched response should have correct structure")
        void matchedResponseShouldHaveCorrectStructure() {
            PlateVerificationResponse response = PlateVerificationResponse.matched(
                    "DHAKA-METRO-GA-1234", 0.95, 1L);

            assertThat(response.isVerified()).isTrue();
            assertThat(response.getDetectedPlate()).isEqualTo("DHAKA-METRO-GA-1234");
            assertThat(response.getConfidence()).isEqualTo(0.95);
            assertThat(response.getMatchedVehicleId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("notMatched response should have correct structure")
        void notMatchedResponseShouldHaveCorrectStructure() {
            PlateVerificationResponse response = PlateVerificationResponse.notMatched(
                    "UNKNOWN-123", 0.80);

            assertThat(response.isVerified()).isFalse();
            assertThat(response.getDetectedPlate()).isEqualTo("UNKNOWN-123");
            assertThat(response.getConfidence()).isEqualTo(0.80);
            assertThat(response.getMatchedVehicleId()).isNull();
        }
    }

    @Nested
    @DisplayName("PlateDetectionResult Tests")
    class PlateDetectionResultTests {

        @Test
        @DisplayName("Should deserialize plate detection result")
        void shouldDeserializePlateDetectionResult() throws Exception {
            String json = "{\"plateDetected\":true,\"plateText\":\"DHAKA-METRO-GA-1234\",\"confidence\":0.95}";

            ObjectMapper realMapper = new ObjectMapper();
            PlateDetectionResult result = realMapper.readValue(json, PlateDetectionResult.class);

            assertThat(result.isPlateDetected()).isTrue();
            assertThat(result.getPlateText()).isEqualTo("DHAKA-METRO-GA-1234");
            assertThat(result.getConfidence()).isEqualTo(0.95);
        }

        @Test
        @DisplayName("Should handle no plate detected response")
        void shouldHandleNoPlateDetectedResponse() throws Exception {
            String json = "{\"plateDetected\":false,\"plateText\":\"\",\"confidence\":0.0}";

            ObjectMapper realMapper = new ObjectMapper();
            PlateDetectionResult result = realMapper.readValue(json, PlateDetectionResult.class);

            assertThat(result.isPlateDetected()).isFalse();
            assertThat(result.getPlateText()).isEmpty();
            assertThat(result.getConfidence()).isEqualTo(0.0);
        }
    }

    @Nested
    @DisplayName("PlateVerificationLog Entity Tests")
    class PlateVerificationLogTests {

        @Test
        @DisplayName("Should create log with all fields")
        void shouldCreateLogWithAllFields() {
            PlateVerificationLog log = new PlateVerificationLog();
            log.setUserId(1L);
            log.setDetectedPlate("DHAKA-METRO-GA-1234");
            log.setConfidence(0.95);
            log.setVerified(true);
            log.setMatchedVehicleId(1L);
            log.setImagePath("/uploads/plate.jpg");
            log.setProcessingTimeMs(150.0);
            // onCreate is protected; simulate @PrePersist by setting createdAt directly
            log.setCreatedAt(LocalDateTime.now());

            assertThat(log.getUserId()).isEqualTo(1L);
            assertThat(log.getDetectedPlate()).isEqualTo("DHAKA-METRO-GA-1234");
            assertThat(log.getConfidence()).isEqualTo(0.95);
            assertThat(log.getVerified()).isTrue();
            assertThat(log.getMatchedVehicleId()).isEqualTo(1L);
            assertThat(log.getImagePath()).isEqualTo("/uploads/plate.jpg");
            assertThat(log.getProcessingTimeMs()).isEqualTo(150.0);
            assertThat(log.getCreatedAt()).isNotNull();
        }
    }
}