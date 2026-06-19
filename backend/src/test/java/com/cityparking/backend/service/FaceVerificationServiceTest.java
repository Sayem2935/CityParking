package com.cityparking.backend.service;

import com.cityparking.backend.dto.faceverification.FaceVerificationResponse;
import com.cityparking.backend.entity.FaceEnrollment;
import com.cityparking.backend.entity.User;
import com.cityparking.backend.repository.FaceEnrollmentRepository;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.service.ai.FaceRecognitionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FaceVerificationServiceTest {

    @Mock
    private FaceRecognitionService faceRecognitionService;

    @Mock
    private FaceEnrollmentRepository faceEnrollmentRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private FaceVerificationService faceVerificationService;

    private User testUser;
    private FaceEnrollment testEnrollment;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setFirstName("John");
        testUser.setLastName("Doe");
        testUser.setEmail("john@example.com");

        testEnrollment = new FaceEnrollment();
        testEnrollment.setId(1L);
        testEnrollment.setUserId(1L);
        testEnrollment.setStatus(FaceEnrollment.EnrollmentStatus.ENROLLED);
        testEnrollment.setExternalFaceId("aws-face-123");
        testEnrollment.setCollectionId("test-collection");
        testEnrollment.setProvider("aws");
    }

    @Test
    void verifyFace_SuccessfulMatch_ReturnsVerified() {
        // Arrange
        byte[] imageBytes = new byte[]{1, 2, 3};
        FaceRecognitionService.FaceVerifyResult verifyResult =
                new FaceRecognitionService.FaceVerifyResult("aws-face-123", 1L, 99.5f, "aws", true);

        when(faceRecognitionService.verifyFace(imageBytes)).thenReturn(verifyResult);
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(faceEnrollmentRepository.findFirstByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Optional.of(testEnrollment));

        // Act
        FaceVerificationResponse response = faceVerificationService.verifyFace(imageBytes);

        // Assert
        assertTrue(response.isVerified());
        assertEquals(1L, response.getUserId());
        assertEquals("John Doe", response.getUserName());
        assertEquals("john@example.com", response.getUserEmail());
        assertEquals(99.5, response.getConfidence());
        assertEquals("aws", response.getProvider());
        assertEquals("aws-face-123", response.getExternalFaceId());
    }

    @Test
    void verifyFace_NoMatch_ReturnsNotVerified() {
        // Arrange
        byte[] imageBytes = new byte[]{1, 2, 3};
        FaceRecognitionService.FaceVerifyResult verifyResult =
                new FaceRecognitionService.FaceVerifyResult(null, null, 0.0f, "aws", false);

        when(faceRecognitionService.verifyFace(imageBytes)).thenReturn(verifyResult);

        // Act
        FaceVerificationResponse response = faceVerificationService.verifyFace(imageBytes);

        // Assert
        assertFalse(response.isVerified());
        assertNull(response.getUserId());
        assertEquals("No matching face found in the system", response.getMessage());
    }

    @Test
    void verifyFace_MatchedButNoUser_ReturnsNotVerified() {
        // Arrange
        byte[] imageBytes = new byte[]{1, 2, 3};
        FaceRecognitionService.FaceVerifyResult verifyResult =
                new FaceRecognitionService.FaceVerifyResult("aws-face-123", 999L, 95.0f, "aws", true);

        when(faceRecognitionService.verifyFace(imageBytes)).thenReturn(verifyResult);
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        // Act
        FaceVerificationResponse response = faceVerificationService.verifyFace(imageBytes);

        // Assert
        assertFalse(response.isVerified());
        assertEquals("Face recognized but user account not found", response.getMessage());
    }

    @Test
    void verifyFace_MatchedButEnrollmentInactive_ReturnsNotVerified() {
        // Arrange
        byte[] imageBytes = new byte[]{1, 2, 3};
        FaceRecognitionService.FaceVerifyResult verifyResult =
                new FaceRecognitionService.FaceVerifyResult("aws-face-123", 1L, 95.0f, "aws", true);

        FaceEnrollment failedEnrollment = new FaceEnrollment();
        failedEnrollment.setStatus(FaceEnrollment.EnrollmentStatus.FAILED);

        when(faceRecognitionService.verifyFace(imageBytes)).thenReturn(verifyResult);
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(faceEnrollmentRepository.findFirstByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Optional.of(failedEnrollment));

        // Act
        FaceVerificationResponse response = faceVerificationService.verifyFace(imageBytes);

        // Assert
        assertFalse(response.isVerified());
        assertEquals("User face enrollment is not active", response.getMessage());
    }

    @Test
    void hasActiveEnrollment_CompletedEnrollment_ReturnsTrue() {
        when(faceEnrollmentRepository.findFirstByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Optional.of(testEnrollment));

        assertTrue(faceVerificationService.hasActiveEnrollment(1L));
    }

    @Test
    void hasActiveEnrollment_NoEnrollment_ReturnsFalse() {
        when(faceEnrollmentRepository.findFirstByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Optional.empty());

        assertFalse(faceVerificationService.hasActiveEnrollment(1L));
    }
}
