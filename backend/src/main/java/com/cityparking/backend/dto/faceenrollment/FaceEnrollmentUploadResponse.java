package com.cityparking.backend.dto.faceenrollment;

import com.cityparking.backend.entity.FaceEnrollment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FaceEnrollmentUploadResponse {

    private Long id;
    private Long userId;
    private String videoPath;
    private Long videoSize;
    private Integer durationSeconds;
    private String status;
    private LocalDateTime uploadedAt;
    private LocalDateTime createdAt;

    public static FaceEnrollmentUploadResponse fromEntity(FaceEnrollment enrollment) {
        return FaceEnrollmentUploadResponse.builder()
                .id(enrollment.getId())
                .userId(enrollment.getUser().getId())
                .videoPath(enrollment.getVideoPath())
                .videoSize(enrollment.getVideoSize())
                .durationSeconds(enrollment.getDurationSeconds())
                .status(enrollment.getStatus().name())
                .uploadedAt(enrollment.getUploadedAt())
                .createdAt(enrollment.getCreatedAt())
                .build();
    }
}