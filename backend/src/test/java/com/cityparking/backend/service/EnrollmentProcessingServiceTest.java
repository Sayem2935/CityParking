package com.cityparking.backend.service;

import com.cityparking.backend.entity.EnrollmentSession;
import com.cityparking.backend.entity.FaceEmbedding;
import com.cityparking.backend.entity.FaceEnrollment;
import com.cityparking.backend.entity.User;
import com.cityparking.backend.repository.EnrollmentSessionRepository;
import com.cityparking.backend.repository.FaceEmbeddingRepository;
import com.cityparking.backend.repository.FaceEnrollmentRepository;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.service.ai.InsightFaceClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EnrollmentProcessingServiceTest {

    @Mock private EnrollmentSessionRepository sessionRepository;
    @Mock private FaceEmbeddingRepository embeddingRepository;
    @Mock private FaceEnrollmentRepository enrollmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private EnrollmentSessionService sessionService;

    @Test
    void storeEnrollmentResults_marksFaceEnrollmentEnrolled_andCompletesSession() {
        EnrollmentSession session = new EnrollmentSession();
        User user = new User();
        user.setId(42L);
        InsightFaceClient.BatchEmbedding embedding = new InsightFaceClient.BatchEmbedding(
                List.of(0.1, -0.2), "center", 0.99, List.of(1, 2, 3, 4),
                Map.of("yaw", 0.0, "pitch", 0.0, "roll", 0.0), 42.0);
        InsightFaceClient.BatchEnrollResult result = new InsightFaceClient.BatchEnrollResult(
                true, 7, 7, 0, 1, 1, List.of(embedding), List.of(), 10.0);

        when(sessionRepository.findBySessionToken("ses_test")).thenReturn(Optional.of(session));
        when(userRepository.findById(42L)).thenReturn(Optional.of(user));
        when(enrollmentRepository.findFirstByUserIdOrderByCreatedAtDesc(42L)).thenReturn(Optional.empty());
        when(enrollmentRepository.save(any(FaceEnrollment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EnrollmentProcessingService service = new EnrollmentProcessingService(
                sessionRepository, embeddingRepository, enrollmentRepository, userRepository, sessionService);
        service.storeEnrollmentResults("ses_test", 42L, result);

        ArgumentCaptor<FaceEnrollment> enrollmentCaptor = ArgumentCaptor.forClass(FaceEnrollment.class);
        verify(enrollmentRepository, org.mockito.Mockito.atLeastOnce()).save(enrollmentCaptor.capture());
        FaceEnrollment enrollment = enrollmentCaptor.getValue();
        assertEquals(FaceEnrollment.EnrollmentStatus.ENROLLED, enrollment.getStatus());

        ArgumentCaptor<FaceEmbedding> embeddingCaptor = ArgumentCaptor.forClass(FaceEmbedding.class);
        verify(embeddingRepository).save(embeddingCaptor.capture());
        assertSame(user, embeddingCaptor.getValue().getUser());
        assertSame(session, embeddingCaptor.getValue().getSession());
        assertSame(enrollment, embeddingCaptor.getValue().getEnrollment());
        assertEquals("[0.1,-0.2]", embeddingCaptor.getValue().getEmbedding());
        verify(sessionService).completeSession(eq("ses_test"), eq(7), eq(1), eq(1), eq(null), eq(null));
    }
}
