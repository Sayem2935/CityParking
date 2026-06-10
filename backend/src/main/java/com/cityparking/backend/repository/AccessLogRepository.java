package com.cityparking.backend.repository;

import com.cityparking.backend.entity.AccessDecision;
import com.cityparking.backend.entity.AccessLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AccessLogRepository extends JpaRepository<AccessLog, Long> {

    List<AccessLog> findByUserId(Long userId);

    List<AccessLog> findByVehicleId(Long vehicleId);

    List<AccessLog> findByDecision(AccessDecision decision);

    List<AccessLog> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    List<AccessLog> findByUserIdOrderByCreatedAtDesc(Long userId);
}