package com.cityparking.backend.dto.faceenrollment;

import com.cityparking.backend.entity.FaceEnrollment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FaceEnrollmentResponse {

    private Long id;
    private String videoUrl;
    private String status;
    private String notes;
    private LocalDateTime enrolledAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static FaceEnrollmentResponse fromEntity(FaceEnrollment enrollment) {
        return FaceEnrollmentResponse.builder()
                .id(enrollment.getId())
                .videoUrl(enrollment.getVideoUrl())
                .status(enrollment.getStatus().name())
                .notes(enrollment.getNotes())
                .enrolledAt(enrollment.getEnrolledAt())
                .createdAt(enrollment.getCreatedAt())
                .updatedAt(enrollment.getUpdatedAt())
                .build();
    }
}