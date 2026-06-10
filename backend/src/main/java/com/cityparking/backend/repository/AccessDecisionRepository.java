package com.cityparking.backend.repository;

import com.cityparking.backend.entity.AccessDecision;
import com.cityparking.backend.entity.AccessLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AccessDecisionRepository extends JpaRepository<AccessLog, Long> {

    Optional<AccessLog> findTopByUserIdOrderByCreatedAtDesc(Long userId);

    List<AccessLog> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT al FROM AccessLog al WHERE al.createdAt BETWEEN :start AND :end ORDER BY al.createdAt DESC")
    List<AccessLog> findByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(al) FROM AccessLog al WHERE al.decision = :decision AND al.createdAt >= :since")
    long countByDecisionSince(@Param("decision") AccessDecision decision, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(al) FROM AccessLog al WHERE al.createdAt >= :since")
    long countSince(@Param("since") LocalDateTime since);
}
