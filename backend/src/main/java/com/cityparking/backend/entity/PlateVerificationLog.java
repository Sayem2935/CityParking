package com.cityparking.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "plate_verification_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlateVerificationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "User is required")
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @NotBlank(message = "Detected plate is required")
    @Size(max = 50, message = "Detected plate must not exceed 50 characters")
    @Column(name = "detected_plate", nullable = false, length = 50)
    private String detectedPlate;

    @NotNull(message = "Confidence is required")
    @DecimalMin(value = "0.0", message = "Confidence must be >= 0.0")
    @DecimalMax(value = "1.0", message = "Confidence must be <= 1.0")
    @Column(name = "confidence", nullable = false)
    private Double confidence;

    @NotNull(message = "Verified flag is required")
    @Column(name = "verified", nullable = false)
    private Boolean verified = false;

    @Column(name = "matched_vehicle_id")
    private Long matchedVehicleId;

    @Size(max = 500, message = "Image path must not exceed 500 characters")
    @Column(name = "image_path", length = 500)
    private String imagePath;

    @Column(name = "ai_response_raw", columnDefinition = "TEXT")
    private String aiResponseRaw;

    @Min(value = 0, message = "Processing time must be non-negative")
    @Column(name = "processing_time_ms")
    private Double processingTimeMs;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}