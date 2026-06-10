package com.cityparking.backend.service;

import com.cityparking.backend.dto.faceverification.FaceVerificationResponse;
import com.cityparking.backend.entity.FaceEnrollment;
import com.cityparking.backend.entity.User;
import com.cityparking.backend.repository.FaceEnrollmentRepository;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.service.ai.FaceRecognitionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Service for face verification operations.
 *
 * MIGRATED: Now uses FaceRecognitionService (AWS Rekognition SearchFacesByImage)
 * instead of FaceProcessingService (embedding-based comparison).
 *
 * New flow:
 *   Capture Face → FaceRecognitionService.verifyFace()
 *   → SearchFacesByImage → Face Match → User Lookup → Response
 */
@Service
public class FaceVerificationService {

    private static final Logger log = LoggerFactory.getLogger(FaceVerificationService.class);

    private final FaceRecognitionService faceRecognitionService;
    private final FaceEnrollmentRepository faceEnrollmentRepository;
    private final UserRepository userRepository;

    public FaceVerificationService(
            FaceRecognitionService faceRecognitionService,
            FaceEnrollmentRepository faceEnrollmentRepository,
            UserRepository userRepository) {
        this.faceRecognitionService = faceRecognitionService;
        this.faceEnrollmentRepository = faceEnrollmentRepository;
        this.userRepository = userRepository;
    }

    /**
     * Verify a face image against enrolled faces.
     *
     * Uses AWS Rekognition SearchFacesByImage to find a matching face
     * in the collection, then looks up the user by the stored userId.
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
            return FaceVerificationResponse.builder()
                    .verified(false)
                    .confidence(0.0)
                    .message("Face verification failed: " + e.getMessage())
                    .provider("unknown")
                    .build();
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
}