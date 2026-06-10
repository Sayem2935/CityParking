package com.cityparking.backend.controller;

import com.cityparking.backend.dto.common.ApiResponse;
import com.cityparking.backend.dto.plateverification.PlateVerificationResponse;
import com.cityparking.backend.entity.User;
import com.cityparking.backend.exception.BadRequestException;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.service.PlateRecognitionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/plate-verification")
@Tag(name = "Plate Verification", description = "ANPR - Automatic Number Plate Recognition")
public class PlateVerificationController {

    private static final Logger logger = LoggerFactory.getLogger(PlateVerificationController.class);

    private final PlateRecognitionService plateRecognitionService;
    private final UserRepository userRepository;

    public PlateVerificationController(PlateRecognitionService plateRecognitionService,
                                        UserRepository userRepository) {
        this.plateRecognitionService = plateRecognitionService;
        this.userRepository = userRepository;
    }

    @PostMapping(value = "/verify", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Verify vehicle plate", description = "Upload an image containing a vehicle license plate for automatic recognition and verification against registered vehicles")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Verification completed"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid image"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<ApiResponse<PlateVerificationResponse>> verifyPlate(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal,
            @Parameter(description = "Vehicle plate image") @RequestParam("image") MultipartFile image) {

        // Validate image
        if (image.isEmpty()) {
            throw new BadRequestException("Image file is required");
        }

        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("File must be an image (JPEG, PNG, etc.)");
        }

        // Get authenticated user
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new BadRequestException("User not found"));

        logger.info("Plate verification request from user: {} (ID: {})", user.getEmail(), user.getId());

        // Process verification
        PlateVerificationResponse response = plateRecognitionService.verifyPlate(user.getId(), image);

        logger.info("Plate verification result - Verified: {}, Plate: '{}', Confidence: {}",
                response.isVerified(), response.getDetectedPlate(), response.getConfidence());

        return ResponseEntity.ok(ApiResponse.success("Plate verification completed", response));
    }
}