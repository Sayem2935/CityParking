package com.cityparking.backend.service;

import com.cityparking.backend.dto.faceenrollment.FaceEnrollmentResponse;
import com.cityparking.backend.dto.faceenrollment.FaceEnrollmentStatusResponse;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FaceEnrollmentServiceTest {

    @Mock
    private FaceEnrollmentRepository faceEnrollmentRepository;

    @Mock
    private FaceRecognitionService faceRecognitionService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private FaceEnrollmentService faceEnrollmentService;

    private FaceEnrollment testEnrollment;
    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);

        testEnrollment = new FaceEnrollment();
        testEnrollment.setId(1L);
        testEnrollment.setUser(testUser);
        testEnrollment.setVideoPath("/uploads/video.mp4");
        testEnrollment.setImagePath("/uploads/face.jpg");
        testEnrollment.setStatus(FaceEnrollment.EnrollmentStatus.PENDING);
        testEnrollment.setProvider("mock");
        testEnrollment.setProcessingAttempts(0);
        testEnrollment.setCreatedAt(LocalDateTime.now());
        testEnrollment.setUpdatedAt(LocalDateTime.now());
    }

    @Test
    void createEnrollment_SavesRecord() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(faceEnrollmentRepository.save(any(FaceEnrollment.class))).thenReturn(testEnrollment);

        FaceEnrollment result = faceEnrollmentService.createEnrollment(1L, "/uploads/video.mp4", "/uploads/face.jpg");

        assertNotNull(result);
        assertEquals(FaceEnrollment.EnrollmentStatus.PENDING, result.getStatus());
        verify(faceEnrollmentRepository).save(any(FaceEnrollment.class));
    }

    @Test
    void getEnrollmentStatus_WithCompletedEnrollment_ReturnsEnrolled() {
        testEnrollment.setStatus(FaceEnrollment.EnrollmentStatus.COMPLETED);
        when(faceEnrollmentRepository.findFirstByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Optional.of(testEnrollment));

        FaceEnrollmentStatusResponse response = faceEnrollmentService.getEnrollmentStatus(1L);

        assertEquals(FaceEnrollment.EnrollmentStatus.COMPLETED, response.getStatus());
        assertEquals(1L, response.getUserId());
    }

    @Test
    void getEnrollmentStatus_WithNoEnrollment_ReturnsNotEnrolled() {
        when(faceEnrollmentRepository.findFirstByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Optional.empty());

        FaceEnrollmentStatusResponse response = faceEnrollmentService.getEnrollmentStatus(1L);

        assertEquals(FaceEnrollment.EnrollmentStatus.PENDING, response.getStatus());
    }

    @Test
    void getUserEnrollments_ReturnsList() {
        when(faceEnrollmentRepository.findByUserId(1L)).thenReturn(List.of(testEnrollment));

        List<FaceEnrollmentResponse> responses = faceEnrollmentService.getUserEnrollments(1L);

        assertEquals(1, responses.size());
        assertEquals(1L, responses.get(0).getId());
    }

    @Test
    void deleteEnrollment_WithCompletedEnrollment_DeletesFromRekognitionAndDb() {
        testEnrollment.setStatus(FaceEnrollment.EnrollmentStatus.COMPLETED);
        testEnrollment.setExternalFaceId("aws-face-123");

        when(faceEnrollmentRepository.findFirstByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Optional.of(testEnrollment));
        when(faceRecognitionService.deleteFace("aws-face-123")).thenReturn(true);

        boolean result = faceEnrollmentService.deleteEnrollment(1L);

        assertTrue(result);
        verify(faceRecognitionService).deleteFace("aws-face-123");
        verify(faceEnrollmentRepository).delete(testEnrollment);
    }

    @Test
    void deleteEnrollment_WithNoEnrollment_ReturnsFalse() {
        when(faceEnrollmentRepository.findFirstByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Optional.empty());

        boolean result = faceEnrollmentService.deleteEnrollment(1L);

        assertFalse(result);
    }
}