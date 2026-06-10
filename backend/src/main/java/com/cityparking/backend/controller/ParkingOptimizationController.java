package com.cityparking.backend.controller;

import com.cityparking.backend.dto.common.ApiResponse;
import com.cityparking.backend.dto.optimization.*;
import com.cityparking.backend.service.ParkingOptimizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/parking/optimization")
@RequiredArgsConstructor
@Tag(name = "Parking Optimization", description = "RL-based dynamic parking optimization endpoints")
public class ParkingOptimizationController {

    private final ParkingOptimizationService optimizationService;

    @GetMapping("/recommendation")
    @Operation(summary = "Get RL-based zone recommendation", 
               description = "Returns optimal zone recommendation using reinforcement learning")
    public ResponseEntity<ApiResponse<ZoneRecommendationResponse>> getRecommendation() {
        ZoneRecommendationResponse recommendation = optimizationService.getRecommendation();
        return ResponseEntity.ok(ApiResponse.success("Recommendation generated", recommendation));
    }

    @GetMapping("/congestion")
    @Operation(summary = "Get congestion analysis", 
               description = "Returns congestion levels and analysis for all zones")
    public ResponseEntity<ApiResponse<CongestionResponse>> getCongestion() {
        CongestionResponse congestion = optimizationService.getCongestionAnalysis();
        return ResponseEntity.ok(ApiResponse.success("Congestion analysis", congestion));
    }

    @GetMapping("/load-balance")
    @Operation(summary = "Get load balancing analysis", 
               description = "Returns load distribution analysis and balancing recommendations")
    public ResponseEntity<ApiResponse<LoadBalanceResponse>> getLoadBalance() {
        LoadBalanceResponse loadBalance = optimizationService.getLoadBalanceAnalysis();
        return ResponseEntity.ok(ApiResponse.success("Load balance analysis", loadBalance));
    }

    @PostMapping("/train")
    @Operation(summary = "Trigger RL model training", 
               description = "Initiates reinforcement learning model training with specified parameters")
    public ResponseEntity<ApiResponse<?>> trainModel(@Valid @RequestBody(required = false) TrainRequest request) {
        if (request == null) {
            request = new TrainRequest();
        }
        var result = optimizationService.triggerTraining(request);
        return ResponseEntity.ok(ApiResponse.success("Training initiated", result));
    }

    @GetMapping("/performance")
    @Operation(summary = "Get RL performance metrics", 
               description = "Returns performance metrics including search time, reward, and benchmark comparisons")
    public ResponseEntity<ApiResponse<PerformanceResponse>> getPerformance() {
        PerformanceResponse performance = optimizationService.getPerformanceMetrics();
        return ResponseEntity.ok(ApiResponse.success("Performance metrics", performance));
    }

    @GetMapping("/smart-recommendations")
    @Operation(summary = "Get smart parking recommendations", 
               description = "Returns AI-powered parking assistant recommendations and alerts")
    public ResponseEntity<ApiResponse<SmartRecommendationResponse>> getSmartRecommendations() {
        SmartRecommendationResponse recommendations = optimizationService.getSmartRecommendations();
        return ResponseEntity.ok(ApiResponse.success("Smart recommendations", recommendations));
    }
}