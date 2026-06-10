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
public class PredictionResponse {

    private Double currentOccupancy;
    private Integer totalSlots;
    private Integer occupiedSlots;
    private Integer freeSlots;
    private String trend;
    private List<PredictionPointResponse> predictions;
    private List<String> recommendations;
    private LocalDateTime generatedAt;
}