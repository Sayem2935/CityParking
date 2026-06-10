package com.cityparking.backend.service;

import com.cityparking.backend.dto.faceenrollment.FaceEnrollmentResponse;
import com.cityparking.backend.dto.faceenrollment.FaceEnrollmentStatusResponse;
import com.cityparking.backend.entity.FaceEnrollment;
import com.cityparking.backend.entity.User;
import com.cityparking.backend.repository.FaceEnrollmentRepository;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.service.ai.FaceRecognitionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service for face enrollment operations.
 *
 * MIGRATED: Now uses FaceRecognitionService (AWS Rekognition) instead of
 * FaceProcessingService (FastAPI/InsightFace embeddings).
 *
 * New flow:
 *   User → Capture Face → FaceRecognitionService.enrollFace()
 *   → Store externalFaceId, collectionId, provider → Complete
 */
@Service
public class FaceEnrollmentService {

    private static final Logger log = LoggerFactory.getLogger(FaceEnrollmentService.class);

    private final FaceEnrollmentRepository faceEnrollmentRepository;
    private final FaceRecognitionService faceRecognitionService;
    private final UserRepository userRepository;

    public FaceEnrollmentService(
            FaceEnrollmentRepository faceEnrollmentRepository,
            FaceRecognitionService faceRecognitionService,
            UserRepository userRepository) {
        this.faceEnrollmentRepository = faceEnrollmentRepository;
        this.faceRecognitionService = faceRecognitionService;
        this.userRepository = userRepository;
    }

