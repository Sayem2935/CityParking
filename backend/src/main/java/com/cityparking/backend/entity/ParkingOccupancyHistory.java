package com.cityparking.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "parking_occupancy_history", indexes = {
        @Index(name = "idx_occupancy_history_timestamp", columnList = "timestamp"),
        @Index(name = "idx_occupancy_history_zone", columnList = "zone"),
        @Index(name = "idx_occupancy_history_floor", columnList = "floor")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParkingOccupancyHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "total_slots", nullable = false)
    private Integer totalSlots;

    @Column(name = "occupied_slots", nullable = false)
    private Integer occupiedSlots;

    @Column(name = "free_slots", nullable = false)
    private Integer freeSlots;

    @Column(name = "occupancy_percentage", nullable = false)
    private Double occupancyPercentage;

    @Column(length = 10)
    private String zone;

    private Integer floor;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}