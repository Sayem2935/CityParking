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
public class CongestionResponse {

    private Map<String, ZoneCongestion> zones;
    private Double overallOccupancy;
    private String overallLevel;
    private Double overallScore;
    private String bottleneckZone;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ZoneCongestion {
        private Double occupancy;
        private String level;
        private Double score;
    }
}