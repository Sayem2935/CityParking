package com.cityparking.backend.dto.parking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParkingAssignmentResponse {
    private Long id;
    private Long userId;
    private Long vehicleId;
    private String slotCode;
    private String zone;
    private Integer floor;
    private Integer distance;
    private String status;
    private LocalDateTime assignedAt;
    private LocalDateTime releasedAt;
}