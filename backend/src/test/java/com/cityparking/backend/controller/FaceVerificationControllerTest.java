package com.cityparking.backend.controller;

import com.cityparking.backend.dto.faceverification.FaceVerificationResponse;
import com.cityparking.backend.security.JwtTokenProvider;
import com.cityparking.backend.service.FaceVerificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FaceVerificationController.class)
@AutoConfigureMockMvc(addFilters = false)
class FaceVerificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FaceVerificationService faceVerificationService;

    @MockBean
    private AuthenticationManager authenticationManager;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @WithMockUser
    void verifyFace_ShouldReturnVerified_WhenMatchFound() throws Exception {
        FaceVerificationResponse response = FaceVerificationResponse.builder()
                .verified(true)
                .userId(1L)
                .confidence(0.85)
                .externalFaceId("external-face-123")
                .message("Face verified successfully")
                .build();

        when(faceVerificationService.verifyFace(any())).thenReturn(response);

        MockMultipartFile image = new MockMultipartFile(
                "image", "face.jpg", "image/jpeg", "fake-image-bytes".getBytes());

        mockMvc.perform(multipart("/api/face-verification/verify").file(image))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.verified").value(true))
                .andExpect(jsonPath("$.data.userId").value(1))
                .andExpect(jsonPath("$.data.confidence").value(0.85))
                .andExpect(jsonPath("$.data.externalFaceId").value("external-face-123"));
    }

    @Test
    @WithMockUser
    void verifyFace_ShouldReturnNotVerified_WhenNoMatch() throws Exception {
        FaceVerificationResponse response = FaceVerificationResponse.builder()
                .verified(false)
                .userId(null)
                .confidence(0.35)
                .message("Face not recognized. Confidence: 35.00% (threshold: 60.00%)")
                .build();

        when(faceVerificationService.verifyFace(any())).thenReturn(response);

        MockMultipartFile image = new MockMultipartFile(
                "image", "face.jpg", "image/jpeg", "fake-image-bytes".getBytes());

        mockMvc.perform(multipart("/api/face-verification/verify").file(image))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.verified").value(false))
                .andExpect(jsonPath("$.data.userId").doesNotExist())
                .andExpect(jsonPath("$.data.confidence").value(0.35));
    }

    @Test
    @WithMockUser
    void verifyFace_ShouldReturnError_WhenNoFaceDetected() throws Exception {
        FaceVerificationResponse response = FaceVerificationResponse.builder()
                .verified(false)
                .userId(null)
                .confidence(0.0)
                .message("No face detected in the image")
                .build();

        when(faceVerificationService.verifyFace(any())).thenReturn(response);

        MockMultipartFile image = new MockMultipartFile(
                "image", "noface.jpg", "image/jpeg", "dark-image-bytes".getBytes());

        mockMvc.perform(multipart("/api/face-verification/verify").file(image))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.verified").value(false))
                .andExpect(jsonPath("$.data.message").value("No face detected in the image"));
    }

    @Test
    @WithMockUser
    void verifyFace_ShouldReturnBadRequest_WhenNoImageProvided() throws Exception {
        mockMvc.perform(multipart("/api/face-verification/verify"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void verifyFace_ShouldReturnNotVerified_WhenMultipleFacesDetected() throws Exception {
        FaceVerificationResponse response = FaceVerificationResponse.builder()
                .verified(false)
                .userId(null)
                .confidence(0.0)
                .message("Multiple faces detected. Please ensure only one face is visible.")
                .build();

        when(faceVerificationService.verifyFace(any())).thenReturn(response);

        MockMultipartFile image = new MockMultipartFile(
                "image", "multi.jpg", "image/jpeg", "multi-face-bytes".getBytes());

        mockMvc.perform(multipart("/api/face-verification/verify").file(image))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.verified").value(false))
                .andExpect(jsonPath("$.data.message").value("Multiple faces detected. Please ensure only one face is visible."));
    }
}