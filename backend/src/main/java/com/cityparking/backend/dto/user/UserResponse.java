package com.cityparking.backend.dto.user;

import com.cityparking.backend.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String avatarUrl;
    private Boolean isActive;
    private String role;
    private Integer vehicleCount;
    private Boolean hasFaceEnrollment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static UserResponse fromEntity(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .isActive(user.getIsActive())
                .role(user.getRole().name())
                .vehicleCount(user.getVehicles() != null ? user.getVehicles().size() : 0)
                .hasFaceEnrollment(user.getFaceEnrollments() != null &&
                        user.getFaceEnrollments().stream()
                                .anyMatch(fe -> fe.getStatus() == com.cityparking.backend.entity.FaceEnrollment.EnrollmentStatus.ENROLLED))
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}