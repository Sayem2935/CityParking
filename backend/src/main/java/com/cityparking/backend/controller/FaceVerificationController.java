package com.cityparking.backend.controller;

import com.cityparking.backend.dto.common.ApiResponse;
import com.cityparking.backend.dto.faceverification.FaceVerificationResponse;
import com.cityparking.backend.exception.BadRequestException;
import com.cityparking.backend.service.FaceVerificationService;
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

@RestController
@RequestMapping("/api/face-verification")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Face Verification", description = "Face verification endpoints for identity verification")
public class FaceVerificationController {

    private final FaceVerificationService faceVerificationService;

    @Operation(
            summary = "Verify a face against enrolled users",
            description = "Accepts an image, generates a face embedding using the AI service, " +
                    "compares it against all enrolled face embeddings using cosine similarity, " +
                    "and returns the best match if confidence exceeds the configured threshold."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Verification completed successfully",
                    content = @Content(schema = @Schema(implementation = FaceVerificationResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid request - no image provided",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            )
    })
    @PostMapping(value = "/verify", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<FaceVerificationResponse>> verifyFace(
            @Parameter(
                    description = "Face image to verify (JPEG/PNG)",
                    required = true,
                    content = @Content(mediaType = MediaType.MULTIPART_FORM_DATA_VALUE)
            )
            @RequestParam("image") MultipartFile image) {

        log.info("Received face verification request - image: {}, size: {} bytes",
                image.getOriginalFilename(), image.getSize());

        // Validate input
        if (image.isEmpty()) {
            throw new BadRequestException("Image file is required and cannot be empty");
        }

        // Validate file type
        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("File must be an image (JPEG, PNG). Received: " + contentType);
        }

        // Validate file size (max 10MB)
        long maxSize = 10 * 1024 * 1024;
        if (image.getSize() > maxSize) {
            throw new BadRequestException("Image file size exceeds maximum allowed size of 10MB");
        }

        FaceVerificationResponse result;
        try {
            result = faceVerificationService.verifyFace(image.getBytes());
        } catch (java.io.IOException e) {
            throw new BadRequestException("Failed to read image bytes: " + e.getMessage());
        }

        log.info("Face verification result - verified: {}, userId: {}, confidence: {}",
                result.isVerified(), result.getUserId(), result.getConfidence());

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}