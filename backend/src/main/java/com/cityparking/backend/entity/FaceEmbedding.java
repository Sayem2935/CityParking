package com.cityparking.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * JPA entity for face_embeddings table.
 *
 * Stores 512-dimensional ArcFace embeddings as comma-separated
 * float strings. The pgvector column type is used in PostgreSQL
 * but JPA maps it as a String for portability.
 *
 * Each embedding is linked to a user and an enrollment record.
 */
@Entity
@Table(name = "face_embeddings",
       indexes = {
           @Index(name = "idx_face_embeddings_v15_user_status", columnList = "user_id, status")
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FaceEmbedding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "User is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotNull(message = "Enrollment is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private FaceEnrollment enrollment;

    /** Reference to the guided enrollment session that produced this embedding. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private EnrollmentSession session;

    /** Pose label: center, left, right, up, down, blink, smile */
    @Column(name = "pose_label", length = 20)
    private String poseLabel;

    /** Estimated yaw angle in degrees (positive = looking right). */
    @Column(name = "yaw")
    private Double yaw;

    /** Estimated pitch angle in degrees (positive = looking up). */
    @Column(name = "pitch")
    private Double pitch;

    /** Estimated roll angle in degrees. */
    @Column(name = "roll")
    private Double roll;

    /**
     * 512-d ArcFace embedding vector stored as a pgvector-compatible string.
     * Format: "[0.0123,-0.0456,...]"
     * Mapped as TEXT in JPA; the actual column type is vector(512) in PostgreSQL.
     */
    @NotNull(message = "Embedding vector is required")
    @Column(name = "embedding", nullable = false, columnDefinition = "TEXT")
    private String embedding;

    @Size(max = 100)
    @Column(name = "model_name", length = 100, nullable = false)
    @Builder.Default
    private String modelName = "w600k_r50";

    @Size(max = 100)
    @Column(name = "model_pack", length = 100, nullable = false)
    @Builder.Default
    private String modelPack = "buffalo_l";

    /** RetinaFace detection confidence score. */
    @Column(name = "face_score")
    private Double faceScore;

    /** Bounding box x coordinate. */
    @Column(name = "bbox_x")
    private Integer bboxX;

    /** Bounding box y coordinate. */
    @Column(name = "bbox_y")
    private Integer bboxY;

    /** Bounding box width. */
    @Column(name = "bbox_w")
    private Integer bboxW;

    /** Bounding box height. */
    @Column(name = "bbox_h")
    private Integer bboxH;

    /** Status: ACTIVE, SUPERSEDED, DELETED */
    @NotNull
    @Column(name = "status", length = 20, nullable = false)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "user_id", nullable = false, insertable = false, updatable = false)
    private Long userId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // ── Helper methods ──────────────────────────────────────

    /**
     * Parse the embedding string back to a float array.
     * The pgvector format is "[0.123,-0.456,...]".
     */
    public float[] getEmbeddingVector() {
        if (embedding == null || embedding.isEmpty()) {
            return new float[0];
        }
        String clean = embedding.replace("[", "").replace("]", "").trim();
        if (clean.isEmpty()) {
            return new float[0];
        }
        String[] parts = clean.split(",");
        float[] vector = new float[parts.length];
        for (int i = 0; i < parts.length; i++) {
            vector[i] = Float.parseFloat(parts[i].trim());
        }
        return vector;
    }

    /**
     * Set the embedding from a float array.
     * Converts to pgvector-compatible format: "[0.123,-0.456,...]".
     */
    public void setEmbeddingVector(float[] vector) {
        if (vector == null || vector.length == 0) {
            this.embedding = null;
            return;
        }
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(vector[i]);
        }
        sb.append("]");
        this.embedding = sb.toString();
    }
}
