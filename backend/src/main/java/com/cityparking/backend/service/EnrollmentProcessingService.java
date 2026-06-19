package com.cityparking.backend.service;

import com.cityparking.backend.entity.*;
import com.cityparking.backend.repository.*;
import com.cityparking.backend.service.ai.InsightFaceClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

/**
 * Transactional service for storing face enrollment processing results.
 *
 * Separated from EnrollmentSessionController so that embedding storage
 * runs inside a proper Spring @Transactional boundary.  All entity
 * references (User, EnrollmentSession, FaceEnrollment) are loaded
 * within the same transaction, eliminating detached-entity errors.
 */
@Service
public class EnrollmentProcessingService {

    private static final Logger log = LoggerFactory.getLogger(EnrollmentProcessingService.class);

    private final EnrollmentSessionRepository sessionRepository;
    private final FaceEmbeddingRepository embeddingRepository;
    private final FaceEnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final EnrollmentSessionService sessionService;

    public EnrollmentProcessingService(
            EnrollmentSessionRepository sessionRepository,
            FaceEmbeddingRepository embeddingRepository,
            FaceEnrollmentRepository enrollmentRepository,
            UserRepository userRepository,
            EnrollmentSessionService sessionService) {
        this.sessionRepository = sessionRepository;
        this.embeddingRepository = embeddingRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.userRepository = userRepository;
        this.sessionService = sessionService;
    }

    /**
     * Store enrollment results in a single transaction.
     *
     * All entity references are re-loaded inside THIS transaction so they
     * are managed (not detached) when Hibernate persists the FaceEmbedding rows.
     *
     * @param sessionToken the session token
     * @param userId       the user's ID
     * @param result       the BatchEnrollResult from FastAPI
     */
    @Transactional
    public void storeEnrollmentResults(
            String sessionToken,
            Long userId,
            InsightFaceClient.BatchEnrollResult result) {

        // Re-load session within THIS transaction → managed entity
        EnrollmentSession session = sessionRepository.findBySessionToken(sessionToken)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionToken));

        // Re-load user within THIS transaction → managed entity
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        // Supersede previous embeddings for this user
        embeddingRepository.supersedePreviousEmbeddings(userId);

        // Get or create enrollment record
        FaceEnrollment enrollment = enrollmentRepository
                .findFirstByUserIdOrderByCreatedAtDesc(userId)
                .orElseGet(() -> {
                    FaceEnrollment newEnrollment = new FaceEnrollment();
                    newEnrollment.setUser(user);
                    newEnrollment.setStatus(FaceEnrollment.EnrollmentStatus.PROCESSING);
                    newEnrollment.setProvider("insightface");
                    return enrollmentRepository.save(newEnrollment);
                });

        // Store each embedding
        for (InsightFaceClient.BatchEmbedding batchEmb : result.getEmbeddings()) {
            // Convert List<Double> to pgvector-compatible string
            String embeddingStr = batchEmb.getEmbedding().stream()
                    .map(String::valueOf)
                    .collect(Collectors.joining(",", "[", "]"));

            FaceEmbedding faceEmbedding = new FaceEmbedding();
            faceEmbedding.setUser(user);        // managed within this transaction
            faceEmbedding.setUserId(userId);
            faceEmbedding.setEnrollment(enrollment);
            faceEmbedding.setSession(session);  // managed within this transaction
            faceEmbedding.setEmbedding(embeddingStr);
            faceEmbedding.setModelName("w600k_r50");
            faceEmbedding.setModelPack("buffalo_l");
            faceEmbedding.setFaceScore(batchEmb.getFaceScore());
            faceEmbedding.setStatus("ACTIVE");
            faceEmbedding.setPoseLabel(batchEmb.getPoseLabel());

            // Set head pose if available
            if (batchEmb.getHeadPose() != null) {
                faceEmbedding.setYaw(batchEmb.getHeadPose().getOrDefault("yaw", 0.0));
                faceEmbedding.setPitch(batchEmb.getHeadPose().getOrDefault("pitch", 0.0));
                faceEmbedding.setRoll(batchEmb.getHeadPose().getOrDefault("roll", 0.0));
            }

            // Set bbox
            if (batchEmb.getBbox() != null && batchEmb.getBbox().size() == 4) {
                faceEmbedding.setBboxX(batchEmb.getBbox().get(0));
                faceEmbedding.setBboxY(batchEmb.getBbox().get(1));
                faceEmbedding.setBboxW(batchEmb.getBbox().get(2));
                faceEmbedding.setBboxH(batchEmb.getBbox().get(3));
            }

            embeddingRepository.save(faceEmbedding);
        }

        // Update enrollment record
        // face_enrollments.chk_enrollment_status defines ENROLLED as the only
        // successful terminal state.  SessionStatus.COMPLETED is a distinct
        // lifecycle and must never be used in this table.
        enrollment.setStatus(FaceEnrollment.EnrollmentStatus.ENROLLED);
        enrollmentRepository.save(enrollment);

        // Complete session (participates in THIS transaction via REQUIRED propagation)
        sessionService.completeSession(
                sessionToken,
                result.getQualityPassed(),
                result.getEmbeddingsExtracted(),
                result.getEmbeddingsAfterDedup(),
                null, // Liveness processed separately
                null
        );

        log.info("[processing] Session {} completed. Embeddings stored: {}",
                sessionToken, result.getEmbeddingsAfterDedup());
    }
}
