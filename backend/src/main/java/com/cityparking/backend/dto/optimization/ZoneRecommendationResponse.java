package com.cityparking.backend.dto.optimization;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZoneRecommendationResponse {
    private String recommendedZone;
    private String recommendedAction;
    private Double confidence;
    private Map<String, Double> qValues;
    private Double zoneOccupancy;
    private Double predictedOccupancy;
    private String algorithm;
    private String reasoning;
}