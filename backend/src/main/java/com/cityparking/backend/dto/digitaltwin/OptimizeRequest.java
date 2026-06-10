package com.cityparking.backend.dto.digitaltwin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OptimizeRequest {

    private Double speedFactor;
    private Integer vehicleSpawnRate;
}