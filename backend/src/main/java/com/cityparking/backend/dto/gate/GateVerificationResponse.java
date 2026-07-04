package com.cityparking.backend.dto.gate;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for the Raspberry Pi Gate Verification endpoint.
 *
 * This is a self-contained response that the Pi can parse directly
 * to decide whether to open the gate relay.
 *
 * Wrapped by the standard ApiResponse on the controller level.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class GateVerificationResponse {

    /**
     * Decision: ALLOW or DENY
     */
    private String decision;

    /**
     * Reason code for the decision.
     *
     * ALLOW reasons: FACE_MATCH
     * DENY reasons:  FACE_NOT_MATCHED, USER_NOT_ENROLLED, NO_FACE,
     *                 MULTIPLE_FACES, LOW_QUALITY, NO_REGISTERED_VEHICLE,
     *                 TOKEN_INVALID, BACKEND_ERROR
     */
    private String reason;

    /**
     * Face similarity score (0.0 – 1.0).
     * Null when no face could be extracted.
     */
    private Double similarity;

    /**
     * Matched user information.
     * Null when face was not matched.
     */
    private UserInfo user;

    /**
     * Vehicle information for the matched user.
     * Null when face was not matched.
     */
    private VehicleInfo vehicle;

    /**
     * Gate relay instruction for the Pi.
     * Null when access is denied.
     */
    private GateInfo gate;

    // ── Nested DTOs ──────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class UserInfo {
        private Long id;
        private String name;
        private String studentId;
        private String department;
        private String university;
        private String email;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class VehicleInfo {
        private boolean registered;
        private String plate;
        private String type;
        private String make;
        private String model;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class GateInfo {
        /** Whether the Pi should activate the relay. */
        private boolean open;
        /** Duration in milliseconds to keep the relay open. */
        private int duration;
    }

    // ── Convenience factory methods ──────────────────────────────

    public static GateVerificationResponse allow(Double similarity,
                                                  UserInfo user,
                                                  VehicleInfo vehicle) {
        return GateVerificationResponse.builder()
                .decision("ALLOW")
                .reason("FACE_MATCH")
                .similarity(similarity)
                .user(user)
                .vehicle(vehicle)
                .gate(GateInfo.builder()
                        .open(true)
                        .duration(5000)
                        .build())
                .build();
    }

    public static GateVerificationResponse deny(String reason) {
        return GateVerificationResponse.builder()
                .decision("DENY")
                .reason(reason)
                .build();
    }

    public static GateVerificationResponse deny(String reason, Double similarity) {
        return GateVerificationResponse.builder()
                .decision("DENY")
                .reason(reason)
                .similarity(similarity)
                .build();
    }
}