    /**
     * Create a new face enrollment record.
     */
    @Transactional
    public FaceEnrollment createEnrollment(Long userId, String videoPath, String imagePath) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        FaceEnrollment enrollment = new FaceEnrollment();
        enrollment.setUser(user);
        enrollment.setVideoPath(videoPath);
        enrollment.setImagePath(imagePath);
        enrollment.setStatus(FaceEnrollment.EnrollmentStatus.PENDING);
        enrollment.setProvider("mock"); // Will be updated during processing
        return faceEnrollmentRepository.save(enrollment);
    }

    /**
     * Process a face enrollment using AWS Rekognition.
     *
     * Reads the image file and sends it to FaceRecognitionService for indexing.
     * Stores the returned externalFaceId, collectionId, and provider.
     *
     * @param enrollmentId The enrollment ID to process
     */
    @Async
    @Transactional
    public void processEnrollment(Long enrollmentId) {
        Optional<FaceEnrollment> optionalEnrollment = faceEnrollmentRepository.findById(enrollmentId);
        if (optionalEnrollment.isEmpty()) {
            log.error("Enrollment not found: {}", enrollmentId);
            return;
        }

        FaceEnrollment enrollment = optionalEnrollment.get();
        enrollment.setStatus(FaceEnrollment.EnrollmentStatus.PROCESSING);
        enrollment.setProcessingAttempts(enrollment.getProcessingAttempts() + 1);
        faceEnrollmentRepository.save(enrollment);

        try {
            // Read the image file
            String imagePath = enrollment.getImagePath();
            if (imagePath == null || imagePath.isEmpty()) {
                throw new IOException("No image path set for enrollment: " + enrollmentId);
            }

            Path path = Paths.get(imagePath);
            if (!Files.exists(path)) {
                throw new IOException("Image file not found: " + imagePath);
            }

            byte[] imageBytes = Files.readAllBytes(path);
            log.info("Processing enrollment {} with {} bytes", enrollmentId, imageBytes.length);

            // Call FaceRecognitionService (AWS Rekognition or Mock)
            FaceRecognitionService.FaceEnrollResult result =
                    faceRecognitionService.enrollFace(imageBytes, enrollment.getUser().getId());

            // Store AWS Rekognition metadata
            enrollment.setExternalFaceId(result.getExternalFaceId());
            enrollment.setCollectionId(result.getCollectionId());
            enrollment.setProvider(result.getProvider());
            enrollment.setConfidence((double) result.getConfidence());
            enrollment.setStatus(FaceEnrollment.EnrollmentStatus.COMPLETED);
            enrollment.setErrorMessage(null);

            faceEnrollmentRepository.save(enrollment);
            log.info("Enrollment {} completed successfully. externalFaceId: {}, provider: {}",
                    enrollmentId, result.getExternalFaceId(), result.getProvider());

        } catch (Exception e) {
            log.error("Enrollment {} failed: {}", enrollmentId, e.getMessage(), e);
            enrollment.setStatus(FaceEnrollment.EnrollmentStatus.FAILED);
            enrollment.setErrorMessage(e.getMessage());
            faceEnrollmentRepository.save(enrollment);
        }
    }

    /**
     * Get enrollment status for a user.
     */
    @Transactional(readOnly = true)
    public FaceEnrollmentStatusResponse getEnrollmentStatus(Long userId) {
        Optional<FaceEnrollment> optionalEnrollment =
                faceEnrollmentRepository.findFirstByUserIdOrderByCreatedAtDesc(userId);

        if (optionalEnrollment.isEmpty()) {
            return FaceEnrollmentStatusResponse.builder()
                    .userId(userId)
                    .status(FaceEnrollment.EnrollmentStatus.PENDING)
                    .build();
        }

        FaceEnrollment enrollment = optionalEnrollment.get();
        return FaceEnrollmentStatusResponse.builder()
                .id(enrollment.getId())
                .userId(enrollment.getUser().getId())
                .status(enrollment.getStatus())
                .notes(enrollment.getNotes())
                .enrolledAt(enrollment.getEnrolledAt())
                .createdAt(enrollment.getCreatedAt())
                .updatedAt(enrollment.getUpdatedAt())
                .externalFaceId(enrollment.getExternalFaceId())
                .collectionId(enrollment.getCollectionId())
                .provider(enrollment.getProvider())
                .confidence(enrollment.getConfidence())
                .processingAttempts(enrollment.getProcessingAttempts())
                .errorMessage(enrollment.getErrorMessage())
                .build();
    }

    /**
     * Get all enrollments for a user.
     */
    @Transactional(readOnly = true)
    public List<FaceEnrollmentResponse> getUserEnrollments(Long userId) {
        List<FaceEnrollment> enrollments = faceEnrollmentRepository.findByUserId(userId);
        return enrollments.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Delete enrollment and remove face from Rekognition collection.
     */
    @Transactional
    public boolean deleteEnrollment(Long userId) {
        Optional<FaceEnrollment> optionalEnrollment =
                faceEnrollmentRepository.findFirstByUserIdOrderByCreatedAtDesc(userId);

        if (optionalEnrollment.isEmpty()) {
            log.warn("No enrollment found for userId: {}", userId);
            return false;
        }

        FaceEnrollment enrollment = optionalEnrollment.get();

        // Delete face from Rekognition collection if it was enrolled
        if (enrollment.getExternalFaceId() != null
                && enrollment.getStatus() == FaceEnrollment.EnrollmentStatus.COMPLETED) {
            try {
                faceRecognitionService.deleteFace(enrollment.getExternalFaceId());
                log.info("Deleted face from Rekognition: {}", enrollment.getExternalFaceId());
            } catch (Exception e) {
                log.error("Failed to delete face from Rekognition: {}", e.getMessage(), e);
                // Continue with local deletion even if Rekognition delete fails
            }
        }

        // Delete local files
        deleteFile(enrollment.getVideoPath());
        deleteFile(enrollment.getImagePath());

        // Delete enrollment record
        faceEnrollmentRepository.delete(enrollment);
        log.info("Enrollment deleted for userId: {}", userId);
        return true;
    }

    /**
     * Update face enrollment — re-capture and re-index.
     */
    @Async
    @Transactional
    public void updateEnrollment(Long enrollmentId, String newImagePath) {
        Optional<FaceEnrollment> optionalEnrollment = faceEnrollmentRepository.findById(enrollmentId);
        if (optionalEnrollment.isEmpty()) {
            log.error("Enrollment not found: {}", enrollmentId);
            return;
        }

        FaceEnrollment enrollment = optionalEnrollment.get();
        enrollment.setStatus(FaceEnrollment.EnrollmentStatus.PROCESSING);
        faceEnrollmentRepository.save(enrollment);

        try {
            // Delete old face from Rekognition if exists
            if (enrollment.getExternalFaceId() != null) {
                try {
                    faceRecognitionService.deleteFace(enrollment.getExternalFaceId());
                } catch (Exception e) {
                    log.warn("Could not delete old face: {}", e.getMessage());
                }
            }

            // Read new image
            Path path = Paths.get(newImagePath);
            byte[] imageBytes = Files.readAllBytes(path);

            // Re-enroll with new image
            FaceRecognitionService.FaceEnrollResult result =
                    faceRecognitionService.enrollFace(imageBytes, enrollment.getUser().getId());

            enrollment.setExternalFaceId(result.getExternalFaceId());
            enrollment.setCollectionId(result.getCollectionId());
            enrollment.setProvider(result.getProvider());
            enrollment.setConfidence((double) result.getConfidence());
            enrollment.setImagePath(newImagePath);
            enrollment.setStatus(FaceEnrollment.EnrollmentStatus.COMPLETED);
            enrollment.setErrorMessage(null);

            faceEnrollmentRepository.save(enrollment);
            log.info("Enrollment {} updated. New externalFaceId: {}", enrollmentId, result.getExternalFaceId());

        } catch (Exception e) {
            log.error("Enrollment update failed: {}", e.getMessage(), e);
            enrollment.setStatus(FaceEnrollment.EnrollmentStatus.FAILED);
            enrollment.setErrorMessage(e.getMessage());
            faceEnrollmentRepository.save(enrollment);
        }
    }

    private FaceEnrollmentResponse toResponse(FaceEnrollment enrollment) {
        return FaceEnrollmentResponse.fromEntity(enrollment);
    }

    private void deleteFile(String filePath) {
        if (filePath != null && !filePath.isEmpty()) {
            try {
                Files.deleteIfExists(Paths.get(filePath));
            } catch (IOException e) {
                log.warn("Failed to delete file: {}", filePath, e);
            }
        }
    }
}