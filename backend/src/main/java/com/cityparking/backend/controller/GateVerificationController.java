package com.cityparking.backend.controller;

import com.cityparking.backend.dto.common.ApiResponse;
import com.cityparking.backend.dto.gate.GateVerificationResponse;
import com.cityparking.backend.service.GateVerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * Raspberry Pi Gate Verification Controller.
 *
 * This endpoint is purpose-built for the gate device:
 *   1. Accepts a face image (multipart)
 *   2. Performs 1:N face identification
 *   3. Checks vehicle registration
 *   4. Returns ALLOW/DENY with relay instructions
 *
 * Protected by JWT — the Pi must authenticate via /api/auth/login first.
 *
 * Reuses: FaceVerificationService, UserRepository, VehicleRepository.
 */
@RestController
@RequestMapping("/api/gate")
@RequiredArgsConstructor
@Slf4j
public class GateVerificationController {

    private final GateVerificationService gateVerificationService;

    /**
     * Verify a person at the gate and decide whether to open the barrier.
     *
     * @param image Captured face image from the Pi camera (JPEG/PNG)
     * @return ApiResponse containing GateVerificationResponse
     */
    @PostMapping(value = "/verify", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<GateVerificationResponse>> verify(
            @RequestParam("image") MultipartFile image) {

        log.info("Gate verify request received: fileName={}, size={} bytes",
                image.getOriginalFilename(), image.getSize());

        try {
            byte[] imageBytes = image.getBytes();
            GateVerificationResponse result = gateVerificationService.verify(imageBytes);

            String message = "ALLOW".equals(result.getDecision())
                    ? "Access granted"
                    : "Access denied — " + result.getReason();

            return ResponseEntity.ok(ApiResponse.success(message, result));

        } catch (java.io.IOException e) {
            log.error("Failed to read uploaded image", e);
            GateVerificationResponse errorResult =
                    GateVerificationResponse.deny("BACKEND_ERROR");
            return ResponseEntity.ok(
                    ApiResponse.error("Failed to process image: " + e.getMessage()));
        }
    }

    /**
     * Health check for the gate endpoint.
     * The Pi can poll this to verify the backend is reachable.
     */
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> health() {
        return ResponseEntity.ok(
                ApiResponse.success("Gate service is running", "OK"));
    }
}