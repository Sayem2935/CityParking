package com.cityparking.backend.service;

import com.cityparking.backend.dto.faceverification.FaceVerificationResponse;
import com.cityparking.backend.entity.FaceEmbedding;
import com.cityparking.backend.entity.FaceEnrollment;
import com.cityparking.backend.entity.User;
import com.cityparking.backend.repository.FaceEnrollmentRepository;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.service.ai.FaceRecognitionService;
import com.cityparking.backend.service.ai.InsightFaceClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Service for face verification operations.
 *
 * UPDATED: Now supports multi-embedding verification.
 * When a user has multiple active embeddings (from guided enrollment),
 * the probe is compared against ALL embeddings using max-similarity scoring.
 *
 * Flow:
 *   Capture Face → Extract Embedding (InsightFaceClient)
 *   → Load Gallery (EmbeddingGalleryService) → Max Cosine Similarity → Decision
 */
@Service
public class FaceVerificationService {

    private static final Logger log = LoggerFactory.getLogger(FaceVerificationService.class);
    private static final float SIMILARITY_THRESHOLD = 0.45f;

    private final FaceRecognitionService faceRecognitionService;
    private final FaceEnrollmentRepository faceEnrollmentRepository;
    private final UserRepository userRepository;
    private final EmbeddingGalleryService galleryService;
    private final InsightFaceClient insightFaceClient;

    public FaceVerificationService(
            FaceRecognitionService faceRecognitionService,
            FaceEnrollmentRepository faceEnrollmentRepository,
            UserRepository userRepository,
            EmbeddingGalleryService galleryService,
            InsightFaceClient insightFaceClient) {
        this.faceRecognitionService = faceRecognitionService;
        this.faceEnrollmentRepository = faceEnrollmentRepository;
        this.userRepository = userRepository;
        this.galleryService = galleryService;
        this.insightFaceClient = insightFaceClient;
    }

    /**
     * Verify a face image against a specific user's multi-embedding gallery.
     *
     * This is the NEW primary verification method:
     *   1. Extract probe embedding via InsightFaceClient
     *   2. Load user's gallery via EmbeddingGalleryService
     *   3. Compute max cosine similarity
     *   4. Return match with pose details
     *
     * @param imageBytes The face image bytes to verify
     * @param userId The specific user ID to verify against (1:1 mode)
     * @return FaceVerificationResponse with match details
     */
    @Transactional(readOnly = true)
    public FaceVerificationResponse verifyFaceMultiEmbedding(byte[] imageBytes, Long userId) {
        log.info("Starting multi-embedding verification for userId={}, imageSize={}", userId, imageBytes.length);

        try {
            // Step 1: Verify user exists and has active enrollment
            Optional<User> optionalUser = userRepository.findById(userId);
            if (optionalUser.isEmpty()) {
                return buildFailedResponse("User not found", "insightface");
            }

            User user = optionalUser.get();

            Optional<FaceEnrollment> optionalEnrollment =
                    faceEnrollmentRepository.findFirstByUserIdOrderByCreatedAtDesc(userId);
            if (optionalEnrollment.isEmpty() ||
                    optionalEnrollment.get().getStatus() != FaceEnrollment.EnrollmentStatus.COMPLETED) {
                return buildFailedResponse("User face enrollment is not active", "insightface");
            }

            // Step 2: Extract probe embedding
            InsightFaceClient.EmbeddingResult probeResult;
            try {
                probeResult = insightFaceClient.extractEmbedding(imageBytes);
            } catch (Exception e) {
                log.error("Failed to extract probe embedding: {}", e.getMessage());
                return buildFailedResponse("Failed to process face image: " + e.getMessage(), "insightface");
            }

            // Step 3: Match against user's gallery
            EmbeddingGalleryService.GalleryMatchResult matchResult =
                    galleryService.matchAgainstGallery(probeResult.getEmbedding(), userId);

            if (matchResult.getEmbeddingsCompared() == 0) {
                return buildFailedResponse("No embeddings found for user", "insightface");
            }

            boolean verified = matchResult.getMaxSimilarity() >= SIMILARITY_THRESHOLD;

            if (verified) {
                log.info("Face verified: userId={}, similarity={}, pose={}, embeddings={}",
                        userId, matchResult.getMaxSimilarity(),
                        matchResult.getMatchedPoseLabel(), matchResult.getEmbeddingsCompared());

                return FaceVerificationResponse.builder()
                        .verified(true)
                        .userId(userId)
                        .userName(user.getFirstName() + " " + user.getLastName())
                        .userEmail(user.getEmail())
                        .confidence((double) matchResult.getMaxSimilarity())
                        .message("Face verified successfully")
                        .provider("insightface")
                        .matchedPose(matchResult.getMatchedPoseLabel())
                        .matchedEmbeddingId(matchResult.getMatchedEmbeddingId())
                        .embeddingsCompared(matchResult.getEmbeddingsCompared())
                        .build();
            } else {
                log.info("Face not matched: userId={}, bestSimilarity={}", userId, matchResult.getMaxSimilarity());

                return FaceVerificationResponse.builder()
                        .verified(false)
                        .confidence((double) matchResult.getMaxSimilarity())
                        .message("Face does not match enrolled user")
                        .provider("insightface")
                        .embeddingsCompared(matchResult.getEmbeddingsCompared())
                        .build();
            }

        } catch (Exception e) {
            log.error("Multi-embedding verification failed: {}", e.getMessage(), e);
            return buildFailedResponse("Face verification failed: " + e.getMessage(), "unknown");
        }
    }

