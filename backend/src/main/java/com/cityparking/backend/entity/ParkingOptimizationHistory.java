package com.cityparking.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "parking_optimization_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParkingOptimizationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "vehicle_id")
    private Long vehicleId;

    @Column(name = "assigned_slot", length = 20)
    private String assignedSlot;

    @Column(name = "assigned_zone", length = 10)
    private String assignedZone;

    @Column(name = "search_time_seconds")
    private Double searchTimeSeconds;

    @Column(name = "walking_distance")
    private Double walkingDistance;

    @Column(name = "occupancy_percentage")
    private Double occupancyPercentage;

    @Column(name = "congestion_level", length = 20)
    private String congestionLevel;

    @Column(name = "reward_score")
    private Double rewardScore;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}