package com.cityparking.backend.service;

import com.cityparking.backend.dto.faceverification.FaceVerificationResponse;
import com.cityparking.backend.dto.gate.GateVerificationResponse;
import com.cityparking.backend.dto.gate.GateVerificationResponse.UserInfo;
import com.cityparking.backend.dto.gate.GateVerificationResponse.VehicleInfo;
import com.cityparking.backend.entity.User;
import com.cityparking.backend.entity.Vehicle;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Service for Raspberry Pi gate verification.
 *
 * Orchestrates the full gate verification flow:
 * 1. Face verification (1:N identification via FaceVerificationService)
 * 2. Vehicle registration check (via VehicleRepository)
 * 3. Decision + user/vehicle/gate info assembly
 *
 * Reuses existing services — does NOT duplicate any logic.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GateVerificationService {

    private final FaceVerificationService faceVerificationService;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;

    /**
     * Perform gate verification on a captured face image.
     *
     * Flow:
     *   Image → FaceVerificationService.verifyFace() (1:N)
     *   → If matched: look up vehicles → ALLOW
     *   → If not matched or no vehicle: DENY
     *
     * @param imageBytes Raw JPEG/PNG bytes from the Pi camera
     * @return GateVerificationResponse with decision, user, vehicle, and gate info
     */
    @Transactional(readOnly = true)
    public GateVerificationResponse verify(byte[] imageBytes) {
        log.info("Gate verification started, imageSize={} bytes", imageBytes.length);

        // ── Step 1: Face verification (1:N identification) ───────
        FaceVerificationResponse faceResult;
        try {
            faceResult = faceVerificationService.verifyFace(imageBytes);
        } catch (Exception e) {
            log.error("Face verification threw exception: {}", e.getMessage(), e);
            return GateVerificationResponse.deny("BACKEND_ERROR");
        }

        // ── Step 2: Check face match result ──────────────────────
        if (!faceResult.isVerified() || faceResult.getUserId() == null) {
            String reason = mapFaceFailureReason(faceResult.getMessage());
            log.info("Gate DENY — reason={}, confidence={}", reason, faceResult.getConfidence());
            return GateVerificationResponse.deny(reason, faceResult.getConfidence());
        }

        // ── Step 3: Load user details ────────────────────────────
        Long userId = faceResult.getUserId();
        Optional<User> optionalUser = userRepository.findById(userId);
        if (optionalUser.isEmpty()) {
            log.warn("Face matched userId={} but user record not found", userId);
            return GateVerificationResponse.deny("BACKEND_ERROR");
        }
        User user = optionalUser.get();

        // ── Step 4: Check vehicle registration ───────────────────
        List<Vehicle> vehicles = vehicleRepository.findByUserId(userId);
        if (vehicles.isEmpty()) {
            log.info("Gate DENY — userId={} has no registered vehicles", userId);
            return GateVerificationResponse.deny("NO_REGISTERED_VEHICLE",
                    faceResult.getConfidence());
        }

        Vehicle defaultVehicle = vehicles.stream()
                .filter(Vehicle::getIsDefault)
                .findFirst()
                .orElse(vehicles.get(0));

        // ── Step 5: Build ALLOW response ─────────────────────────
        UserInfo userInfo = UserInfo.builder()
                .id(user.getId())
                .name(user.getFirstName() + " " + user.getLastName())
                .studentId(user.getStudentId())
                .department(user.getDepartment())
                .email(user.getEmail())
                .build();

        VehicleInfo vehicleInfo = VehicleInfo.builder()
                .registered(true)
                .plate(defaultVehicle.getLicensePlate())
                .type(defaultVehicle.getVehicleType())
                .make(defaultVehicle.getMake())
                .model(defaultVehicle.getModel())
                .build();

        log.info("Gate ALLOW — userId={}, similarity={}, plate={}",
                userId, faceResult.getConfidence(), defaultVehicle.getLicensePlate());

        return GateVerificationResponse.allow(
                faceResult.getConfidence(), userInfo, vehicleInfo);
    }

    // ── Private helpers ──────────────────────────────────────────

    /**
     * Map human-readable face verification failure messages to
     * machine-readable reason codes the Pi can switch on.
     */
    private String mapFaceFailureReason(String message) {
        if (message == null) return "FACE_NOT_MATCHED";
        String lower = message.toLowerCase();
        if (lower.contains("no face") || lower.contains("no face detected")) {
            return "NO_FACE";
        }
        if (lower.contains("multiple faces")) {
            return "MULTIPLE_FACES";
        }
        if (lower.contains("quality")) {
            return "LOW_QUALITY";
        }
        if (lower.contains("enrollment is not active")
                || lower.contains("enrollment")) {
            return "USER_NOT_ENROLLED";
        }
        return "FACE_NOT_MATCHED";
    }
}