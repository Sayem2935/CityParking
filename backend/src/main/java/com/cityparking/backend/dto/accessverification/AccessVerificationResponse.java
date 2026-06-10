package com.cityparking.backend.dto.accessverification;

import com.cityparking.backend.entity.AccessDecision;
import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Response from the dual verification access decision engine")
public class AccessVerificationResponse {

    @Schema(description = "Final access decision", example = "ACCESS_GRANTED")
    private AccessDecision decision;

    @Schema(description = "User ID if face was verified", example = "1")
    private Long userId;

    @Schema(description = "Vehicle ID if plate was verified", example = "1")
    private Long vehicleId;

    @Schema(description = "Face verification confidence score", example = "0.92")
    private Double faceConfidence;

    @Schema(description = "Plate verification confidence score", example = "0.95")
    private Double plateConfidence;

    @Schema(description = "Whether face was verified", example = "true")
    private Boolean faceVerified;

    @Schema(description = "Whether plate was verified", example = "true")
    private Boolean plateVerified;

    @Schema(description = "Detected license plate number", example = "ABC-1234")
    private String detectedPlate;

    @Schema(description = "Face verification message")
    private String faceMessage;

    @Schema(description = "Plate verification message")
    private String plateMessage;

    @Schema(description = "Human-readable decision message")
    private String message;

    @Schema(description = "Total processing time in milliseconds", example = "1250.5")
    private Double processingTimeMs;

    @Schema(description = "Access log ID for reference")
    private Long accessLogId;

    @Schema(description = "Security event IDs generated during verification")
    private List<Long> securityEventIds;

    @Schema(description = "Timestamp of the verification")
    private LocalDateTime timestamp;
}