package com.cityparking.backend.repository;

import com.cityparking.backend.entity.PlateVerificationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PlateVerificationLogRepository extends JpaRepository<PlateVerificationLog, Long> {

    List<PlateVerificationLog> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<PlateVerificationLog> findByDetectedPlate(String detectedPlate);

    @Query("SELECT p FROM PlateVerificationLog p WHERE p.userId = :userId AND p.verified = true ORDER BY p.createdAt DESC")
    List<PlateVerificationLog> findVerifiedByUserId(@Param("userId") Long userId);

    @Query("SELECT p FROM PlateVerificationLog p WHERE p.createdAt BETWEEN :start AND :end ORDER BY p.createdAt DESC")
    List<PlateVerificationLog> findByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(p) FROM PlateVerificationLog p WHERE p.userId = :userId AND p.verified = true")
    long countVerifiedByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(p) FROM PlateVerificationLog p WHERE p.userId = :userId")
    long countByUserId(@Param("userId") Long userId);
}