package com.cityparking.backend.repository;

import com.cityparking.backend.entity.FaceEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FaceEnrollmentRepository extends JpaRepository<FaceEnrollment, Long> {

    // Find the most recent enrollment for a user
    Optional<FaceEnrollment> findFirstByUserIdOrderByCreatedAtDesc(Long userId);

    // Find all enrollments for a user
    List<FaceEnrollment> findByUserId(Long userId);

    // Find enrollment by user ID and status
    Optional<FaceEnrollment> findByUserIdAndStatus(Long userId, FaceEnrollment.EnrollmentStatus status);

    // Find completed enrollment for a user (ENROLLED or COMPLETED status)
    @Query("SELECT fe FROM FaceEnrollment fe WHERE fe.user.id = :userId AND (fe.status = 'ENROLLED' OR fe.status = 'COMPLETED')")
    Optional<FaceEnrollment> findCompletedEnrollmentByUserId(@Param("userId") Long userId);

    // Check if user has any completed enrollment
    @Query("SELECT CASE WHEN COUNT(fe) > 0 THEN true ELSE false END FROM FaceEnrollment fe WHERE fe.user.id = :userId AND (fe.status = 'ENROLLED' OR fe.status = 'COMPLETED')")
    boolean existsCompletedEnrollmentByUserId(@Param("userId") Long userId);

    // Find by external face ID
    Optional<FaceEnrollment> findByExternalFaceId(String externalFaceId);

    // Find by external face ID and provider
    Optional<FaceEnrollment> findByExternalFaceIdAndProvider(String externalFaceId, String provider);

    // Find all enrollments by status
    List<FaceEnrollment> findByStatus(FaceEnrollment.EnrollmentStatus status);

    // Find pending enrollments older than a given time
    @Query("SELECT fe FROM FaceEnrollment fe WHERE fe.status = 'PENDING' AND fe.createdAt < :cutoffTime")
    List<FaceEnrollment> findPendingOlderThan(@Param("cutoffTime") LocalDateTime cutoffTime);

    // Find failed enrollments with low retry count
    @Query("SELECT fe FROM FaceEnrollment fe WHERE fe.status = 'FAILED' AND fe.processingAttempts < :maxAttempts")
    List<FaceEnrollment> findFailedWithRetryAvailable(@Param("maxAttempts") int maxAttempts);

    // Find all enrollments with external face ID (for migration/cleanup)
    @Query("SELECT fe FROM FaceEnrollment fe WHERE fe.externalFaceId IS NOT NULL")
    List<FaceEnrollment> findAllWithExternalFaceId();
}