package com.cityparking.backend.dto.prediction;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionPointResponse {

    private Integer minutesAhead;
    private Double predictedOccupancy;
    private Double confidence;
}