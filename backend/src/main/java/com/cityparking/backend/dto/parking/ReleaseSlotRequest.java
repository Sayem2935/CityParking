package com.cityparking.backend.dto.parking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReleaseSlotRequest {
    private Long assignmentId;
    private Long vehicleId;
}