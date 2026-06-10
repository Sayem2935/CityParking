package com.cityparking.backend.controller;

import com.cityparking.backend.dto.common.ApiResponse;
import com.cityparking.backend.dto.prediction.*;
import com.cityparking.backend.service.ParkingPredictionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/parking/predictions")
@RequiredArgsConstructor
@Tag(name = "Parking Predictions", description = "AI-powered parking occupancy prediction and analytics")
public class ParkingPredictionController {

    private final ParkingPredictionService predictionService;

    @GetMapping
    @Operation(summary = "Get latest predictions", description = "Returns the most recent parking occupancy predictions")
    public ResponseEntity<ApiResponse<PredictionResponse>> getPredictions(
            @RequestParam(required = false) String zone) {
        PredictionResponse predictions = (zone != null && !zone.isEmpty())
                ? predictionService.generatePredictions(zone)
                : predictionService.getLatestPredictions();
        return ResponseEntity.ok(ApiResponse.success(predictions));
    }

    @GetMapping("/current")
    @Operation(summary = "Get current predictions", description = "Generates fresh predictions based on current data")
    public ResponseEntity<ApiResponse<PredictionResponse>> getCurrentPredictions(
            @RequestParam(required = false) String zone) {
        PredictionResponse predictions = predictionService.generatePredictions(zone);
        return ResponseEntity.ok(ApiResponse.success(predictions));
    }

    @GetMapping("/trends")
    @Operation(summary = "Get trend analysis", description = "Returns hourly, daily, and weekly occupancy trends")
    public ResponseEntity<ApiResponse<TrendResponse>> getTrends() {
        TrendResponse trends = predictionService.getTrends();
        return ResponseEntity.ok(ApiResponse.success(trends));
    }

    @GetMapping("/trend")
    @Operation(summary = "Get trend analysis (alias)", description = "Returns hourly, daily, and weekly occupancy trends")
    public ResponseEntity<ApiResponse<TrendResponse>> getTrend() {
        TrendResponse trends = predictionService.getTrends();
        return ResponseEntity.ok(ApiResponse.success(trends));
    }

    @GetMapping("/peak-hours")
    @Operation(summary = "Get peak hour analysis", description = "Returns busiest hours, days, and utilization data")
    public ResponseEntity<ApiResponse<PeakHourResponse>> getPeakHours() {
        PeakHourResponse peakHours = predictionService.getPeakHours();
        return ResponseEntity.ok(ApiResponse.success(peakHours));
    }

    @PostMapping("/generate")
    @Operation(summary = "Generate new predictions", description = "Forces generation of new parking predictions")
    public ResponseEntity<ApiResponse<PredictionResponse>> generatePredictions(
            @RequestParam(required = false) String zone) {
        PredictionResponse predictions = predictionService.generatePredictions(zone);
        return ResponseEntity.ok(ApiResponse.success(predictions));
    }

    @GetMapping("/analytics")
    @Operation(summary = "Get analytics", description = "Returns comprehensive parking analytics including averages, peaks, and trends")
    public ResponseEntity<ApiResponse<AnalyticsResponse>> getAnalytics() {
        AnalyticsResponse analytics = predictionService.getAnalytics();
        return ResponseEntity.ok(ApiResponse.success(analytics));
    }
}