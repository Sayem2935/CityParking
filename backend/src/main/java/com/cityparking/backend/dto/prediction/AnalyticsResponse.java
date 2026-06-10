package com.cityparking.backend.dto.prediction;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsResponse {

    private Double averageOccupancy;
    private Double peakOccupancy;
    private Double utilizationEfficiency;
    private Double occupancyGrowthRate;
    private Integer totalSlots;
    private Integer averageOccupiedSlots;
    private List<WeeklyTrendPoint> weeklyTrendAnalysis;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeeklyTrendPoint {
        private String weekLabel;
        private Double averageOccupancy;
        private Double peakOccupancy;
        private Double growthRate;
    }
}