package com.cityparking.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * JPA entity for liveness_challenges table.
 *
 * Stores liveness detection evidence from enrollment sessions.
 * Each record represents one type of liveness check (blink, texture, etc.)
 * with its pass/fail result and supporting evidence.
 */
@Entity
@Table(name = "liveness_challenges",
       indexes = {
           @Index(name = "idx_liveness_challenges_session_id", columnList = "session_id")
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LivenessChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private EnrollmentSession session;

    @NotNull
    @Size(max = 30)
    @Column(name = "challenge_type", nullable = false, length = 30)
    private String challengeType;

    @NotNull
    @Column(nullable = false)
    private Boolean passed;

    @Column
    private Double confidence;

    // Evidence metadata as JSONB
    @Column(name = "evidence", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private Map<String, Object> evidence = Map.of();

    @Column(name = "challenged_at", nullable = false)
    @Builder.Default
    private LocalDateTime challengedAt = LocalDateTime.now();

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;
}
