package com.cityparking.backend.dto.faceverification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for face verification operations.
 *
 * Updated to include AWS Rekognition metadata (externalFaceId, provider).
 * Preserves backward compatibility with existing controllers.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FaceVerificationResponse {

    private boolean verified;
    private Long userId;
    private String userName;
    private String userEmail;
    private Double confidence;
    private String externalFaceId;
    private String message;
    private String provider;
    private boolean multipleFacesDetected;
}
