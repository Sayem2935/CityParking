package com.cityparking.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * JPA entity for enrollment_sessions table.
 *
 * Tracks each guided multi-pose enrollment attempt.
 * A session goes through: INITIATED → CAPTURING → PROCESSING → COMPLETED / FAILED / EXPIRED
 */
@Entity
@Table(name = "enrollment_sessions",
       indexes = {
           @Index(name = "idx_enrollment_sessions_user_id", columnList = "user_id"),
           @Index(name = "idx_enrollment_sessions_status", columnList = "status"),
           @Index(name = "idx_enrollment_sessions_token", columnList = "session_token")
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnrollmentSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "User is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotNull
    @Column(name = "session_token", nullable = false, unique = true, length = 64)
    private String sessionToken;

    @NotNull
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SessionStatus status = SessionStatus.INITIATED;

    // Capture statistics
    @Column(name = "total_frames_captured")
    @Builder.Default
    private Integer totalFramesCaptured = 0;

    @Column(name = "quality_frames_accepted")
    @Builder.Default
    private Integer qualityFramesAccepted = 0;

    @Column(name = "embeddings_generated")
    @Builder.Default
    private Integer embeddingsGenerated = 0;

    @Column(name = "embeddings_after_dedup")
    @Builder.Default
    private Integer embeddingsAfterDedup = 0;

    // Liveness result
    @Column(name = "liveness_passed")
    private Boolean livenessPassed;

    @Column(name = "liveness_score")
    private Double livenessScore;

    // Pose completion tracking as JSONB
    @Column(name = "pose_completion", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private Map<String, Boolean> poseCompletion = Map.of();

    // Timing
    @Column(name = "session_duration_seconds")
    private Double sessionDurationSeconds;

    // Client metadata
    @Size(max = 500)
    @Column(name = "device_info", length = 500)
    private String deviceInfo;

    @Size(max = 45)
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    // Timestamps
    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "user_id", nullable = false, insertable = false, updatable = false)
    private Long userId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // Relationships
    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<EnrollmentFrame> frames = new ArrayList<>();

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<LivenessChallenge> livenessChallenges = new ArrayList<>();

    public enum SessionStatus {
        INITIATED,
        CAPTURING,
        PROCESSING,
        COMPLETED,
        FAILED,
        EXPIRED
    }
}
