package com.cityparking.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "parking_predictions", indexes = {
        @Index(name = "idx_predictions_forecast_for", columnList = "forecast_for"),
        @Index(name = "idx_predictions_timestamp", columnList = "prediction_timestamp")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParkingPrediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "prediction_timestamp", nullable = false)
    private LocalDateTime predictionTimestamp;

    @Column(name = "forecast_for", nullable = false)
    private LocalDateTime forecastFor;

    @Column(name = "predicted_occupancy", nullable = false)
    private Double predictedOccupancy;

    @Column(name = "confidence_score", nullable = false)
    private Double confidenceScore;

    @Column(name = "prediction_model", nullable = false, length = 50)
    private String predictionModel;

    @Column(length = 10)
    private String zone;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (predictionTimestamp == null) {
            predictionTimestamp = LocalDateTime.now();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}