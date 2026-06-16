package com.cityparking.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "First name is required")
    @Size(max = 100, message = "First name must not exceed 100 characters")
    @Column(nullable = false, length = 100)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 100, message = "Last name must not exceed 100 characters")
    @Column(nullable = false, length = 100)
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    @Column(nullable = false)
    private String password;

    @Size(max = 20, message = "Phone must not exceed 20 characters")
    @Column(length = 20)
    private String phone;

    @Size(max = 500, message = "Avatar URL must not exceed 500 characters")
    @Column(length = 500)
    private String avatarUrl;

    // University ID document extraction fields
    @Size(max = 200, message = "Student name must not exceed 200 characters")
    @Column(length = 200)
    private String studentName;

    @Size(max = 100, message = "Student ID must not exceed 100 characters")
    @Column(length = 100)
    private String studentId;

    @Size(max = 200, message = "University name must not exceed 200 characters")
    @Column(length = 200)
    private String universityName;

    @Size(max = 200, message = "Department must not exceed 200 characters")
    @Column(length = 200)
    private String department;

    @Size(max = 50, message = "Session must not exceed 50 characters")
    @Column(length = 50)
    private String session;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Role role = Role.USER;

    // Cascade PERSIST + MERGE (not ALL) to prevent orphan deletion of vehicles.
    // Vehicles have their own lifecycle; removing a user should NOT cascade-delete vehicles.
    @OneToMany(mappedBy = "user", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, orphanRemoval = false)
    @Builder.Default
    private List<Vehicle> vehicles = new ArrayList<>();

    // Cascade PERSIST + MERGE for face enrollments (audit trail preserved)
    @OneToMany(mappedBy = "user", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, orphanRemoval = false)
    @Builder.Default
    private List<FaceEnrollment> faceEnrollments = new ArrayList<>();

    // Multi-embedding enrollment metadata
    @Column(name = "face_enrolled")
    @Builder.Default
    private Boolean faceEnrolled = false;

    @Column(name = "face_enrolled_at")
    private LocalDateTime faceEnrolledAt;

    @Column(name = "face_embedding_count")
    @Builder.Default
    private Integer faceEmbeddingCount = 0;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    /**
     * Soft-delete timestamp. When non-null, the user is considered deleted.
     * Hard DELETE is blocked by ON DELETE NO ACTION constraints on
     * access_logs, security_events, and plate_verification_logs.
     * This preserves audit trail integrity.
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /**
     * Soft-delete: marks user as deactivated without breaking FK references
     * in access_logs, security_events, and plate_verification_logs.
     */
    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
        this.isActive = false;
    }

    /**
     * Restore a soft-deleted user.
     */
    public void restore() {
        this.deletedAt = null;
        this.isActive = true;
    }

    /**
     * Check if user is soft-deleted.
     */
    public boolean isDeleted() {
        return this.deletedAt != null;
    }

    public enum Role {
        USER,
        ADMIN
    }
}