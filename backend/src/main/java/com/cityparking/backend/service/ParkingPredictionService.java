package com.cityparking.backend.service;

import com.cityparking.backend.dto.prediction.*;
import com.cityparking.backend.entity.ParkingOccupancyHistory;
import com.cityparking.backend.entity.ParkingPrediction;
import com.cityparking.backend.entity.ParkingSlot;
import com.cityparking.backend.repository.ParkingOccupancyHistoryRepository;
import com.cityparking.backend.repository.ParkingPredictionRepository;
import com.cityparking.backend.repository.ParkingSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ParkingPredictionService {

    private final ParkingOccupancyHistoryRepository occupancyHistoryRepository;
    private final ParkingPredictionRepository predictionRepository;
    private final ParkingSlotRepository parkingSlotRepository;

    private static final int MIN_HISTORY_POINTS = 6;
    private static final double EXPONENTIAL_SMOOTHING_ALPHA = 0.3;

    // ─── Historical Collection ──────────────────────────────────────────────

    /**
     * Automatically store occupancy snapshots every 5 minutes.
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    @Transactional
    public void collectOccupancySnapshot() {
        try {
            List<ParkingSlot> allSlots = parkingSlotRepository.findAll();
            if (allSlots.isEmpty()) {
                return;
            }

            int totalSlots = allSlots.size();
            int occupiedSlots = (int) allSlots.stream()
                    .filter(s -> s.getStatus() == ParkingSlot.SlotStatus.OCCUPIED || s.getStatus() == ParkingSlot.SlotStatus.RESERVED)
                    .count();
            int freeSlots = totalSlots - occupiedSlots;
            double occupancyPct = totalSlots > 0
                    ? roundTo((double) occupiedSlots / totalSlots * 100, 2)
                    : 0.0;

            ParkingOccupancyHistory snapshot = ParkingOccupancyHistory.builder()
                    .timestamp(LocalDateTime.now())
                    .totalSlots(totalSlots)
                    .occupiedSlots(occupiedSlots)
                    .freeSlots(freeSlots)
                    .occupancyPercentage(occupancyPct)
                    .zone(null) // overall
                    .floor(null)
                    .build();
            occupancyHistoryRepository.save(snapshot);

            log.debug("Occupancy snapshot collected: {}% occupancy ({} / {})",
                    occupancyPct, occupiedSlots, totalSlots);
        } catch (Exception e) {
            log.error("Failed to collect occupancy snapshot", e);
        }
    }

    // ─── Prediction Generation ──────────────────────────────────────────────

    /**
     * Generate forecasts for 15, 30, 60, 120 minutes ahead.
     */
    @Transactional
    public PredictionResponse generatePredictions() {
        return generatePredictions(null);
    }

    @Transactional
    public PredictionResponse generatePredictions(String zone) {
        // Get current occupancy
        Optional<ParkingOccupancyHistory> currentOpt = (zone == null)
                ? occupancyHistoryRepository.findFirstByZoneIsNullOrderByTimestampDesc()
                : occupancyHistoryRepository.findFirstByZoneOrderByTimestampDesc(zone);

        double currentOccupancy;
        int totalSlots = 0;
        int occupiedSlots = 0;
        int freeSlots = 0;

        if (currentOpt.isPresent()) {
            ParkingOccupancyHistory current = currentOpt.get();
            currentOccupancy = current.getOccupancyPercentage();
            totalSlots = current.getTotalSlots();
            occupiedSlots = current.getOccupiedSlots();
            freeSlots = current.getFreeSlots();
        } else {
            // Estimate from parking slot table
            List<ParkingSlot> allSlots = parkingSlotRepository.findAll();
            totalSlots = allSlots.size();
            if (totalSlots == 0) {
                return buildEmptyPrediction();
            }
            occupiedSlots = (int) allSlots.stream()
                    .filter(s -> s.getStatus() == ParkingSlot.SlotStatus.OCCUPIED || s.getStatus() == ParkingSlot.SlotStatus.RESERVED)
                    .count();
            freeSlots = totalSlots - occupiedSlots;
            currentOccupancy = roundTo((double) occupiedSlots / totalSlots * 100, 2);
        }

        // Get historical data for prediction models
        LocalDateTime since = LocalDateTime.now().minusDays(30);
        List<ParkingOccupancyHistory> history = (zone == null)
                ? occupancyHistoryRepository.findByTimestampBetweenOrderByTimestampAsc(since, LocalDateTime.now())
                : occupancyHistoryRepository.findByZoneAndTimestampBetweenOrderByTimestampAsc(zone, since, LocalDateTime.now());

        // Generate predictions using ensemble of models
        List<Double> historicalValues = history.stream()
                .map(ParkingOccupancyHistory::getOccupancyPercentage)
                .collect(Collectors.toList());

        String trend = calculateTrend(historicalValues);

        List<PredictionPointResponse> predictions = new ArrayList<>();
        int[] forecastMinutes = {15, 30, 60, 120};

        for (int minutes : forecastMinutes) {
            double predicted;
            double confidence;

            if (historicalValues.size() >= MIN_HISTORY_POINTS) {
                // Ensemble: weighted average of models
                double movingAvg = movingAverageForecast(historicalValues, minutes);
                double expSmooth = exponentialSmoothingForecast(historicalValues, minutes);
                double historicalTrend = historicalTrendForecast(historicalValues, minutes, since);

                // Weighted ensemble
                predicted = roundTo(0.4 * movingAvg + 0.35 * expSmooth + 0.25 * historicalTrend, 2);
                confidence = calculateConfidence(historicalValues, minutes);
            } else {
                // Simulation fallback
                predicted = simulationFallback(currentOccupancy, minutes, trend);
                confidence = roundTo(Math.max(0.5, 0.85 - (minutes / 200.0)), 2);
            }

            // Clamp to 0-100
            predicted = Math.max(0, Math.min(100, predicted));

            predictions.add(PredictionPointResponse.builder()
                    .minutesAhead(minutes)
                    .predictedOccupancy(predicted)
                    .confidence(confidence)
                    .build());

            // Store prediction in DB
            ParkingPrediction pred = ParkingPrediction.builder()
                    .predictionTimestamp(LocalDateTime.now())
                    .forecastFor(LocalDateTime.now().plusMinutes(minutes))
                    .predictedOccupancy(predicted)
                    .confidenceScore(confidence)
                    .predictionModel("ENSEMBLE_MAVG_ES_HT")
                    .zone(zone)
                    .build();
            predictionRepository.save(pred);
        }

        // Generate recommendations
        List<String> recommendations = generateRecommendations(currentOccupancy, predictions, trend);

        return PredictionResponse.builder()
                .currentOccupancy(currentOccupancy)
                .totalSlots(totalSlots)
                .occupiedSlots(occupiedSlots)
                .freeSlots(freeSlots)
                .trend(trend)
                .predictions(predictions)
                .recommendations(recommendations)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    // ─── Trend Analysis ─────────────────────────────────────────────────────

    public TrendResponse getTrends() {
        try {
            LocalDateTime since30Days = LocalDateTime.now().minusDays(30);
            LocalDateTime since7Days = LocalDateTime.now().minusDays(7);

            List<ParkingOccupancyHistory> recentHistory =
                    occupancyHistoryRepository.findByTimestampBetweenOrderByTimestampAsc(
                            since30Days, LocalDateTime.now());

            List<Double> recentValues = recentHistory.stream()
                    .map(ParkingOccupancyHistory::getOccupancyPercentage)
                    .collect(Collectors.toList());

            String growthTrend = calculateGrowthTrend(recentValues);
            String declineTrend = calculateDeclineTrend(recentValues);
            double velocity = calculateOccupancyVelocity(recentValues);
            double variance = calculateUtilizationVariance(recentValues);

            // Hourly trend
            List<Object[]> hourlyData = occupancyHistoryRepository.findHourlyUtilization(since7Days);
            List<TrendResponse.HourlyTrend> hourlyTrend = hourlyData.stream()
                    .filter(row -> row[0] != null && row[1] != null && row[2] != null)
                    .map(row -> TrendResponse.HourlyTrend.builder()
                            .hour(((Number) row[0]).intValue())
                            .averageOccupancy(roundTo(((Number) row[1]).doubleValue(), 2))
                            .peakOccupancy(roundTo(((Number) row[2]).doubleValue(), 2))
                            .build())
                    .collect(Collectors.toList());

            // Daily trend
            List<Object[]> dailyData = occupancyHistoryRepository.findDailyUtilization(since7Days);
            List<TrendResponse.DailyTrend> dailyTrend = dailyData.stream()
                    .filter(row -> row[0] != null && row[1] != null && row[2] != null && row[3] != null)
                    .map(row -> TrendResponse.DailyTrend.builder()
                            .date(row[0].toString())
                            .averageOccupancy(roundTo(((Number) row[1]).doubleValue(), 2))
                            .peakOccupancy(roundTo(((Number) row[2]).doubleValue(), 2))
                            .minOccupancy(roundTo(((Number) row[3]).doubleValue(), 2))
                            .build())
                    .collect(Collectors.toList());

            // Weekly trend
            List<Object[]> weeklyData = occupancyHistoryRepository.findWeeklyUtilization(since30Days);
            String[] dayNames = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
            List<TrendResponse.WeeklyTrend> weeklyTrend = weeklyData.stream()
                    .filter(row -> row[0] != null && row[1] != null && row[2] != null)
                    .map(row -> {
                        int dow = ((Number) row[0]).intValue();
                        return TrendResponse.WeeklyTrend.builder()
                                .dayOfWeek(dow)
                                .dayName(dow < dayNames.length ? dayNames[dow] : "Unknown")
                                .averageOccupancy(roundTo(((Number) row[1]).doubleValue(), 2))
                                .peakOccupancy(roundTo(((Number) row[2]).doubleValue(), 2))
                                .build();
                    })
                    .collect(Collectors.toList());

            return TrendResponse.builder()
                    .growthTrend(growthTrend)
                    .declineTrend(declineTrend)
                    .occupancyVelocity(roundTo(velocity, 4))
                    .utilizationVariance(roundTo(variance, 4))
                    .hourlyTrend(hourlyTrend)
                    .dailyTrend(dailyTrend)
                    .weeklyTrend(weeklyTrend)
                    .build();
        } catch (Exception e) {
            log.warn("Failed to compute trends, returning empty trend response", e);
            return TrendResponse.builder()
                    .growthTrend("INSUFFICIENT_DATA")
                    .declineTrend("INSUFFICIENT_DATA")
                    .occupancyVelocity(0.0)
                    .utilizationVariance(0.0)
                    .hourlyTrend(Collections.emptyList())
                    .dailyTrend(Collections.emptyList())
                    .weeklyTrend(Collections.emptyList())
                    .build();
        }
    }

    // ─── Peak Hour Analysis ─────────────────────────────────────────────────

    public PeakHourResponse getPeakHours() {
        LocalDateTime since = LocalDateTime.now().minusDays(30);

        // Hourly utilization
        List<Object[]> hourlyData = occupancyHistoryRepository.findHourlyUtilization(since);
        String[] hourLabels = new String[24];
        for (int i = 0; i < 24; i++) {
            hourLabels[i] = String.format("%02d:00", i);
        }

        int busiestHour = 0;
        double maxAvgOccupancy = 0;
        List<PeakHourResponse.HourlyPeak> hourlyBreakdown = new ArrayList<>();

        for (Object[] row : hourlyData) {
            int hour = ((Number) row[0]).intValue();
            double avgOcc = ((Number) row[1]).doubleValue();
            double peakOcc = ((Number) row[2]).doubleValue();

            if (avgOcc > maxAvgOccupancy) {
                maxAvgOccupancy = avgOcc;
                busiestHour = hour;
            }

            hourlyBreakdown.add(PeakHourResponse.HourlyPeak.builder()
                    .hour(hour)
                    .label(hour < hourLabels.length ? hourLabels[hour] : hour + ":00")
                    .averageOccupancy(roundTo(avgOcc, 2))
                    .peakOccupancy(roundTo(peakOcc, 2))
                    .build());
        }

        // Weekly utilization for busiest day
        List<Object[]> weeklyData = occupancyHistoryRepository.findWeeklyUtilization(since);
        String[] dayNames = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
        int busiestDay = 0;
        double maxDayAvg = 0;
        for (Object[] row : weeklyData) {
            int dow = ((Number) row[0]).intValue();
            double avg = ((Number) row[1]).doubleValue();
            if (avg > maxDayAvg) {
                maxDayAvg = avg;
                busiestDay = dow;
            }
        }

        // Overall average utilization
        double overallAvg = hourlyData.stream()
                .mapToDouble(row -> ((Number) row[1]).doubleValue())
                .average()
                .orElse(0.0);

        double peakOccupancy = hourlyData.stream()
                .mapToDouble(row -> ((Number) row[2]).doubleValue())
                .max()
                .orElse(0.0);

        return PeakHourResponse.builder()
                .busiestHour(busiestHour)
                .busiestHourLabel(busiestHour < hourLabels.length ? hourLabels[busiestHour] : busiestHour + ":00")
                .busiestDay(busiestDay)
                .busiestDayLabel(busiestDay < dayNames.length ? dayNames[busiestDay] : "Unknown")
                .averageUtilization(roundTo(overallAvg, 2))
                .peakOccupancy(roundTo(peakOccupancy, 2))
                .hourlyBreakdown(hourlyBreakdown)
                .build();
    }

    // ─── Get Latest Predictions ─────────────────────────────────────────────

    public PredictionResponse getLatestPredictions() {
        List<ParkingPrediction> latest = predictionRepository.findLatestPredictions();

        if (latest.isEmpty()) {
            return generatePredictions();
        }

        Optional<ParkingOccupancyHistory> currentOpt =
                occupancyHistoryRepository.findFirstByZoneIsNullOrderByTimestampDesc();

        double currentOcc = currentOpt.map(ParkingOccupancyHistory::getOccupancyPercentage).orElse(0.0);
        int totalSlots = currentOpt.map(ParkingOccupancyHistory::getTotalSlots).orElse(0);
        int occupiedSlots = currentOpt.map(ParkingOccupancyHistory::getOccupiedSlots).orElse(0);
        int freeSlots = currentOpt.map(ParkingOccupancyHistory::getFreeSlots).orElse(0);

        List<PredictionPointResponse> predictionPoints = latest.stream()
                .map(p -> PredictionPointResponse.builder()
                        .minutesAhead((int) java.time.Duration.between(
                                p.getPredictionTimestamp(), p.getForecastFor()).toMinutes())
                        .predictedOccupancy(p.getPredictedOccupancy())
                        .confidence(p.getConfidenceScore())
                        .build())
                .collect(Collectors.toList());

        List<Double> recentValues = occupancyHistoryRepository
                .findByTimestampBetweenOrderByTimestampAsc(
                        LocalDateTime.now().minusHours(2), LocalDateTime.now())
                .stream()
                .map(ParkingOccupancyHistory::getOccupancyPercentage)
                .collect(Collectors.toList());

        String trend = calculateTrend(recentValues);
        List<String> recommendations = generateRecommendations(currentOcc, predictionPoints, trend);

        return PredictionResponse.builder()
                .currentOccupancy(currentOcc)
                .totalSlots(totalSlots)
                .occupiedSlots(occupiedSlots)
                .freeSlots(freeSlots)
                .trend(trend)
                .predictions(predictionPoints)
                .recommendations(recommendations)
                .generatedAt(latest.get(0).getPredictionTimestamp())
                .build();
    }

    // ─── Analytics Engine (Part G) ──────────────────────────────────────────

    public AnalyticsResponse getAnalytics() {
        LocalDateTime since30Days = LocalDateTime.now().minusDays(30);

        List<ParkingOccupancyHistory> history =
                occupancyHistoryRepository.findByTimestampBetweenOrderByTimestampAsc(
                        since30Days, LocalDateTime.now());

        if (history.isEmpty()) {
            return AnalyticsResponse.builder()
                    .averageOccupancy(0.0)
                    .peakOccupancy(0.0)
                    .utilizationEfficiency(0.0)
                    .occupancyGrowthRate(0.0)
                    .totalSlots(0)
                    .averageOccupiedSlots(0)
                    .weeklyTrendAnalysis(Collections.emptyList())
                    .build();
        }

        List<Double> values = history.stream()
                .map(ParkingOccupancyHistory::getOccupancyPercentage)
                .collect(Collectors.toList());

        double avgOccupancy = values.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double peakOccupancy = values.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
        double utilizationEfficiency = roundTo(avgOccupancy, 2);
        double growthRate = calculateOccupancyGrowthRate(values);

        int totalSlots = history.get(history.size() - 1).getTotalSlots();
        int avgOccupied = (int) history.stream()
                .mapToInt(ParkingOccupancyHistory::getOccupiedSlots)
                .average().orElse(0.0);

        // Weekly trend analysis: break data into weekly chunks
        List<AnalyticsResponse.WeeklyTrendPoint> weeklyTrends = new ArrayList<>();
        LocalDateTime weekStart = since30Days;
        int weekNum = 1;
        while (weekStart.isBefore(LocalDateTime.now())) {
            final LocalDateTime ws = weekStart;
            LocalDateTime weekEnd = weekStart.plusDays(7);
            final LocalDateTime we = weekEnd;
            List<Double> weekValues = history.stream()
                    .filter(h -> !h.getTimestamp().isBefore(ws) && h.getTimestamp().isBefore(we))
                    .map(ParkingOccupancyHistory::getOccupancyPercentage)
                    .collect(Collectors.toList());

            if (!weekValues.isEmpty()) {
                double weekAvg = weekValues.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                double weekPeak = weekValues.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
                weeklyTrends.add(AnalyticsResponse.WeeklyTrendPoint.builder()
                        .weekLabel("Week " + weekNum)
                        .averageOccupancy(roundTo(weekAvg, 2))
                        .peakOccupancy(roundTo(weekPeak, 2))
                        .growthRate(roundTo(calculateOccupancyGrowthRate(weekValues), 2))
                        .build());
            }

            weekStart = weekEnd;
            weekNum++;
        }

        return AnalyticsResponse.builder()
                .averageOccupancy(roundTo(avgOccupancy, 2))
                .peakOccupancy(roundTo(peakOccupancy, 2))
                .utilizationEfficiency(utilizationEfficiency)
                .occupancyGrowthRate(roundTo(growthRate, 2))
                .totalSlots(totalSlots)
                .averageOccupiedSlots(avgOccupied)
                .weeklyTrendAnalysis(weeklyTrends)
                .build();
    }

    // ─── Intelligent Recommendations (Part I) ───────────────────────────────

    public List<String> generateRecommendations(double currentOccupancy,
                                                 List<PredictionPointResponse> predictions,
                                                 String trend) {
        List<String> recommendations = new ArrayList<>();

        // Check if any prediction exceeds 90%
        for (PredictionPointResponse pred : predictions) {
            if (pred.getPredictedOccupancy() >= 90 && pred.getMinutesAhead() <= 30) {
                recommendations.add(String.format(
                        "Parking will likely be over 90%% capacity within %d minutes. Consider redirecting incoming vehicles.",
                        pred.getMinutesAhead()));
                break;
            }
        }

        // Check if parking will be full
        for (PredictionPointResponse pred : predictions) {
            if (pred.getPredictedOccupancy() >= 98) {
                recommendations.add(String.format(
                        "Parking expected to reach full capacity in approximately %d minutes.",
                        pred.getMinutesAhead()));
                break;
            }
        }

        // Trend-based recommendations
        if ("INCREASING".equals(trend) && currentOccupancy > 70) {
            recommendations.add("Parking demand is increasing. Recommend directing incoming vehicles to less occupied zones.");
        }

        if ("DECREASING".equals(trend) && currentOccupancy > 50) {
            recommendations.add("Parking demand is decreasing. Occupancy expected to normalize shortly.");
        }

        // Capacity warnings
        if (currentOccupancy >= 95) {
            recommendations.add("CRITICAL: Parking is at " + roundTo(currentOccupancy, 0) +
                    "% capacity. Consider activating overflow parking areas.");
        } else if (currentOccupancy >= 85) {
            recommendations.add("WARNING: Parking is at " + roundTo(currentOccupancy, 0) +
                    "% capacity. Monitor closely for incoming vehicles.");
        }

        // Growth rate predictions
        if (predictions.size() >= 2) {
            double changeRate = predictions.get(predictions.size() - 1).getPredictedOccupancy() - currentOccupancy;
            if (Math.abs(changeRate) > 5) {
                String direction = changeRate > 0 ? "increase" : "decrease";
                recommendations.add(String.format(
                        "Parking demand expected to %s by %.0f%% over the next 2 hours.",
                        direction, Math.abs(changeRate)));
            }
        }

        // Zone-specific recommendations
        List<Object[]> zoneAverages = occupancyHistoryRepository
                .findHistoricalAveragesByZone(LocalDateTime.now().minusDays(7));
        if (!zoneAverages.isEmpty()) {
            String leastOccupiedZone = null;
            double minZoneAvg = 100;
            for (Object[] row : zoneAverages) {
                String zone = (String) row[0];
                double avg = ((Number) row[1]).doubleValue();
                if (avg < minZoneAvg) {
                    minZoneAvg = avg;
                    leastOccupiedZone = zone;
                }
            }
            if (leastOccupiedZone != null && currentOccupancy > 75) {
                recommendations.add(String.format(
                        "Recommend directing incoming vehicles to Zone %s (average occupancy: %.0f%%).",
                        leastOccupiedZone, minZoneAvg));
            }
        }

        if (recommendations.isEmpty()) {
            recommendations.add("Parking conditions are normal. No special actions required.");
        }

        return recommendations;
    }

    // ─── Prediction Models ──────────────────────────────────────────────────

    /**
     * Simple Moving Average Forecast
     */
    double movingAverageForecast(List<Double> history, int minutesAhead) {
        int windowSize = Math.min(12, history.size()); // last hour if 5-min intervals
        List<Double> window = history.subList(history.size() - windowSize, history.size());
        double avg = window.stream().mapToDouble(Double::doubleValue).average().orElse(50.0);

        // Apply trend adjustment
        if (window.size() >= 2) {
            double recentTrend = window.get(window.size() - 1) - window.get(0);
            double trendPerMinute = recentTrend / (windowSize * 5.0);
            return avg + (trendPerMinute * minutesAhead);
        }
        return avg;
    }

    /**
     * Exponential Smoothing Forecast
     */
    double exponentialSmoothingForecast(List<Double> history, int minutesAhead) {
        double smoothed = history.get(0);
        for (int i = 1; i < history.size(); i++) {
            smoothed = EXPONENTIAL_SMOOTHING_ALPHA * history.get(i)
                    + (1 - EXPONENTIAL_SMOOTHING_ALPHA) * smoothed;
        }

        // Project trend forward
        if (history.size() >= 2) {
            double lastDiff = history.get(history.size() - 1) - history.get(history.size() - 2);
            int steps = minutesAhead / 5;
            return smoothed + (lastDiff * steps * EXPONENTIAL_SMOOTHING_ALPHA);
        }
        return smoothed;
    }

    /**
     * Historical Trend Analysis - compare current time-of-day with historical averages
     */
    double historicalTrendForecast(List<Double> history, int minutesAhead, LocalDateTime since) {
        LocalDateTime targetTime = LocalDateTime.now().plusMinutes(minutesAhead);

        // Get historical data for same time-of-day
        List<ParkingOccupancyHistory> sameTimeHistory =
                occupancyHistoryRepository.findByTimestampBetweenOrderByTimestampAsc(
                        since, LocalDateTime.now());

        // Filter to same hour
        int targetHour = targetTime.getHour();
        double avgAtTargetHour = sameTimeHistory.stream()
                .filter(h -> h.getTimestamp().getHour() == targetHour)
                .mapToDouble(ParkingOccupancyHistory::getOccupancyPercentage)
                .average()
                .orElse(history.isEmpty() ? 50.0 : history.get(history.size() - 1));

        // Blend with recent data
        if (!history.isEmpty()) {
            return 0.6 * avgAtTargetHour + 0.4 * history.get(history.size() - 1);
        }
        return avgAtTargetHour;
    }

    /**
     * Simulation fallback when insufficient history exists
     */
    double simulationFallback(double currentOccupancy, int minutesAhead, String trend) {
        double trendFactor;
        switch (trend) {
            case "INCREASING":
                trendFactor = 0.15;
                break;
            case "DECREASING":
                trendFactor = -0.1;
                break;
            default:
                trendFactor = 0.02;
                break;
        }
        return currentOccupancy + (trendFactor * (minutesAhead / 15.0));
    }

    // ─── Confidence & Trend Calculations ────────────────────────────────────

    double calculateConfidence(List<Double> history, int minutesAhead) {
        if (history.size() < MIN_HISTORY_POINTS) {
            return 0.5;
        }

        // Base confidence decreases with forecast horizon
        double baseConfidence = 0.95 - (minutesAhead / 300.0);

        // Adjust for data quantity
        double dataFactor = Math.min(1.0, history.size() / 100.0);

        // Adjust for volatility
        double volatility = calculateUtilizationVariance(history);
        double volatilityPenalty = Math.min(0.2, volatility / 500.0);

        return roundTo(Math.max(0.3, baseConfidence * dataFactor - volatilityPenalty), 2);
    }

    String calculateTrend(List<Double> values) {
        if (values.size() < 4) {
            return "STABLE";
        }

        int recentSize = Math.min(12, values.size() / 2);
        List<Double> recent = values.subList(values.size() - recentSize, values.size());
        List<Double> earlier = values.subList(Math.max(0, values.size() - 2 * recentSize),
                values.size() - recentSize);

        if (earlier.isEmpty()) {
            return "STABLE";
        }

        double recentAvg = recent.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        double earlierAvg = earlier.stream().mapToDouble(Double::doubleValue).average().orElse(0);

        double diff = recentAvg - earlierAvg;
        if (diff > 3) return "INCREASING";
        if (diff < -3) return "DECREASING";
        return "STABLE";
    }

    String calculateGrowthTrend(List<Double> values) {
        if (values.size() < 10) return "INSUFFICIENT_DATA";

        int halfSize = values.size() / 2;
        double firstHalf = values.subList(0, halfSize).stream()
                .mapToDouble(Double::doubleValue).average().orElse(0);
        double secondHalf = values.subList(halfSize, values.size()).stream()
                .mapToDouble(Double::doubleValue).average().orElse(0);

        double change = ((secondHalf - firstHalf) / firstHalf) * 100;
        if (change > 5) return "GROWING";
        if (change < -5) return "DECLINING";
        return "STABLE";
    }

    String calculateDeclineTrend(List<Double> values) {
        if (values.size() < 10) return "INSUFFICIENT_DATA";

        int thirdSize = values.size() / 3;
        if (thirdSize == 0) return "STABLE";

        double lastThird = values.subList(values.size() - thirdSize, values.size()).stream()
                .mapToDouble(Double::doubleValue).average().orElse(0);
        double middleThird = values.subList(values.size() - 2 * thirdSize,
                values.size() - thirdSize).stream()
                .mapToDouble(Double::doubleValue).average().orElse(0);

        double change = ((lastThird - middleThird) / middleThird) * 100;
        if (change < -5) return "DECLINING";
        if (change > 5) return "GROWING";
        return "STABLE";
    }

    double calculateOccupancyVelocity(List<Double> values) {
        if (values.size() < 2) return 0.0;
        // Rate of change per 5-minute interval
        double sum = 0;
        int count = 0;
        for (int i = 1; i < values.size(); i++) {
            sum += values.get(i) - values.get(i - 1);
            count++;
        }
        return count > 0 ? sum / count : 0.0;
    }

    double calculateUtilizationVariance(List<Double> values) {
        if (values.size() < 2) return 0.0;
        double mean = values.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        return values.stream()
                .mapToDouble(v -> Math.pow(v - mean, 2))
                .average()
                .orElse(0.0);
    }

    double calculateOccupancyGrowthRate(List<Double> values) {
        if (values.size() < 2) return 0.0;
        double first = values.get(0);
        double last = values.get(values.size() - 1);
        if (first == 0) return 0.0;
        return ((last - first) / first) * 100;
    }

    // ─── Helper ─────────────────────────────────────────────────────────────

    PredictionResponse buildEmptyPrediction() {
        return PredictionResponse.builder()
                .currentOccupancy(0.0)
                .totalSlots(0)
                .occupiedSlots(0)
                .freeSlots(0)
                .trend("STABLE")
                .predictions(List.of(
                        PredictionPointResponse.builder().minutesAhead(15).predictedOccupancy(0.0).confidence(0.5).build(),
                        PredictionPointResponse.builder().minutesAhead(30).predictedOccupancy(0.0).confidence(0.5).build(),
                        PredictionPointResponse.builder().minutesAhead(60).predictedOccupancy(0.0).confidence(0.5).build(),
                        PredictionPointResponse.builder().minutesAhead(120).predictedOccupancy(0.0).confidence(0.5).build()
                ))
                .recommendations(List.of("No parking data available. Unable to generate predictions."))
                .generatedAt(LocalDateTime.now())
                .build();
    }

    double roundTo(double value, int places) {
        return BigDecimal.valueOf(value)
                .setScale(places, RoundingMode.HALF_UP)
                .doubleValue();
    }
}