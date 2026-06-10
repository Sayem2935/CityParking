package com.cityparking.backend.repository;

import com.cityparking.backend.entity.ParkingScanLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ParkingScanLogRepository extends JpaRepository<ParkingScanLog, Long> {

    List<ParkingScanLog> findAllByOrderByCreatedAtDesc();

    @Query("SELECT l FROM ParkingScanLog l ORDER BY l.createdAt DESC LIMIT 1")
    Optional<ParkingScanLog> findLatestScan();

    @Query("SELECT l FROM ParkingScanLog l WHERE l.createdAt BETWEEN :start AND :end ORDER BY l.createdAt DESC")
    List<ParkingScanLog> findByCreatedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(l) FROM ParkingScanLog l WHERE l.createdAt BETWEEN :start AND :end")
    long countScansBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT AVG(l.occupiedSlots * 1.0 / l.totalSlots) FROM ParkingScanLog l WHERE l.createdAt BETWEEN :start AND :end")
    Double averageOccupancyRateBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT MAX(l.occupiedSlots) FROM ParkingScanLog l WHERE l.createdAt BETWEEN :start AND :end")
    Integer maxOccupancyBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    List<ParkingScanLog> findByScannedAtAfter(LocalDateTime scannedAt);
}
