package com.cityparking.backend.dto.parking;

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
public class ScanResultResponse {
    private Integer totalSlots;
    private Integer occupiedSlots;
    private Integer freeSlots;
    private List<SlotDetection> detections;
    private Double processingTimeMs;
    private LocalDateTime scannedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SlotDetection {
        private String slotCode;
        private Boolean occupied;
        private Double confidence;
    }
}