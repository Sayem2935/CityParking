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
public class FaceEnrollmentStatusResponse {

    private Long id;
    private Long userId;
    private FaceEnrollment.EnrollmentStatus status;
    private String notes;
    private LocalDateTime enrolledAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // AWS Rekognition fields
    private String externalFaceId;
    private String collectionId;
    private String provider;
    private Double confidence;
    private Integer processingAttempts;
    private String errorMessage;
}
