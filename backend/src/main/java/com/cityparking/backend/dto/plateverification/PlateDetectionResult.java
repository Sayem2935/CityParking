package com.cityparking.backend.dto.plateverification;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class PlateDetectionResult {

    @JsonProperty("plateDetected")
    private boolean plateDetected;

    @JsonProperty("plateText")
    private String plateText;

    @JsonProperty("confidence")
    private double confidence;

    public PlateDetectionResult() {}

    public PlateDetectionResult(boolean plateDetected, String plateText, double confidence) {
        this.plateDetected = plateDetected;
        this.plateText = plateText;
        this.confidence = confidence;
    }

    public boolean isPlateDetected() { return plateDetected; }
    public void setPlateDetected(boolean plateDetected) { this.plateDetected = plateDetected; }

    public String getPlateText() { return plateText; }
    public void setPlateText(String plateText) { this.plateText = plateText; }

    public double getConfidence() { return confidence; }
    public void setConfidence(double confidence) { this.confidence = confidence; }
}