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
public class ParkingSlotResponse {
    private Long id;
    private String slotCode;
    private String slotType;
    private String status;
    private Integer floorNumber;
    private String zone;
    private String coordinatesJson;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}