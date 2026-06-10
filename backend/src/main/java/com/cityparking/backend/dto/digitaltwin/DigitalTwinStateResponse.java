package com.cityparking.backend.dto.digitaltwin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DigitalTwinStateResponse {

    private String sessionId;
    private LocalDateTime syncedAt;
    private ParkingLotState parkingLot;
    private OptimizationState optimization;
    private PredictionsState predictions;
    private SimulationState simulation;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParkingLotState {
        private String id;
        private String name;
        private int totalSpaces;
        private int occupiedSpaces;
        private int availableSpaces;
        private double occupancyRate;
        private List<ZoneState> zones;
        private List<FloorState> floors;
        private List<EventState> recentEvents;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ZoneState {
        private String id;
        private String name;
        private int totalSpaces;
        private int occupiedSpaces;
        private double occupancyRate;
        private double congestionScore;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FloorState {
        private int level;
        private String name;
        private int totalSpaces;
        private int occupiedSpaces;
        private double occupancyRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EventState {
        private String type;
        private String zoneId;
        private String description;
        private LocalDateTime timestamp;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptimizationState {
        private String lastRun;
        private String status;
        private Double efficiencyScore;
        private Map<String, Double> zoneScores;
        private List<String> recommendations;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PredictionsState {
        private String modelVersion;
        private String lastTrained;
        private Double accuracy;
        private Integer predictionsGenerated;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimulationState {
        private boolean running;
        private double speedFactor;
        private int vehicleSpawnRate;
        private int activeVehicles;
    }
}