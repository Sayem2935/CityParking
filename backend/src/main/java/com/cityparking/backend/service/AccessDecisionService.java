package com.cityparking.backend.service;

import com.cityparking.backend.dto.faceverification.FaceVerificationResponse;
import com.cityparking.backend.dto.plateverification.PlateVerificationResponse;
import com.cityparking.backend.entity.*;
import com.cityparking.backend.repository.AccessLogRepository;
import com.cityparking.backend.repository.SecurityEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccessDecisionService {

    private final AccessLogRepository accessLogRepository;
    private final SecurityEventRepository securityEventRepository;

    /**
     * Core decision engine that combines face and plate verification results.
     *
     * Decision Rules:
     * 1. Face verified + Plate verified → ACCESS_GRANTED
     * 2. Face failed → ACCESS_DENIED
     * 3. Plate failed → ACCESS_DENIED
     * 4. Face verified but plate mismatch → SECURITY_ALERT
     *
     * Security Events generated when:
     * - Face mismatch
     * - Plate mismatch
     * - Multiple faces detected
     * - Multiple plates detected
     */
    @Transactional
    public AccessDecisionResult makeDecision(FaceVerificationResponse faceResult,
                                              PlateVerificationResponse plateResult) {
        long startTime = System.currentTimeMillis();
        List<SecurityEvent> securityEvents = new ArrayList<>();

        log.info("Access decision: faceVerified={}, plateVerified={}, faceUserId={}, plateVehicleId={}",
                faceResult.isVerified(), plateResult.isVerified(),
                faceResult.getUserId(), plateResult.getMatchedVehicleId());

        // Determine the access decision
        AccessDecision decision = evaluateDecision(faceResult, plateResult);

        // Generate security events based on verification results
        securityEvents = generateSecurityEvents(faceResult, plateResult, decision);

        // Build the access log
        AccessLog accessLog = buildAccessLog(faceResult, plateResult, decision, securityEvents, startTime);
        accessLog = accessLogRepository.save(accessLog);

        // Link security events to the access log
        for (SecurityEvent event : securityEvents) {
            event.setAccessLog(accessLog);
        }
        if (!securityEvents.isEmpty()) {
            securityEventRepository.saveAll(securityEvents);
        }

        double processingTimeMs = System.currentTimeMillis() - startTime;
        log.info("Access decision completed: decision={}, processingTimeMs={}, securityEvents={}",
                decision, processingTimeMs, securityEvents.size());

        return AccessDecisionResult.builder()
                .decision(decision)
                .accessLog(accessLog)
                .securityEvents(securityEvents)
                .processingTimeMs(processingTimeMs)
                .build();
    }

    /**
     * Evaluate the access decision based on face and plate verification results.
     */
    AccessDecision evaluateDecision(FaceVerificationResponse faceResult,
                                     PlateVerificationResponse plateResult) {
        boolean faceVerified = faceResult.isVerified();
        boolean plateVerified = plateResult.isVerified();

        // Rule 1: Both verified → ACCESS_GRANTED
        if (faceVerified && plateVerified) {
            return AccessDecision.ACCESS_GRANTED;
        }

        // Rule 4: Face verified but plate mismatch → SECURITY_ALERT
        if (faceVerified && !plateVerified) {
            return AccessDecision.SECURITY_ALERT;
        }

        // Rule 2 & 3: Face failed or Plate failed → ACCESS_DENIED
        return AccessDecision.ACCESS_DENIED;
    }

    /**
     * Generate security events based on the verification results.
     */
    List<SecurityEvent> generateSecurityEvents(FaceVerificationResponse faceResult,
                                                PlateVerificationResponse plateResult,
                                                AccessDecision decision) {
        List<SecurityEvent> events = new ArrayList<>();

        // Generate user/vehicle references if available
        User user = faceResult.getUserId() != null ? new User() : null;
        if (user != null) user.setId(faceResult.getUserId());

        Vehicle vehicle = plateResult.getMatchedVehicleId() != null ? new Vehicle() : null;
        if (vehicle != null) vehicle.setId(plateResult.getMatchedVehicleId());

        // Face mismatch event
        if (!faceResult.isVerified() && faceResult.getConfidence() > 0) {
            events.add(SecurityEvent.builder()
                    .eventType(SecurityEventType.FACE_MISMATCH)
                    .severity(SecurityEvent.Severity.HIGH)
                    .user(user)
                    .vehicle(vehicle)
                    .description("Face verification failed: " + faceResult.getMessage())
                    .faceConfidence(faceResult.getConfidence())
                    .plateConfidence(plateResult.getConfidence())
                    .detectedPlate(plateResult.getDetectedPlate())
                    .build());
        }

        // Plate mismatch event
        if (!plateResult.isVerified() && plateResult.getConfidence() > 0) {
            events.add(SecurityEvent.builder()
                    .eventType(SecurityEventType.PLATE_MISMATCH)
                    .severity(SecurityEvent.Severity.HIGH)
                    .user(user)
                    .vehicle(vehicle)
                    .description("Plate verification failed: " + plateResult.getMessage())
                    .faceConfidence(faceResult.getConfidence())
                    .plateConfidence(plateResult.getConfidence())
                    .detectedPlate(plateResult.getDetectedPlate())
                    .build());
        }

        // Multiple faces detected (using structured flag instead of fragile string matching)
        if (faceResult.isMultipleFacesDetected()) {
            events.add(SecurityEvent.builder()
                    .eventType(SecurityEventType.MULTIPLE_FACES)
                    .severity(SecurityEvent.Severity.CRITICAL)
                    .user(user)
                    .vehicle(vehicle)
                    .description("Multiple faces detected during verification: " + faceResult.getMessage())
                    .faceConfidence(faceResult.getConfidence())
                    .plateConfidence(plateResult.getConfidence())
                    .detectedPlate(plateResult.getDetectedPlate())
                    .build());
        }

        // Multiple plates detected (using structured flag instead of fragile string matching)
        if (plateResult.isMultiplePlatesDetected()) {
            events.add(SecurityEvent.builder()
                    .eventType(SecurityEventType.MULTIPLE_PLATES)
                    .severity(SecurityEvent.Severity.CRITICAL)
                    .user(user)
                    .vehicle(vehicle)
                    .description("Multiple plates detected during verification: " + plateResult.getMessage())
                    .faceConfidence(faceResult.getConfidence())
                    .plateConfidence(plateResult.getConfidence())
                    .detectedPlate(plateResult.getDetectedPlate())
                    .build());
        }

        return events;
    }

    /**
     * Build the AccessLog entity from verification results.
     */
    private AccessLog buildAccessLog(FaceVerificationResponse faceResult,
                                      PlateVerificationResponse plateResult,
                                      AccessDecision decision,
                                      List<SecurityEvent> securityEvents,
                                      long startTime) {
        User user = faceResult.getUserId() != null ? new User() : null;
        if (user != null) user.setId(faceResult.getUserId());

        Vehicle vehicle = plateResult.getMatchedVehicleId() != null ? new Vehicle() : null;
        if (vehicle != null) vehicle.setId(plateResult.getMatchedVehicleId());

        return AccessLog.builder()
                .user(user)
                .vehicle(vehicle)
                .decision(decision)
                .faceVerified(faceResult.isVerified())
                .plateVerified(plateResult.isVerified())
                .faceConfidence(faceResult.getConfidence())
                .plateConfidence(plateResult.getConfidence())
                .detectedPlate(plateResult.getDetectedPlate())
                .faceMessage(faceResult.getMessage())
                .plateMessage(plateResult.getMessage())
                .processingTimeMs((double) (System.currentTimeMillis() - startTime))
                .build();
    }
}