package com.cityparking.backend.dto.optimization;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoadBalanceResponse {
    private Double balanceScore;
    private Double meanOccupancy;
    private Double standardDeviation;
    private Double imbalance;
    private Map<String, Double> zoneOccupancies;
    private List<String> recommendations;
    private String potentialImprovement;
}