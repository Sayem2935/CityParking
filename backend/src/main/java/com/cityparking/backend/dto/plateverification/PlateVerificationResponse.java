package com.cityparking.backend.dto.plateverification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlateVerificationResponse {

    private boolean verified;
    private String detectedPlate;
    private double confidence;
    private Long matchedVehicleId;
    private String message;

    /**
     * Structured flags for programmatic decision-making.
     * Replaces fragile string matching on message content.
     */
    private boolean multiplePlatesDetected;
    private boolean plateDetected;

    // Factory methods
    public static PlateVerificationResponse matched(String plate, double confidence, Long vehicleId) {
        return PlateVerificationResponse.builder()
                .verified(true)
                .detectedPlate(plate)
                .confidence(confidence)
                .matchedVehicleId(vehicleId)
                .message("Plate matched with registered vehicle")
                .plateDetected(true)
                .multiplePlatesDetected(false)
                .build();
    }

    public static PlateVerificationResponse notMatched(String plate, double confidence) {
        return PlateVerificationResponse.builder()
                .verified(false)
                .detectedPlate(plate)
                .confidence(confidence)
                .matchedVehicleId(null)
                .message("Plate detected but does not match any registered vehicle")
                .plateDetected(true)
                .multiplePlatesDetected(false)
                .build();
    }

    public static PlateVerificationResponse noPlate() {
        return PlateVerificationResponse.builder()
                .verified(false)
                .detectedPlate("")
                .confidence(0.0)
                .matchedVehicleId(null)
                .message("No license plate detected in the image")
                .plateDetected(false)
                .multiplePlatesDetected(false)
                .build();
    }

    public static PlateVerificationResponse multiplePlates(String plate, double confidence) {
        return PlateVerificationResponse.builder()
                .verified(false)
                .detectedPlate(plate)
                .confidence(confidence)
                .matchedVehicleId(null)
                .message("Multiple license plates detected in the image")
                .plateDetected(true)
                .multiplePlatesDetected(true)
                .build();
    }
}