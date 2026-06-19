package com.cityparking.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "face_enrollments",
       indexes = {
           @Index(name = "idx_face_enrollments_user_status", columnList = "user_id, status")
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FaceEnrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "User is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Size(max = 500, message = "Video URL must not exceed 500 characters")
    @Column(length = 500)
    private String videoUrl;

    @Size(max = 500, message = "Video path must not exceed 500 characters")
    @Column(length = 500)
    private String videoPath;

    @Min(value = 1, message = "Video size must be positive")
    @Column
    private Long videoSize;

    @Min(value = 1, message = "Duration must be at least 1 second")
    @Max(value = 3600, message = "Duration must not exceed 3600 seconds (1 hour)")
    @Column
    private Integer durationSeconds;

    @Column
    private LocalDateTime uploadedAt;

    @NotNull(message = "Enrollment status is required")
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EnrollmentStatus status = EnrollmentStatus.PENDING;

    @Size(max = 1000, message = "Notes must not exceed 1000 characters")
    @Column(length = 1000)
    private String notes;

    @Column
    private LocalDateTime enrolledAt;

    // AWS Rekognition fields (added in V10 migration)
    @Column(name = "external_face_id", length = 200)
    private String externalFaceId;

    @Column(name = "collection_id", length = 200)
    private String collectionId;

    @Column(name = "provider", length = 50)
    private String provider;

    @Column(name = "confidence")
    private Double confidence;

    @Column(name = "processing_attempts")
    @Builder.Default
    private Integer processingAttempts = 0;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "image_path", length = 500)
    private String imagePath;

    @Column(name = "user_id", nullable = false, insertable = false, updatable = false)
    private Long userId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum EnrollmentStatus {
        PENDING,
        PROCESSING,
        ENROLLED,
        FAILED
    }
}
