package com.cityparking.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "access_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @Column(name = "decision", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private AccessDecision decision;

    @Column(name = "face_verified", nullable = false)
    private Boolean faceVerified;

    @Column(name = "plate_verified", nullable = false)
    private Boolean plateVerified;

    @Column(name = "face_confidence")
    private Double faceConfidence;

    @Column(name = "plate_confidence")
    private Double plateConfidence;

    @Column(name = "detected_plate", length = 50)
    private String detectedPlate;

    @Column(name = "face_message", length = 500)
    private String faceMessage;

    @Column(name = "plate_message", length = 500)
    private String plateMessage;

    @Column(name = "processing_time_ms")
    private Double processingTimeMs;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}