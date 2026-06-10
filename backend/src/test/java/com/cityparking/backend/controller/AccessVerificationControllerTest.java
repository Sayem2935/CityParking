package com.cityparking.backend.controller;

import com.cityparking.backend.dto.faceverification.FaceVerificationResponse;
import com.cityparking.backend.dto.plateverification.PlateVerificationResponse;
import com.cityparking.backend.entity.AccessDecision;
import com.cityparking.backend.entity.AccessLog;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.security.JwtTokenProvider;
import com.cityparking.backend.service.AccessDecisionResult;
import com.cityparking.backend.service.AccessDecisionService;
import com.cityparking.backend.service.FaceVerificationService;
import com.cityparking.backend.service.PlateRecognitionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AccessVerificationController.class)
@DisplayName("AccessVerificationController Tests")
class AccessVerificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FaceVerificationService faceVerificationService;

    @MockBean
    private PlateRecognitionService plateRecognitionService;

    @MockBean
    private AccessDecisionService accessDecisionService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    private MockMultipartFile faceImage;
    private MockMultipartFile plateImage;
    private AccessLog savedAccessLog;

    @BeforeEach
    void setUp() {
        faceImage = new MockMultipartFile(
                "faceImage", "face.jpg", "image/jpeg", "fake-face-data".getBytes()
        );
        plateImage = new MockMultipartFile(
                "plateImage", "plate.jpg", "image/jpeg", "fake-plate-data".getBytes()
        );

        savedAccessLog = new AccessLog();
        savedAccessLog.setId(1L);
    }

    // =========================================================================
    // Test 1: Valid user + Valid vehicle → ACCESS_GRANTED
    // =========================================================================

    @Test
    @DisplayName("Test 1: Should return ACCESS_GRANTED for valid user + valid vehicle")
    @WithMockUser(username = "test@example.com")
    void shouldReturnAccessGrantedForValidUserAndVehicle() throws Exception {
        FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                .verified(true).userId(1L).confidence(0.92)
                .message("Face matched").build();
        PlateVerificationResponse plateResult = PlateVerificationResponse.matched(
                "DHAKA-METRO-GA-1234", 0.95, 1L);
        AccessDecisionResult decisionResult = AccessDecisionResult.builder()
                .decision(AccessDecision.ACCESS_GRANTED)
                .accessLog(savedAccessLog)
                .securityEvents(Collections.emptyList())
                .processingTimeMs(100.0)
                .build();

        when(faceVerificationService.verifyFace(any())).thenReturn(faceResult);
        when(plateRecognitionService.verifyPlate(any(Long.class), any())).thenReturn(plateResult);
        when(accessDecisionService.makeDecision(any(), any())).thenReturn(decisionResult);

        mockMvc.perform(multipart("/api/access/verify")
                        .file(faceImage)
                        .file(plateImage)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.decision").value("ACCESS_GRANTED"))
                .andExpect(jsonPath("$.data.userId").value(1))
                .andExpect(jsonPath("$.data.vehicleId").value(1))
                .andExpect(jsonPath("$.data.faceConfidence").value(0.92))
                .andExpect(jsonPath("$.data.plateConfidence").value(0.95))
                .andExpect(jsonPath("$.data.faceVerified").value(true))
                .andExpect(jsonPath("$.data.plateVerified").value(true));
    }

    // =========================================================================
    // Test 2: Valid user + Invalid vehicle → SECURITY_ALERT
    // =========================================================================

    @Test
    @DisplayName("Test 2: Should return SECURITY_ALERT for valid user + invalid vehicle")
    @WithMockUser(username = "test@example.com")
    void shouldReturnSecurityAlertForValidUserAndInvalidVehicle() throws Exception {
        FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                .verified(true).userId(1L).confidence(0.92)
                .message("Face matched").build();
        PlateVerificationResponse plateResult = PlateVerificationResponse.notMatched(
                "UNKNOWN-999", 0.80);
        AccessDecisionResult decisionResult = AccessDecisionResult.builder()
                .decision(AccessDecision.SECURITY_ALERT)
                .accessLog(savedAccessLog)
                .securityEvents(Collections.emptyList())
                .processingTimeMs(120.0)
                .build();

        when(faceVerificationService.verifyFace(any())).thenReturn(faceResult);
        when(plateRecognitionService.verifyPlate(any(Long.class), any())).thenReturn(plateResult);
        when(accessDecisionService.makeDecision(any(), any())).thenReturn(decisionResult);

        mockMvc.perform(multipart("/api/access/verify")
                        .file(faceImage)
                        .file(plateImage)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.decision").value("SECURITY_ALERT"))
                .andExpect(jsonPath("$.data.faceVerified").value(true))
                .andExpect(jsonPath("$.data.plateVerified").value(false));
    }

    // =========================================================================
    // Test 3: Invalid user + Valid vehicle → ACCESS_DENIED
    // =========================================================================

    @Test
    @DisplayName("Test 3: Should return ACCESS_DENIED for invalid user + valid vehicle")
    @WithMockUser(username = "test@example.com")
    void shouldReturnAccessDeniedForInvalidUserAndValidVehicle() throws Exception {
        FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                .verified(false).userId(null).confidence(0.30)
                .message("No matching face found").build();
        PlateVerificationResponse plateResult = PlateVerificationResponse.noPlate();
        AccessDecisionResult decisionResult = AccessDecisionResult.builder()
                .decision(AccessDecision.ACCESS_DENIED)
                .accessLog(savedAccessLog)
                .securityEvents(Collections.emptyList())
                .processingTimeMs(90.0)
                .build();

        when(faceVerificationService.verifyFace(any())).thenReturn(faceResult);
        when(plateRecognitionService.verifyPlate(any(Long.class), any())).thenReturn(plateResult);
        when(accessDecisionService.makeDecision(any(), any())).thenReturn(decisionResult);

        mockMvc.perform(multipart("/api/access/verify")
                        .file(faceImage)
                        .file(plateImage)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.decision").value("ACCESS_DENIED"))
                .andExpect(jsonPath("$.data.faceVerified").value(false));
    }

    // =========================================================================
    // Test 4: Invalid user + Invalid vehicle → ACCESS_DENIED
    // =========================================================================

    @Test
    @DisplayName("Test 4: Should return ACCESS_DENIED for invalid user + invalid vehicle")
    @WithMockUser(username = "test@example.com")
    void shouldReturnAccessDeniedForInvalidUserAndInvalidVehicle() throws Exception {
        FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                .verified(false).userId(null).confidence(0.20)
                .message("No matching face found").build();
        PlateVerificationResponse plateResult = PlateVerificationResponse.noPlate();
        AccessDecisionResult decisionResult = AccessDecisionResult.builder()
                .decision(AccessDecision.ACCESS_DENIED)
                .accessLog(savedAccessLog)
                .securityEvents(Collections.emptyList())
                .processingTimeMs(85.0)
                .build();

        when(faceVerificationService.verifyFace(any())).thenReturn(faceResult);
        when(plateRecognitionService.verifyPlate(any(Long.class), any())).thenReturn(plateResult);
        when(accessDecisionService.makeDecision(any(), any())).thenReturn(decisionResult);

        mockMvc.perform(multipart("/api/access/verify")
                        .file(faceImage)
                        .file(plateImage)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.decision").value("ACCESS_DENIED"))
                .andExpect(jsonPath("$.data.faceVerified").value(false))
                .andExpect(jsonPath("$.data.plateVerified").value(false));
    }

    // =========================================================================
    // Validation Tests
    // =========================================================================

    @Test
    @DisplayName("Should reject request with empty face image")
    @WithMockUser(username = "test@example.com")
    void shouldRejectEmptyFaceImage() throws Exception {
        MockMultipartFile emptyFace = new MockMultipartFile(
                "faceImage", "empty.jpg", "image/jpeg", new byte[0]
        );

        mockMvc.perform(multipart("/api/access/verify")
                        .file(emptyFace)
                        .file(plateImage)
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should reject request with empty plate image")
    @WithMockUser(username = "test@example.com")
    void shouldRejectEmptyPlateImage() throws Exception {
        MockMultipartFile emptyPlate = new MockMultipartFile(
                "plateImage", "empty.jpg", "image/jpeg", new byte[0]
        );

        mockMvc.perform(multipart("/api/access/verify")
                        .file(faceImage)
                        .file(emptyPlate)
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should reject request without face image")
    @WithMockUser(username = "test@example.com")
    void shouldRejectMissingFaceImage() throws Exception {
        mockMvc.perform(multipart("/api/access/verify")
                        .file(plateImage)
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should reject unauthorized request")
    void shouldRejectUnauthorizedRequest() throws Exception {
        mockMvc.perform(multipart("/api/access/verify")
                        .file(faceImage)
                        .file(plateImage)
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should reject non-image file for face")
    @WithMockUser(username = "test@example.com")
    void shouldRejectNonImageFileForFace() throws Exception {
        MockMultipartFile textFile = new MockMultipartFile(
                "faceImage", "file.txt", "text/plain", "not an image".getBytes()
        );

        mockMvc.perform(multipart("/api/access/verify")
                        .file(textFile)
                        .file(plateImage)
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should include processing time in response")
    @WithMockUser(username = "test@example.com")
    void shouldIncludeProcessingTimeInResponse() throws Exception {
        FaceVerificationResponse faceResult = FaceVerificationResponse.builder()
                .verified(true).userId(1L).confidence(0.95)
                .message("Matched").build();
        PlateVerificationResponse plateResult = PlateVerificationResponse.matched(
                "GA-1234", 0.95, 1L);
        AccessDecisionResult decisionResult = AccessDecisionResult.builder()
                .decision(AccessDecision.ACCESS_GRANTED)
                .accessLog(savedAccessLog)
                .securityEvents(Collections.emptyList())
                .processingTimeMs(50.0)
                .build();

        when(faceVerificationService.verifyFace(any())).thenReturn(faceResult);
        when(plateRecognitionService.verifyPlate(any(Long.class), any())).thenReturn(plateResult);
        when(accessDecisionService.makeDecision(any(), any())).thenReturn(decisionResult);

        mockMvc.perform(multipart("/api/access/verify")
                        .file(faceImage)
                        .file(plateImage)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.processingTimeMs").isNumber())
                .andExpect(jsonPath("$.data.accessLogId").value(1))
                .andExpect(jsonPath("$.data.timestamp").exists());
    }
}