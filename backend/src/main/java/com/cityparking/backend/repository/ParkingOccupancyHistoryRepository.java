package com.cityparking.backend.repository;

import com.cityparking.backend.entity.ParkingOccupancyHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ParkingOccupancyHistoryRepository extends JpaRepository<ParkingOccupancyHistory, Long> {

    List<ParkingOccupancyHistory> findByTimestampBetweenOrderByTimestampAsc(
            LocalDateTime start, LocalDateTime end);

    List<ParkingOccupancyHistory> findByZoneAndTimestampBetweenOrderByTimestampAsc(
            String zone, LocalDateTime start, LocalDateTime end);

    Optional<ParkingOccupancyHistory> findFirstByZoneIsNullOrderByTimestampDesc();

    Optional<ParkingOccupancyHistory> findFirstByZoneOrderByTimestampDesc(String zone);

    List<ParkingOccupancyHistory> findTop100ByZoneIsNullOrderByTimestampDesc();

    List<ParkingOccupancyHistory> findTop100ByZoneOrderByTimestampDesc(String zone);

    // Hourly utilization: average occupancy grouped by hour of day
    @Query(value = "SELECT EXTRACT(HOUR FROM h.timestamp) as hour, " +
           "AVG(h.occupancy_percentage) as avg_occupancy, " +
           "MAX(h.occupancy_percentage) as max_occupancy " +
           "FROM parking_occupancy_history h " +
           "WHERE h.zone IS NULL AND h.timestamp >= :since " +
           "GROUP BY EXTRACT(HOUR FROM h.timestamp) " +
           "ORDER BY hour", nativeQuery = true)
    List<Object[]> findHourlyUtilization(@Param("since") LocalDateTime since);

    // Daily utilization: average occupancy grouped by date
    @Query(value = "SELECT DATE(h.timestamp) as date, " +
           "AVG(h.occupancy_percentage) as avg_occupancy, " +
           "MAX(h.occupancy_percentage) as max_occupancy, " +
           "MIN(h.occupancy_percentage) as min_occupancy " +
           "FROM parking_occupancy_history h " +
           "WHERE h.zone IS NULL AND h.timestamp >= :since " +
           "GROUP BY DATE(h.timestamp) " +
           "ORDER BY date", nativeQuery = true)
    List<Object[]> findDailyUtilization(@Param("since") LocalDateTime since);

    // Weekly utilization: average occupancy grouped by day of week
    @Query(value = "SELECT EXTRACT(DOW FROM h.timestamp) as day_of_week, " +
           "AVG(h.occupancy_percentage) as avg_occupancy, " +
           "MAX(h.occupancy_percentage) as max_occupancy " +
           "FROM parking_occupancy_history h " +
           "WHERE h.zone IS NULL AND h.timestamp >= :since " +
           "GROUP BY EXTRACT(DOW FROM h.timestamp) " +
           "ORDER BY day_of_week", nativeQuery = true)
    List<Object[]> findWeeklyUtilization(@Param("since") LocalDateTime since);

    // Peak occupancy periods: top N records with highest occupancy
    @Query("SELECT h FROM ParkingOccupancyHistory h " +
           "WHERE h.zone IS NULL AND h.timestamp >= :since " +
           "ORDER BY h.occupancyPercentage DESC")
    List<ParkingOccupancyHistory> findPeakOccupancyPeriods(
            @Param("since") LocalDateTime since);

    // Historical averages by zone
    @Query("SELECT h.zone, AVG(h.occupancyPercentage) as avgOcc " +
           "FROM ParkingOccupancyHistory h " +
           "WHERE h.zone IS NOT NULL AND h.timestamp >= :since " +
           "GROUP BY h.zone " +
           "ORDER BY h.zone")
    List<Object[]> findHistoricalAveragesByZone(@Param("since") LocalDateTime since);

    // Count history records
    long countByZoneIsNull();
}