package com.cityparking.backend.repository;

import com.cityparking.backend.entity.ParkingPrediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ParkingPredictionRepository extends JpaRepository<ParkingPrediction, Long> {

    List<ParkingPrediction> findByForecastForBetweenOrderByForecastForAsc(
            LocalDateTime start, LocalDateTime end);

    List<ParkingPrediction> findByZoneAndForecastForBetweenOrderByForecastForAsc(
            String zone, LocalDateTime start, LocalDateTime end);

    List<ParkingPrediction> findByForecastForAfterOrderByForecastForAsc(LocalDateTime after);

    List<ParkingPrediction> findByZoneIsNullAndForecastForAfterOrderByForecastForAsc(
            LocalDateTime after);

    // Get the latest prediction batch
    @Query("SELECT p FROM ParkingPrediction p " +
           "WHERE p.zone IS NULL " +
           "AND p.predictionTimestamp = (SELECT MAX(p2.predictionTimestamp) FROM ParkingPrediction p2 WHERE p2.zone IS NULL) " +
           "ORDER BY p.forecastFor ASC")
    List<ParkingPrediction> findLatestPredictions();

    // Get latest predictions for a specific zone
    @Query("SELECT p FROM ParkingPrediction p " +
           "WHERE p.zone = :zone " +
           "AND p.predictionTimestamp = (SELECT MAX(p2.predictionTimestamp) FROM ParkingPrediction p2 WHERE p2.zone = :zone) " +
           "ORDER BY p.forecastFor ASC")
    List<ParkingPrediction> findLatestPredictionsForZone(@Param("zone") String zone);

    // Get peak hours from historical predictions
    @Query(value = "SELECT EXTRACT(HOUR FROM p.forecast_for) as hour, " +
           "AVG(p.predicted_occupancy) as avg_occupancy, " +
           "MAX(p.predicted_occupancy) as max_occupancy " +
           "FROM parking_predictions p " +
           "WHERE p.zone IS NULL AND p.created_at >= :since " +
           "GROUP BY EXTRACT(HOUR FROM p.forecast_for) " +
           "ORDER BY avg_occupancy DESC", nativeQuery = true)
    List<Object[]> findPeakHours(@Param("since") LocalDateTime since);

    // Delete old predictions (cleanup)
    void deleteByCreatedAtBefore(LocalDateTime before);

    long countByZoneIsNull();
}