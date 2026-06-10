package com.cityparking.backend.controller;

import com.cityparking.backend.dto.accessverification.AccessVerificationResponse;
import com.cityparking.backend.dto.common.ApiResponse;
import com.cityparking.backend.dto.faceverification.FaceVerificationResponse;
import com.cityparking.backend.dto.plateverification.PlateVerificationResponse;
import com.cityparking.backend.entity.AccessDecision;
import com.cityparking.backend.entity.SecurityEvent;
import com.cityparking.backend.exception.BadRequestException;
import com.cityparking.backend.service.AccessDecisionResult;
import com.cityparking.backend.service.AccessDecisionService;
import com.cityparking.backend.service.FaceVerificationService;
import com.cityparking.backend.service.PlateRecognitionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/access")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Access Verification", description = "Dual verification access decision engine combining face and plate recognition")
public class AccessVerificationController {

    private final FaceVerificationService faceVerificationService;
    private final PlateRecognitionService plateRecognitionService;
    private final AccessDecisionService accessDecisionService;

    @Operation(
            summary = "Dual verification - Face + Plate",
            description = "Accepts a face image and a plate image, performs both verifications, " +
                    "runs them through the access decision engine, logs the result, and returns the final decision. " +
                    "Decisions: ACCESS_GRANTED (both verified), ACCESS_DENIED (face or plate failed), " +
                    "SECURITY_ALERT (face verified but plate mismatch)."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Verification completed - decision returned",
                    content = @Content(schema = @Schema(implementation = AccessVerificationResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid request - missing or empty images",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            )
    })
    @PostMapping(value = "/verify", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AccessVerificationResponse>> verifyAccess(
            @Parameter(
                    description = "Face image to verify (JPEG/PNG, max 10MB)",
                    required = true,
                    content = @Content(mediaType = MediaType.MULTIPART_FORM_DATA_VALUE)
            )
            @RequestParam("faceImage") MultipartFile faceImage,

            @Parameter(
                    description = "License plate image to verify (JPEG/PNG, max 10MB)",
                    required = true,
                    content = @Content(mediaType = MediaType.MULTIPART_FORM_DATA_VALUE)
            )
            @RequestParam("plateImage") MultipartFile plateImage) {

        long totalStartTime = System.currentTimeMillis();

        log.info("Access verification request received - faceImage: {} ({} bytes), plateImage: {} ({} bytes)",
                faceImage.getOriginalFilename(), faceImage.getSize(),
                plateImage.getOriginalFilename(), plateImage.getSize());

        // Validate inputs
        validateImage(faceImage, "faceImage");
        validateImage(plateImage, "plateImage");

        // Step 1: Face verification
        log.info("Step 1: Running face verification...");
        FaceVerificationResponse faceResult;
        try {
            faceResult = faceVerificationService.verifyFace(faceImage.getBytes());
        } catch (java.io.IOException e) {
            throw new BadRequestException("Failed to read face image: " + e.getMessage());
        }
        log.info("Face verification result - verified: {}, userId: {}, confidence: {}",
                faceResult.isVerified(), faceResult.getUserId(), faceResult.getConfidence());

        // Step 2: Plate verification
        // If face was verified and we have a userId, match plate against that user's vehicles
        // If face was not verified, still attempt plate detection for logging purposes
        log.info("Step 2: Running plate verification...");
        PlateVerificationResponse plateResult;
        if (faceResult.getUserId() != null) {
            plateResult = plateRecognitionService.verifyPlate(faceResult.getUserId(), plateImage);
        } else {
            // Face failed - no userId available. Detect plate but can't match to a user.
            // Create a response indicating plate was detected but not verified against a user.
            plateResult = PlateVerificationResponse.noPlate();
            try {
                // Still attempt plate detection to capture the plate number for security logging
                // We use a dummy userId of 0 - the service will detect the plate but won't match
                plateResult = plateRecognitionService.verifyPlate(0L, plateImage);
            } catch (Exception e) {
                log.warn("Plate detection failed when face verification failed: {}", e.getMessage());
                plateResult = PlateVerificationResponse.noPlate();
            }
        }
        log.info("Plate verification result - verified: {}, detectedPlate: {}, confidence: {}, vehicleId: {}",
                plateResult.isVerified(), plateResult.getDetectedPlate(),
                plateResult.getConfidence(), plateResult.getMatchedVehicleId());

        // Step 3: Decision engine
        log.info("Step 3: Running access decision engine...");
        AccessDecisionResult decisionResult = accessDecisionService.makeDecision(faceResult, plateResult);

        // Step 4: Build response
        AccessVerificationResponse response = AccessVerificationResponse.builder()
                .decision(decisionResult.getDecision())
                .userId(faceResult.getUserId())
                .vehicleId(plateResult.getMatchedVehicleId())
                .faceConfidence(faceResult.getConfidence())
                .plateConfidence(plateResult.getConfidence())
                .faceVerified(faceResult.isVerified())
                .plateVerified(plateResult.isVerified())
                .detectedPlate(plateResult.getDetectedPlate())
                .faceMessage(faceResult.getMessage())
                .plateMessage(plateResult.getMessage())
                .message(buildDecisionMessage(decisionResult.getDecision()))
                .processingTimeMs((double) (System.currentTimeMillis() - totalStartTime))
                .accessLogId(decisionResult.getAccessLog().getId())
                .securityEventIds(decisionResult.getSecurityEvents().stream()
                        .map(SecurityEvent::getId)
                        .collect(Collectors.toList()))
                .timestamp(LocalDateTime.now())
                .build();

        log.info("Access verification completed - decision: {}, processingTime: {}ms",
                response.getDecision(), response.getProcessingTimeMs());

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Validate an uploaded image file.
     */
    private void validateImage(MultipartFile image, String fieldName) {
        if (image == null || image.isEmpty()) {
            throw new BadRequestException(fieldName + " is required and cannot be empty");
        }

        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException(fieldName + " must be an image (JPEG, PNG). Received: " + contentType);
        }

        long maxSize = 10 * 1024 * 1024; // 10MB
        if (image.getSize() > maxSize) {
            throw new BadRequestException(fieldName + " size exceeds maximum allowed size of 10MB");
        }
    }

    /**
     * Build a human-readable message for the access decision.
     */
    private String buildDecisionMessage(AccessDecision decision) {
        return switch (decision) {
            case ACCESS_GRANTED -> "Access granted. Both face and vehicle verified successfully.";
            case ACCESS_DENIED -> "Access denied. Verification failed. Please contact security if you believe this is an error.";
            case SECURITY_ALERT -> "Security alert triggered. Face verified but vehicle plate does not match registered vehicles. Security has been notified.";
        };
    }
}