    /**
     * Verify a face image against enrolled faces (original method, backward compatible).
     *
     * Uses FaceRecognitionService (AWS Rekognition SearchFacesByImage or Mock)
     * for 1:N identification mode.
     *
     * @param imageBytes The face image bytes to verify
     * @return FaceVerificationResponse with match details
     */
    @Transactional(readOnly = true)
    public FaceVerificationResponse verifyFace(byte[] imageBytes) {
        log.info("Starting face verification with {} bytes", imageBytes.length);

        try {
            // Call FaceRecognitionService (AWS Rekognition or Mock)
            FaceRecognitionService.FaceVerifyResult result =
                    faceRecognitionService.verifyFace(imageBytes);

            if (!result.isMatched()) {
                log.info("No face match found");
                return FaceVerificationResponse.builder()
                        .verified(false)
                        .confidence(0.0)
                        .message("No matching face found in the system")
                        .provider(result.getProvider())
                        .build();
            }

            // Look up user by userId from the matched face
            Long userId = result.getUserId();
            if (userId == null) {
                log.warn("Face matched but no userId associated. externalFaceId: {}", result.getExternalFaceId());
                return FaceVerificationResponse.builder()
                        .verified(false)
                        .confidence((double) result.getConfidence())
                        .message("Face recognized but user not found")
                        .provider(result.getProvider())
                        .build();
            }

            Optional<User> optionalUser = userRepository.findById(userId);
            if (optionalUser.isEmpty()) {
                log.warn("User not found for userId: {}", userId);
                return FaceVerificationResponse.builder()
                        .verified(false)
                        .confidence((double) result.getConfidence())
                        .message("Face recognized but user account not found")
                        .provider(result.getProvider())
                        .build();
            }

            User user = optionalUser.get();

            // Verify the user's enrollment is still active
            Optional<FaceEnrollment> optionalEnrollment =
                    faceEnrollmentRepository.findFirstByUserIdOrderByCreatedAtDesc(userId);

            if (optionalEnrollment.isEmpty() ||
                    optionalEnrollment.get().getStatus() != FaceEnrollment.EnrollmentStatus.COMPLETED) {
                log.warn("User {} found but enrollment is not active", userId);
                return FaceVerificationResponse.builder()
                        .verified(false)
                        .confidence((double) result.getConfidence())
                        .message("User face enrollment is not active")
                        .provider(result.getProvider())
                        .build();
            }

            log.info("Face verified successfully. userId: {}, confidence: {}",
                    userId, result.getConfidence());

            return FaceVerificationResponse.builder()
                    .verified(true)
                    .userId(userId)
                    .userName(user.getFirstName() + " " + user.getLastName())
                    .userEmail(user.getEmail())
                    .confidence((double) result.getConfidence())
                    .externalFaceId(result.getExternalFaceId())
                    .message("Face verified successfully")
                    .provider(result.getProvider())
                    .build();

        } catch (Exception e) {
            log.error("Face verification failed: {}", e.getMessage(), e);
            return buildFailedResponse("Face verification failed: " + e.getMessage(), "unknown");
        }
    }

    /**
     * Check if a user has an active face enrollment.
     *
     * @param userId The user ID to check
     * @return true if the user has a completed enrollment
     */
    @Transactional(readOnly = true)
    public boolean hasActiveEnrollment(Long userId) {
        Optional<FaceEnrollment> enrollment =
                faceEnrollmentRepository.findFirstByUserIdOrderByCreatedAtDesc(userId);
        return enrollment.isPresent() &&
                enrollment.get().getStatus() == FaceEnrollment.EnrollmentStatus.COMPLETED;
    }

    private FaceVerificationResponse buildFailedResponse(String message, String provider) {
        return FaceVerificationResponse.builder()
                .verified(false)
                .confidence(0.0)
                .message(message)
                .provider(provider)
                .build();
    }
}