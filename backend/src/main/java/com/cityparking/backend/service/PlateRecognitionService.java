package com.cityparking.backend.service;

import com.cityparking.backend.dto.plateverification.PlateDetectionResult;
import com.cityparking.backend.dto.plateverification.PlateVerificationResponse;
import com.cityparking.backend.entity.PlateVerificationLog;
import com.cityparking.backend.entity.Vehicle;
import com.cityparking.backend.exception.BadRequestException;
import com.cityparking.backend.repository.PlateVerificationLogRepository;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.repository.VehicleRepository;
import com.cityparking.backend.service.ai.GeminiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlateRecognitionService {

    private final PlateVerificationLogRepository plateVerificationLogRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final GeminiService geminiService;

    /**
     * Send image to Gemini API for plate detection and OCR.
     */
    public PlateDetectionResult detectPlate(MultipartFile image) {
        long startTime = System.currentTimeMillis();

        try {
            com.cityparking.backend.service.ai.PlateDetectionResult aiResult = geminiService.detectPlate(image);

            long elapsed = System.currentTimeMillis() - startTime;

            PlateDetectionResult result = new PlateDetectionResult();
            result.setPlateDetected(aiResult.getPlateNumber() != null && !aiResult.getPlateNumber().isBlank());
            result.setPlateText(aiResult.getPlateNumber());
            result.setConfidence(aiResult.getConfidence());

            log.info("Plate detection completed in {}ms - Detected: {}, Text: '{}', Confidence: {}",
                    elapsed, result.isPlateDetected(), result.getPlateText(), result.getConfidence());

            return result;

        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Gemini plate detection error: {}", e.getMessage());
            throw new BadRequestException("Plate detection unavailable: " + e.getMessage());
        }
    }

    /**
     * Compare detected plate text against user's registered vehicles.
     * Returns the matching vehicle if found.
     */
    public Optional<Vehicle> matchPlateToVehicle(Long userId, String detectedPlate) {
        if (detectedPlate == null || detectedPlate.isBlank()) {
            return Optional.empty();
        }

        List<Vehicle> userVehicles = vehicleRepository.findByUserId(userId);
        String normalizedDetected = normalizePlate(detectedPlate);

        for (Vehicle vehicle : userVehicles) {
            String registeredPlate = normalizePlate(vehicle.getLicensePlate());
            if (registeredPlate.equals(normalizedDetected)) {
                log.info("Plate matched: '{}' -> Vehicle ID: {}", detectedPlate, vehicle.getId());
                return Optional.of(vehicle);
            }
        }

        // Try fuzzy matching if exact match fails
        for (Vehicle vehicle : userVehicles) {
            String registeredPlate = normalizePlate(vehicle.getLicensePlate());
            if (fuzzyMatch(registeredPlate, normalizedDetected)) {
                log.info("Fuzzy plate match: '{}' ~ '{}' -> Vehicle ID: {}",
                        detectedPlate, vehicle.getLicensePlate(), vehicle.getId());
                return Optional.of(vehicle);
            }
        }

        log.info("No vehicle match found for plate: '{}'", detectedPlate);
        return Optional.empty();
    }

    /**
     * Full verification pipeline: detect plate -> match with registered vehicle -> log result.
     */
    public PlateVerificationResponse verifyPlate(Long userId, MultipartFile image) {
        long startTime = System.currentTimeMillis();

        // Step 1: Detect plate using Gemini API
        PlateDetectionResult detection = detectPlate(image);

        if (!detection.isPlateDetected()) {
            saveVerificationLog(userId, "", 0.0, false, null, null, 0.0);
            return PlateVerificationResponse.noPlate();
        }

        // Step 2: Match with registered vehicles
        Optional<Vehicle> matchedVehicle = matchPlateToVehicle(userId, detection.getPlateText());

        boolean verified = matchedVehicle.isPresent();
        Long matchedVehicleId = matchedVehicle.map(Vehicle::getId).orElse(null);

        // Step 3: Log verification result
        long processingTime = System.currentTimeMillis() - startTime;
        saveVerificationLog(
                userId,
                detection.getPlateText(),
                detection.getConfidence(),
                verified,
                matchedVehicleId,
                null,
                (double) processingTime
        );

        // Step 4: Return response
        if (verified) {
            return PlateVerificationResponse.matched(
                    detection.getPlateText(),
                    detection.getConfidence(),
                    matchedVehicleId
            );
        } else {
            return PlateVerificationResponse.notMatched(
                    detection.getPlateText(),
                    detection.getConfidence()
            );
        }
    }

    private PlateVerificationLog saveVerificationLog(Long userId, String detectedPlate,
                                                       Double confidence, Boolean verified,
                                                       Long matchedVehicleId, String imagePath,
                                                       Double processingTimeMs) {
        PlateVerificationLog verificationLog = new PlateVerificationLog();
        verificationLog.setUserId(userId);
        verificationLog.setDetectedPlate(detectedPlate);
        verificationLog.setConfidence(confidence);
        verificationLog.setVerified(verified);
        verificationLog.setMatchedVehicleId(matchedVehicleId);
        verificationLog.setImagePath(imagePath);
        verificationLog.setProcessingTimeMs(processingTimeMs);
        return plateVerificationLogRepository.save(verificationLog);
    }

    private String normalizePlate(String plate) {
        if (plate == null) return "";
        return plate.toUpperCase()
                .replaceAll("[\\s\\-_]", "")
                .replaceAll("[^A-Z0-9]", "");
    }

    private boolean fuzzyMatch(String registered, String detected) {
        if (registered.isEmpty() || detected.isEmpty()) return false;
        if (Math.abs(registered.length() - detected.length()) > 1) return false;

        int minLen = Math.min(registered.length(), detected.length());
        int differences = Math.abs(registered.length() - detected.length());

        for (int i = 0; i < minLen; i++) {
            char r = registered.charAt(i);
            char d = detected.charAt(i);
            if (r != d) {
                if (!((r == 'O' && d == '0') || (r == '0' && d == 'O') ||
                      (r == 'I' && d == '1') || (r == '1' && d == 'I') ||
                      (r == 'S' && d == '5') || (r == '5' && d == 'S') ||
                      (r == 'B' && d == '8') || (r == '8' && d == 'B'))) {
                    differences++;
                }
            }
        }

        return differences <= 1;
    }
}