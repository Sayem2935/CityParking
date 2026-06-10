package com.cityparking.backend.controller;

import com.cityparking.backend.dto.common.ApiResponse;
import com.cityparking.backend.dto.faceenrollment.FaceEnrollmentResponse;
import com.cityparking.backend.dto.faceenrollment.FaceEnrollmentStatusResponse;
import com.cityparking.backend.entity.FaceEnrollment;
import com.cityparking.backend.entity.User;
import com.cityparking.backend.exception.ResourceNotFoundException;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.service.FaceEnrollmentService;
import com.cityparking.backend.service.storage.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/face-enrollment")
@RequiredArgsConstructor
@Tag(name = "Face Enrollment", description = "Face enrollment management APIs")
public class FaceEnrollmentController {

    private static final Logger log = LoggerFactory.getLogger(FaceEnrollmentController.class);

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/jpg");

    private final FaceEnrollmentService faceEnrollmentService;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    /**
     * Upload face enrollment image.
     *
     * MIGRATED: Now accepts an image instead of video.
     * Uses FileStorageService to store locally, then triggers
     * async processing via FaceEnrollmentService (AWS Rekognition).
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload face enrollment image", description = "Upload an image for face enrollment processing")
    public ResponseEntity<ApiResponse<FaceEnrollmentResponse>> uploadImage(
            @RequestParam("image") MultipartFile image,
            Authentication authentication) {

        // Validate file is present
        if (image == null || image.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("No file provided. Please upload an image file."));
        }

        // Validate file size
        if (image.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("File too large. Maximum size is 10MB."));
        }

        // Validate content type
        String contentType = image.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid file type. Only JPEG, PNG, and WebP images are allowed."));
        }

        // Validate filename
        String originalFilename = image.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid file: filename is missing or empty."));
        }

        try {
            Long userId = getUserIdFromAuth(authentication);

            // Generate unique filename and store image
            String filename = UUID.randomUUID() + "_" + originalFilename;
            String storedPath;
            try {
                storedPath = fileStorageService.store(image, "face-enrollments", filename);
            } catch (Exception e) {
                log.error("Storage failure: unable to save uploaded image to disk", e);
                return ResponseEntity.status(500)
                        .body(ApiResponse.error("Storage failure: unable to save uploaded file. " + e.getMessage()));
            }

            // Create enrollment record
            FaceEnrollment enrollment;
            try {
                enrollment = faceEnrollmentService.createEnrollment(userId, null, storedPath);
            } catch (Exception e) {
                log.error("Failed to create enrollment record for userId: {}", userId, e);
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Failed to create enrollment record: " + e.getMessage()));
            }

            // Trigger async processing (AWS Rekognition)
            try {
                faceEnrollmentService.processEnrollment(enrollment.getId());
            } catch (Exception e) {
                log.warn("Enrollment processing could not be started (will retry): {}", e.getMessage());
                // Don't fail the upload - processing is async
            }

            log.info("Face enrollment initiated for userId: {}, enrollmentId: {}", userId, enrollment.getId());

            return ResponseEntity.ok(ApiResponse.success(
                    "Image uploaded and face enrollment processing started",
                    FaceEnrollmentResponse.fromEntity(enrollment)));

        } catch (ResourceNotFoundException e) {
            log.error("User not found during face upload", e);
            return ResponseEntity.status(404)
                    .body(ApiResponse.error("User not found: " + e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid argument during face upload: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid request: " + e.getMessage()));
        } catch (Exception e) {
            log.error("Face enrollment upload failed", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Face enrollment failed: " + e.getMessage()));
        }
    }

    @GetMapping
    @Operation(summary = "Get user's face enrollments", description = "Get all face enrollment records for the authenticated user")
    public ResponseEntity<ApiResponse<List<FaceEnrollmentResponse>>> getUserEnrollments(
            Authentication authentication) {
        Long userId = getUserIdFromAuth(authentication);
        List<FaceEnrollmentResponse> enrollments = faceEnrollmentService.getUserEnrollments(userId);
        return ResponseEntity.ok(ApiResponse.success(enrollments));
    }

    @GetMapping("/status")
    @Operation(summary = "Get face enrollment status", description = "Get the latest face enrollment status for the authenticated user")
    public ResponseEntity<ApiResponse<FaceEnrollmentStatusResponse>> getEnrollmentStatus(
            Authentication authentication) {
        Long userId = getUserIdFromAuth(authentication);
        FaceEnrollmentStatusResponse status = faceEnrollmentService.getEnrollmentStatus(userId);
        return ResponseEntity.ok(ApiResponse.success(status));
    }

    @DeleteMapping
    @Operation(summary = "Delete face enrollment", description = "Delete face enrollment and remove face from Rekognition collection")
    public ResponseEntity<ApiResponse<Void>> deleteEnrollment(Authentication authentication) {
        Long userId = getUserIdFromAuth(authentication);
        boolean deleted = faceEnrollmentService.deleteEnrollment(userId);

        if (deleted) {
            return ResponseEntity.ok(ApiResponse.success("Face enrollment deleted", null));
        } else {
            return ResponseEntity.ok(ApiResponse.error("No face enrollment found to delete"));
        }
    }

    /**
     * Resolve userId from authentication email.
     */
    private Long getUserIdFromAuth(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return user.getId();
    }
}