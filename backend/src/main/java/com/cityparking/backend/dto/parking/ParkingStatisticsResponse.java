package com.cityparking.backend.dto.parking;

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
public class ParkingStatisticsResponse {
    private Long totalSlots;
    private Long currentOccupied;
    private Long currentFree;
    private Double currentUtilization;
    private Long totalAssignmentsToday;
    private Double averageOccupancyToday;
    private Integer peakOccupancyToday;
    private String peakHour;
    private Map<String, Long> hourlyDistribution;
    private List<ZoneStats> zoneStats;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ZoneStats {
        private String zone;
        private Long totalSlots;
        private Long occupiedSlots;
        private Double utilizationPercent;
    }
}