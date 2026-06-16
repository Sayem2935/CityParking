package com.cityparking.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

/**
 * JPA entity for enrollment_frames table.
 *
 * Stores individual frames captured during a guided enrollment session.
 * Frames are ephemeral — deleted after embedding extraction.
 */
@Entity
@Table(name = "enrollment_frames",
       indexes = {
           @Index(name = "idx_enrollment_frames_session_id", columnList = "session_id"),
           @Index(name = "idx_enrollment_frames_pose", columnList = "session_id, pose_label")
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnrollmentFrame {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private EnrollmentSession session;

    @NotNull
    @Column(name = "frame_index", nullable = false)
    private Integer frameIndex;

    @NotNull
    @Size(max = 20)
    @Column(name = "pose_label", nullable = false, length = 20)
    private String poseLabel;

    // Quality metrics
    @Column(name = "blur_score")
    private Double blurScore;

    @Column(name = "face_score")
    private Double faceScore;

    // Face bounding box
    @Column(name = "bbox_x")
    private Integer bboxX;

    @Column(name = "bbox_y")
    private Integer bboxY;

    @Column(name = "bbox_w")
    private Integer bboxW;

    @Column(name = "bbox_h")
    private Integer bboxH;

    // 5-point landmarks as JSONB
    @Column(name = "landmarks_5pt", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private List<List<Double>> landmarks5pt;

    // Processing flags
    @Column(name = "passed_quality")
    @Builder.Default
    private Boolean passedQuality = false;

    @Column(name = "embedding_extracted")
    @Builder.Default
    private Boolean embeddingExtracted = false;

    // Frame storage path (temporary)
    @Size(max = 500)
    @Column(name = "frame_path", length = 500)
    private String framePath;

    @Column(name = "captured_at", nullable = false)
    @Builder.Default
    private LocalDateTime capturedAt = LocalDateTime.now();
}
