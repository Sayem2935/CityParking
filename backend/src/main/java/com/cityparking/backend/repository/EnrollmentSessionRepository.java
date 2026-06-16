package com.cityparking.backend.repository;

import com.cityparking.backend.entity.EnrollmentSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentSessionRepository extends JpaRepository<EnrollmentSession, Long> {

    Optional<EnrollmentSession> findBySessionToken(String sessionToken);

    List<EnrollmentSession> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<EnrollmentSession> findFirstByUserIdAndStatusOrderByCreatedAtDesc(
            Long userId, EnrollmentSession.SessionStatus status);

    List<EnrollmentSession> findByStatusAndCreatedAtBefore(
            EnrollmentSession.SessionStatus status, LocalDateTime before);

    long countByUserId(Long userId);
}
