package com.cityparking.backend.repository;

import com.cityparking.backend.entity.ParkingScanLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ParkingScanLogRepository extends JpaRepository<ParkingScanLog, Long> {

    List<ParkingScanLog> findByScannedAtAfter(LocalDateTime dateTime);
}