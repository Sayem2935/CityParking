package com.cityparking.backend.dto.parking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailabilityResponse {
    private Long totalSlots;
    private Long freeSlots;
    private Long occupiedSlots;
    private Long reservedSlots;
    private Long maintenanceSlots;
    private Double utilizationPercent;
    private Map<String, ZoneAvailability> zones;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ZoneAvailability {
        private String zone;
        private Long totalSlots;
        private Long freeSlots;
        private Long occupiedSlots;
    }
}