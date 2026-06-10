package com.cityparking.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "parking_scan_log")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParkingScanLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "total_slots", nullable = false)
    private Integer totalSlots;

    @Column(name = "occupied_slots", nullable = false)
    private Integer occupiedSlots;

    @Column(name = "free_slots", nullable = false)
    private Integer freeSlots;

    @Column(name = "detections_json", columnDefinition = "TEXT")
    private String detectionsJson;

    @Column(name = "scanned_at", nullable = false)
    private LocalDateTime scannedAt;

    @Column(name = "occupied_detected")
    private Integer occupiedDetected;

    @Column(name = "scan_image_path", length = 500)
    private String scanImagePath;

    @Column(name = "processing_time_ms")
    private Double processingTimeMs;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (scannedAt == null) scannedAt = LocalDateTime.now();
    }
}