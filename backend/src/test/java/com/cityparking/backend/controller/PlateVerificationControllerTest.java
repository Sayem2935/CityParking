package com.cityparking.backend.controller;

import com.cityparking.backend.dto.plateverification.PlateVerificationResponse;
import com.cityparking.backend.entity.User;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.security.JwtTokenProvider;
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

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PlateVerificationController.class)
@DisplayName("PlateVerificationController Tests")
class PlateVerificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PlateRecognitionService plateRecognitionService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    private User testUser;
    private MockMultipartFile testImage;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setFirstName("Test");
        testUser.setLastName("User");

        testImage = new MockMultipartFile(
                "image", "plate.jpg", "image/jpeg", "fake-image-data".getBytes()
        );
    }

    @Test
    @DisplayName("Should verify plate successfully")
    @WithMockUser(username = "test@example.com")
    void shouldVerifyPlateSuccessfully() throws Exception {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(plateRecognitionService.verifyPlate(eq(1L), any()))
                .thenReturn(PlateVerificationResponse.matched("DHAKA-METRO-GA-1234", 0.95, 1L));

        mockMvc.perform(multipart("/api/plate-verification/verify")
                        .file(testImage)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verified").value(true))
                .andExpect(jsonPath("$.data.detectedPlate").value("DHAKA-METRO-GA-1234"))
                .andExpect(jsonPath("$.data.confidence").value(0.95))
                .andExpect(jsonPath("$.data.matchedVehicleId").value(1));
    }

    @Test
    @DisplayName("Should return no plate detected")
    @WithMockUser(username = "test@example.com")
    void shouldReturnNoPlateDetected() throws Exception {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(plateRecognitionService.verifyPlate(eq(1L), any()))
                .thenReturn(PlateVerificationResponse.noPlate());

        mockMvc.perform(multipart("/api/plate-verification/verify")
                        .file(testImage)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verified").value(false))
                .andExpect(jsonPath("$.data.detectedPlate").value(""))
                .andExpect(jsonPath("$.data.confidence").value(0.0));
    }

    @Test
    @DisplayName("Should return not matched when plate doesn't match")
    @WithMockUser(username = "test@example.com")
    void shouldReturnNotMatched() throws Exception {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(plateRecognitionService.verifyPlate(eq(1L), any()))
                .thenReturn(PlateVerificationResponse.notMatched("UNKNOWN-123", 0.80));

        mockMvc.perform(multipart("/api/plate-verification/verify")
                        .file(testImage)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verified").value(false))
                .andExpect(jsonPath("$.data.detectedPlate").value("UNKNOWN-123"))
                .andExpect(jsonPath("$.data.confidence").value(0.80))
                .andExpect(jsonPath("$.data.matchedVehicleId").doesNotExist());
    }

    @Test
    @DisplayName("Should reject unauthorized request")
    void shouldRejectUnauthorizedRequest() throws Exception {
        mockMvc.perform(multipart("/api/plate-verification/verify")
                        .file(testImage)
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should handle empty image")
    @WithMockUser(username = "test@example.com")
    void shouldHandleEmptyImage() throws Exception {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));

        MockMultipartFile emptyImage = new MockMultipartFile(
                "image", "empty.jpg", "image/jpeg", new byte[0]
        );

        mockMvc.perform(multipart("/api/plate-verification/verify")
                        .file(emptyImage)
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }
}