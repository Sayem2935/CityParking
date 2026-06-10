package com.cityparking.backend.service;

import com.cityparking.backend.dto.faceverification.FaceVerificationResponse;
import com.cityparking.backend.dto.plateverification.PlateVerificationResponse;
import com.cityparking.backend.entity.*;
import com.cityparking.backend.repository.AccessLogRepository;
import com.cityparking.backend.repository.SecurityEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AccessDecisionService Tests")
class AccessDecisionServiceTest {

    @Mock
    private AccessLogRepository accessLogRepository;

    @Mock
    private SecurityEventRepository securityEventRepository;

    @InjectMocks
    private AccessDecisionService accessDecisionService;

    private AccessLog savedAccessLog;

    @BeforeEach
    void setUp() {
        savedAccessLog = new AccessLog();
        savedAccessLog.setId(1L);
        savedAccessLog.setFaceVerified(false);
        savedAccessLog.setPlateVerified(false);
    }

    // =========================================================================
    // Decision Rules Tests
    // =========================================================================

    @Nested
    @DisplayName("Rule 1: Face verified + Plate verified → ACCESS_GRANTED")
    class BothVerifiedTests {

        @Test
        @DisplayName("Should grant access when both face and plate are verified")
        void shouldGrantAccessWhenBothVerified() {
            // Arrange
            FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                    .verified(true)
                    .userId(1L)
                    .confidence(0.92)
                    .message("Face matched with enrolled user")
                    .build();

            PlateVerificationResponse plateResult = PlateVerificationResponse.matched(
                    "DHAKA-METRO-GA-1234", 0.95, 1L);

            when(accessLogRepository.save(any(AccessLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            // Act
            AccessDecisionResult result = accessDecisionService.makeDecision(faceResult, plateResult);

            // Assert
            assertEquals(AccessDecision.ACCESS_GRANTED, result.getDecision());
            assertNotNull(result.getAccessLog());
            assertTrue(result.getSecurityEvents().isEmpty());

            // Verify access log was saved
            ArgumentCaptor<AccessLog> logCaptor = ArgumentCaptor.forClass(AccessLog.class);
            verify(accessLogRepository).save(logCaptor.capture());
            AccessLog capturedLog = logCaptor.getValue();
            assertEquals(AccessDecision.ACCESS_GRANTED, capturedLog.getDecision());
            assertTrue(capturedLog.getFaceVerified());
            assertTrue(capturedLog.getPlateVerified());
            assertEquals(0.92, capturedLog.getFaceConfidence());
            assertEquals(0.95, capturedLog.getPlateConfidence());
        }
    }

    @Nested
    @DisplayName("Rule 2: Face failed → ACCESS_DENIED")
    class FaceFailedTests {

        @Test
        @DisplayName("Should deny access when face verification fails")
        void shouldDenyAccessWhenFaceFailed() {
            // Arrange
            FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                    .verified(false)
                    .userId(null)
                    .confidence(0.35)
                    .message("No matching face found")
                    .build();

            PlateVerificationResponse plateResult = PlateVerificationResponse.noPlate();

            when(accessLogRepository.save(any(AccessLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            // Act
            AccessDecisionResult result = accessDecisionService.makeDecision(faceResult, plateResult);

            // Assert
            assertEquals(AccessDecision.ACCESS_DENIED, result.getDecision());
            assertFalse(result.getAccessLog().getFaceVerified());

            // Verify security event was generated for face mismatch
            assertFalse(result.getSecurityEvents().isEmpty());
            assertEquals(SecurityEventType.FACE_MISMATCH, result.getSecurityEvents().get(0).getEventType());
        }

        @Test
        @DisplayName("Should deny access when face fails but plate is verified")
        void shouldDenyAccessWhenFaceFailedPlateVerified() {
            // Arrange
            FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                    .verified(false)
                    .userId(null)
                    .confidence(0.40)
                    .message("No matching face found")
                    .build();

            PlateVerificationResponse plateResult = PlateVerificationResponse.matched(
                    "DHAKA-METRO-GA-1234", 0.95, 1L);

            when(accessLogRepository.save(any(AccessLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            // Act
            AccessDecisionResult result = accessDecisionService.makeDecision(faceResult, plateResult);

            // Assert
            assertEquals(AccessDecision.ACCESS_DENIED, result.getDecision());
            assertFalse(result.getAccessLog().getFaceVerified());
            assertTrue(result.getAccessLog().getPlateVerified());
        }
    }

    @Nested
    @DisplayName("Rule 3: Plate failed → ACCESS_DENIED")
    class PlateFailedTests {

        @Test
        @DisplayName("Should deny access when plate verification fails")
        void shouldDenyAccessWhenPlateFailed() {
            // Arrange
            FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                    .verified(true)
                    .userId(1L)
                    .confidence(0.92)
                    .message("Face matched with enrolled user")
                    .build();

            PlateVerificationResponse plateResult = PlateVerificationResponse.notMatched(
                    "UNKNOWN-123", 0.80);

            when(accessLogRepository.save(any(AccessLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            // Act
            AccessDecisionResult result = accessDecisionService.makeDecision(faceResult, plateResult);

            // Assert
            // Note: Face verified + plate mismatch → SECURITY_ALERT (Rule 4)
            assertEquals(AccessDecision.SECURITY_ALERT, result.getDecision());
        }
    }

    @Nested
    @DisplayName("Rule 4: Face verified but plate mismatch → SECURITY_ALERT")
    class SecurityAlertTests {

        @Test
        @DisplayName("Should trigger security alert when face verified but plate mismatch")
        void shouldTriggerSecurityAlertWhenFaceVerifiedPlateMismatch() {
            // Arrange
            FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                    .verified(true)
                    .userId(1L)
                    .confidence(0.92)
                    .message("Face matched with enrolled user")
                    .build();

            PlateVerificationResponse plateResult = PlateVerificationResponse.notMatched(
                    "STOLEN-PLATE-999", 0.85);

            when(accessLogRepository.save(any(AccessLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            // Act
            AccessDecisionResult result = accessDecisionService.makeDecision(faceResult, plateResult);

            // Assert
            assertEquals(AccessDecision.SECURITY_ALERT, result.getDecision());
            assertTrue(result.getAccessLog().getFaceVerified());
            assertFalse(result.getAccessLog().getPlateVerified());

            // Verify security event for plate mismatch
            assertTrue(result.getSecurityEvents().stream()
                    .anyMatch(e -> e.getEventType() == SecurityEventType.PLATE_MISMATCH));
        }
    }

    @Nested
    @DisplayName("Security Events Generation Tests")
    class SecurityEventsTests {

        @Test
        @DisplayName("Should generate FACE_MISMATCH event when face fails with confidence > 0")
        void shouldGenerateFaceMismatchEvent() {
            // Arrange
            FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                    .verified(false)
                    .userId(null)
                    .confidence(0.45)
                    .message("No matching face found")
                    .build();

            PlateVerificationResponse plateResult = PlateVerificationResponse.noPlate();

            when(accessLogRepository.save(any(AccessLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            // Act
            AccessDecisionResult result = accessDecisionService.makeDecision(faceResult, plateResult);

            // Assert
            assertFalse(result.getSecurityEvents().isEmpty());
            assertTrue(result.getSecurityEvents().stream()
                    .anyMatch(e -> e.getEventType() == SecurityEventType.FACE_MISMATCH));
            assertTrue(result.getSecurityEvents().stream()
                    .anyMatch(e -> e.getSeverity() == SecurityEvent.Severity.HIGH));
        }

        @Test
        @DisplayName("Should generate PLATE_MISMATCH event when plate fails with confidence > 0")
        void shouldGeneratePlateMismatchEvent() {
            // Arrange
            FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                    .verified(true)
                    .userId(1L)
                    .confidence(0.92)
                    .message("Face matched")
                    .build();

            PlateVerificationResponse plateResult = PlateVerificationResponse.notMatched(
                    "UNKNOWN-123", 0.78);

            when(accessLogRepository.save(any(AccessLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            // Act
            AccessDecisionResult result = accessDecisionService.makeDecision(faceResult, plateResult);

            // Assert
            assertTrue(result.getSecurityEvents().stream()
                    .anyMatch(e -> e.getEventType() == SecurityEventType.PLATE_MISMATCH));
        }

        @Test
        @DisplayName("Should generate MULTIPLE_FACES event when multipleFacesDetected flag is true")
        void shouldGenerateMultipleFacesEvent() {
            // Arrange
            FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                    .verified(false)
                    .userId(null)
                    .confidence(0.0)
                    .message("Multiple faces detected in the image")
                    .multipleFacesDetected(true)
                    .build();

            PlateVerificationResponse plateResult = PlateVerificationResponse.noPlate();

            when(accessLogRepository.save(any(AccessLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            // Act
            AccessDecisionResult result = accessDecisionService.makeDecision(faceResult, plateResult);

            // Assert
            assertTrue(result.getSecurityEvents().stream()
                    .anyMatch(e -> e.getEventType() == SecurityEventType.MULTIPLE_FACES));
            assertTrue(result.getSecurityEvents().stream()
                    .anyMatch(e -> e.getSeverity() == SecurityEvent.Severity.CRITICAL));
        }

        @Test
        @DisplayName("Should generate MULTIPLE_PLATES event when message contains 'multiple'")
        void shouldGenerateMultiplePlatesEvent() {
            // Arrange
            FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                    .verified(true)
                    .userId(1L)
                    .confidence(0.92)
                    .message("Face matched")
                    .build();

            PlateVerificationResponse plateResult = PlateVerificationResponse.multiplePlates(
                    "MULTIPLE", 0.0);

            when(accessLogRepository.save(any(AccessLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            // Act
            AccessDecisionResult result = accessDecisionService.makeDecision(faceResult, plateResult);

            // Assert
            assertTrue(result.getSecurityEvents().stream()
                    .anyMatch(e -> e.getEventType() == SecurityEventType.MULTIPLE_PLATES));
        }
    }

    @Nested
    @DisplayName("Edge Cases")
    class EdgeCaseTests {

        @Test
        @DisplayName("Should handle null userId in face result")
        void shouldHandleNullUserId() {
            // Arrange
            FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                    .verified(false)
                    .userId(null)
                    .confidence(0.0)
                    .message("No face detected")
                    .build();

            PlateVerificationResponse plateResult = PlateVerificationResponse.noPlate();

            when(accessLogRepository.save(any(AccessLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            // Act
            AccessDecisionResult result = accessDecisionService.makeDecision(faceResult, plateResult);

            // Assert
            assertEquals(AccessDecision.ACCESS_DENIED, result.getDecision());
            assertNull(result.getAccessLog().getUser());
        }

        @Test
        @DisplayName("Should handle null matchedVehicleId in plate result")
        void shouldHandleNullVehicleId() {
            // Arrange
            FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                    .verified(false)
                    .userId(null)
                    .confidence(0.0)
                    .message("No face detected")
                    .build();

            PlateVerificationResponse plateResult = PlateVerificationResponse.noPlate();

            when(accessLogRepository.save(any(AccessLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            // Act
            AccessDecisionResult result = accessDecisionService.makeDecision(faceResult, plateResult);

            // Assert
            assertEquals(AccessDecision.ACCESS_DENIED, result.getDecision());
            assertNull(result.getAccessLog().getVehicle());
        }

        @Test
        @DisplayName("Should save security events linked to access log")
        void shouldSaveSecurityEventsLinkedToAccessLog() {
            // Arrange
            FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                    .verified(false)
                    .userId(null)
                    .confidence(0.35)
                    .message("No matching face found")
                    .build();

            PlateVerificationResponse plateResult = PlateVerificationResponse.noPlate();

            when(accessLogRepository.save(any(AccessLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            // Act
            AccessDecisionResult result = accessDecisionService.makeDecision(faceResult, plateResult);

            // Assert
            verify(securityEventRepository).saveAll(any());
            assertFalse(result.getSecurityEvents().isEmpty());
            // Each security event should reference the saved access log
            result.getSecurityEvents().forEach(event ->
                    assertEquals(result.getAccessLog(), event.getAccessLog()));
        }
    }

    // =========================================================================
    // Combined Scenario Tests (matching Sprint 9 Part E requirements)
    // =========================================================================

    @Nested
    @DisplayName("Sprint 9 Part E: Test Scenarios")
    class SprintTestScenarios {

        @Test
        @DisplayName("Test 1: Valid user + Valid vehicle → ACCESS_GRANTED")
        void test1_validUser_validVehicle_accessGranted() {
            FaceVerificationResponse face = FaceVerificationResponse.builder()
                    .verified(true).userId(1L).confidence(0.95)
                    .message("Face matched").build();
            PlateVerificationResponse plate = PlateVerificationResponse.matched("GA-1234", 0.95, 1L);

            when(accessLogRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            AccessDecisionResult result = accessDecisionService.makeDecision(face, plate);

            assertEquals(AccessDecision.ACCESS_GRANTED, result.getDecision());
            assertTrue(result.getSecurityEvents().isEmpty());
        }

        @Test
        @DisplayName("Test 2: Valid user + Invalid vehicle → SECURITY_ALERT")
        void test2_validUser_invalidVehicle_securityAlert() {
            FaceVerificationResponse face = FaceVerificationResponse.builder()
                    .verified(true).userId(1L).confidence(0.95)
                    .message("Face matched").build();
            PlateVerificationResponse plate = PlateVerificationResponse.notMatched("WRONG-999", 0.82);

            when(accessLogRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            AccessDecisionResult result = accessDecisionService.makeDecision(face, plate);

            assertEquals(AccessDecision.SECURITY_ALERT, result.getDecision());
            assertTrue(result.getSecurityEvents().stream()
                    .anyMatch(e -> e.getEventType() == SecurityEventType.PLATE_MISMATCH));
        }

        @Test
        @DisplayName("Test 3: Invalid user + Valid vehicle → ACCESS_DENIED")
        void test3_invalidUser_validVehicle_accessDenied() {
            FaceVerificationResponse face = FaceVerificationResponse.builder()
                    .verified(false).userId(null).confidence(0.30)
                    .message("No match found").build();
            PlateVerificationResponse plate = PlateVerificationResponse.matched("GA-1234", 0.95, 1L);

            when(accessLogRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            AccessDecisionResult result = accessDecisionService.makeDecision(face, plate);

            assertEquals(AccessDecision.ACCESS_DENIED, result.getDecision());
        }

        @Test
        @DisplayName("Test 4: Invalid user + Invalid vehicle → ACCESS_DENIED")
        void test4_invalidUser_invalidVehicle_accessDenied() {
            FaceVerificationResponse face = FaceVerificationResponse.builder()
                    .verified(false).userId(null).confidence(0.20)
                    .message("No match found").build();
            PlateVerificationResponse plate = PlateVerificationResponse.noPlate();

            when(accessLogRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            AccessDecisionResult result = accessDecisionService.makeDecision(face, plate);

            assertEquals(AccessDecision.ACCESS_DENIED, result.getDecision());
        }

        @Test
        @DisplayName("Test 5: Multiple faces → ACCESS_DENIED with MULTIPLE_FACES event")
        void test5_multipleFaces_securityAlert() {
            FaceVerificationResponse face = FaceVerificationResponse.builder()
                    .verified(false).userId(null).confidence(0.0)
                    .message("Multiple faces detected in the image")
                    .multipleFacesDetected(true).build();
            PlateVerificationResponse plate = PlateVerificationResponse.noPlate();

            when(accessLogRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            AccessDecisionResult result = accessDecisionService.makeDecision(face, plate);

            assertEquals(AccessDecision.ACCESS_DENIED, result.getDecision());
            assertTrue(result.getSecurityEvents().stream()
                    .anyMatch(e -> e.getEventType() == SecurityEventType.MULTIPLE_FACES
                            && e.getSeverity() == SecurityEvent.Severity.CRITICAL));
        }

        @Test
        @DisplayName("Test 6: Multiple vehicles/plates → Security event generated")
        void test6_multipleVehicles_securityEvent() {
            FaceVerificationResponse face = FaceVerificationResponse.builder()
                    .verified(true).userId(1L).confidence(0.90)
                    .message("Face matched").build();
            PlateVerificationResponse plate = PlateVerificationResponse.multiplePlates(
                    "MULTI", 0.0);

            when(accessLogRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
            when(securityEventRepository.saveAll(any())).thenReturn(List.of());

            AccessDecisionResult result = accessDecisionService.makeDecision(face, plate);

            assertEquals(AccessDecision.SECURITY_ALERT, result.getDecision());
            assertTrue(result.getSecurityEvents().stream()
                    .anyMatch(e -> e.getEventType() == SecurityEventType.MULTIPLE_PLATES
                            && e.getSeverity() == SecurityEvent.Severity.CRITICAL));
        }
    }
}