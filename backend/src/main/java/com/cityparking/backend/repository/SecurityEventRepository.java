package com.cityparking.backend.repository;

import com.cityparking.backend.entity.SecurityEvent;
import com.cityparking.backend.entity.SecurityEventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SecurityEventRepository extends JpaRepository<SecurityEvent, Long> {

    List<SecurityEvent> findByEventType(SecurityEventType eventType);

    List<SecurityEvent> findByResolvedFalse();

    List<SecurityEvent> findByUserId(Long userId);

    List<SecurityEvent> findByAccessLogId(Long accessLogId);

    List<SecurityEvent> findBySeverity(SecurityEvent.Severity severity);
}