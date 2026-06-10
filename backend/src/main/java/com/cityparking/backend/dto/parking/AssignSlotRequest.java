package com.cityparking.backend.dto.parking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignSlotRequest {
    private Long userId;
    private Long vehicleId;
    private Integer preferredFloor;
    private String preferredZone;
}