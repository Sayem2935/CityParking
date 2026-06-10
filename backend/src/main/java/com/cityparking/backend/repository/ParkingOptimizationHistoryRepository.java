package com.cityparking.backend.repository;

import com.cityparking.backend.entity.ParkingOptimizationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ParkingOptimizationHistoryRepository extends JpaRepository<ParkingOptimizationHistory, Long> {

    List<ParkingOptimizationHistory> findByTimestampBetweenOrderByTimestampDesc(LocalDateTime start, LocalDateTime end);

    List<ParkingOptimizationHistory> findTop50ByOrderByTimestampDesc();

    @Query("SELECT h FROM ParkingOptimizationHistory h WHERE h.assignedZone = :zone AND h.timestamp >= :since ORDER BY h.timestamp DESC")
    List<ParkingOptimizationHistory> findByZoneSince(@Param("zone") String zone, @Param("since") LocalDateTime since);

    @Query("SELECT AVG(h.searchTimeSeconds) FROM ParkingOptimizationHistory h WHERE h.timestamp >= :since")
    Double getAverageSearchTimeSince(@Param("since") LocalDateTime since);

    @Query("SELECT AVG(h.rewardScore) FROM ParkingOptimizationHistory h WHERE h.timestamp >= :since")
    Double getAverageRewardSince(@Param("since") LocalDateTime since);

    @Query("SELECT AVG(h.occupancyPercentage) FROM ParkingOptimizationHistory h WHERE h.timestamp >= :since")
    Double getAverageOccupancySince(@Param("since") LocalDateTime since);
}