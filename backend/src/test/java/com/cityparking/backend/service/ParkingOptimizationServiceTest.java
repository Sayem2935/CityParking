package com.cityparking.backend.service;

import com.cityparking.backend.dto.optimization.*;
import com.cityparking.backend.entity.ParkingOptimizationHistory;
import com.cityparking.backend.entity.ParkingRlDecision;
import com.cityparking.backend.repository.ParkingOptimizationHistoryRepository;
import com.cityparking.backend.repository.ParkingRlDecisionRepository;
import com.cityparking.backend.repository.ParkingSlotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ParkingOptimizationService Tests")
class ParkingOptimizationServiceTest {

    @Mock
    private ParkingOptimizationHistoryRepository optimizationHistoryRepository;

    @Mock
    private ParkingRlDecisionRepository rlDecisionRepository;

    @Mock
    private ParkingSlotRepository parkingSlotRepository;

    @InjectMocks
    private ParkingOptimizationService optimizationService;

    @BeforeEach
    void setUp() {
        // Default: repository returns 0 total slots and 0 occupied
        lenient().when(parkingSlotRepository.count()).thenReturn(0L);
        lenient().when(parkingSlotRepository.countOccupied()).thenReturn(0L);
    }

    // === TEST 1: Recommendation - Heuristic ===
    @Test
    @DisplayName("Should return heuristic recommendation")
    void shouldReturnHeuristicRecommendation() {
        ZoneRecommendationResponse response = optimizationService.getRecommendation();

        assertThat(response).isNotNull();
        assertThat(response.getRecommendedZone()).isNotNull();
        assertThat(response.getAlgorithm()).isEqualTo("Heuristic");
    }

    // === TEST 3: Congestion Analysis ===
    @Test
    @DisplayName("Should generate congestion analysis across all zones")
    void shouldGenerateCongestionAnalysis() {
        CongestionResponse response = optimizationService.getCongestionAnalysis();

        assertThat(response).isNotNull();
        assertThat(response.getZones()).isNotEmpty();
        assertThat(response.getZones()).containsKey("Zone A");
        assertThat(response.getZones()).containsKey("Zone B");
        assertThat(response.getZones()).containsKey("Zone C");
        assertThat(response.getZones()).containsKey("Zone D");
        assertThat(response.getOverallLevel()).isIn("LOW", "MODERATE", "HIGH", "CRITICAL");
    }

    // === TEST 4: Congestion - Bottleneck Detection ===
    @Test
    @DisplayName("Should identify bottleneck zone in congestion analysis")
    void shouldIdentifyBottleneckZone() {
        when(parkingSlotRepository.count()).thenReturn(100L);
        when(parkingSlotRepository.countOccupied()).thenReturn(80L);

        CongestionResponse response = optimizationService.getCongestionAnalysis();

        assertThat(response).isNotNull();
        assertThat(response.getBottleneckZone()).isNotNull();
    }

    // === TEST 5: Load Balance Analysis ===
    @Test
    @DisplayName("Should generate load balance analysis")
    void shouldGenerateLoadBalanceAnalysis() {
        LoadBalanceResponse response = optimizationService.getLoadBalanceAnalysis();

        assertThat(response).isNotNull();
        assertThat(response.getZoneOccupancies()).isNotEmpty();
        assertThat(response.getBalanceScore()).isGreaterThanOrEqualTo(0);
        assertThat(response.getRecommendations()).isNotNull();
    }

    // === TEST 6: Performance Metrics with Empty History ===
    @Test
    @DisplayName("Should return zero metrics with empty optimization history")
    void shouldReturnZeroMetricsWithEmptyHistory() {
        when(optimizationHistoryRepository.findTop50ByOrderByTimestampDesc()).thenReturn(Collections.emptyList());
        when(rlDecisionRepository.findTopByOrderByEpisodeDesc()).thenReturn(Optional.empty());
        when(optimizationHistoryRepository.getAverageSearchTimeSince(any())).thenReturn(null);
        when(optimizationHistoryRepository.getAverageRewardSince(any())).thenReturn(null);
        when(optimizationHistoryRepository.getAverageOccupancySince(any())).thenReturn(null);

        PerformanceResponse response = optimizationService.getPerformanceMetrics();

        assertThat(response).isNotNull();
        assertThat(response.getAverageSearchTime()).isEqualTo(0.0);
        assertThat(response.getTotalDecisions()).isEqualTo(0);
    }

    // === TEST 7: Performance Metrics with History ===
    @Test
    @DisplayName("Should calculate performance metrics from history")
    void shouldCalculatePerformanceMetricsFromHistory() {
        ParkingOptimizationHistory hist1 = new ParkingOptimizationHistory();
        hist1.setTimestamp(LocalDateTime.now());

        when(optimizationHistoryRepository.findTop50ByOrderByTimestampDesc()).thenReturn(List.of(hist1));
        when(rlDecisionRepository.findTopByOrderByEpisodeDesc()).thenReturn(Optional.empty());
        when(optimizationHistoryRepository.getAverageSearchTimeSince(any())).thenReturn(5.0);
        when(optimizationHistoryRepository.getAverageRewardSince(any())).thenReturn(0.8);
        when(optimizationHistoryRepository.getAverageOccupancySince(any())).thenReturn(65.0);

        PerformanceResponse response = optimizationService.getPerformanceMetrics();

        assertThat(response).isNotNull();
        assertThat(response.getAverageSearchTime()).isEqualTo(5.0);
        assertThat(response.getAverageReward()).isEqualTo(0.8);
        assertThat(response.getAverageOccupancy()).isEqualTo(65.0);
        assertThat(response.getTotalDecisions()).isEqualTo(1);
    }

    // === TEST 8: Smart Recommendations ===
    @Test
    @DisplayName("Should generate smart recommendations with alerts and insights")
    void shouldGenerateSmartRecommendations() {
        when(optimizationHistoryRepository.findTop50ByOrderByTimestampDesc()).thenReturn(Collections.emptyList());
        when(rlDecisionRepository.findTopByOrderByEpisodeDesc()).thenReturn(Optional.empty());
        when(optimizationHistoryRepository.getAverageSearchTimeSince(any())).thenReturn(null);
        when(optimizationHistoryRepository.getAverageRewardSince(any())).thenReturn(null);
        when(optimizationHistoryRepository.getAverageOccupancySince(any())).thenReturn(null);

        SmartRecommendationResponse response = optimizationService.getSmartRecommendations();

        assertThat(response).isNotNull();
        assertThat(response.getAlerts()).isNotNull();
        assertThat(response.getRecommendations()).isNotNull();
        assertThat(response.getSmartAssistantMessage()).isNotNull();
        assertThat(response.getUrgencyLevel()).isIn("LOW", "MEDIUM", "HIGH");
    }

    // === TEST 9: Trigger Training ===
    @Test
    @DisplayName("Should trigger training with heuristic response")
    void shouldTriggerTrainingWithHeuristicResponse() {
        TrainRequest request = new TrainRequest();
        request.setEpisodes(100);
        request.setAlgorithm("dqn");

        Map<String, Object> result = optimizationService.triggerTraining(request);

        assertThat(result).isNotNull();
        assertThat(result.get("status")).isEqualTo("heuristic_active");
        assertThat(result.get("episodes")).isEqualTo(100);
    }

    // === TEST 10: Trigger Training - Default Values ===
    @Test
    @DisplayName("Should use default values when request has nulls")
    void shouldUseDefaultValuesWhenRequestHasNulls() {
        TrainRequest request = new TrainRequest();

        Map<String, Object> result = optimizationService.triggerTraining(request);

        assertThat(result).isNotNull();
        assertThat(result.get("status")).isEqualTo("heuristic_active");
        assertThat(result.get("episodes")).isEqualTo(100);
    }

    // === TEST 11: Record Optimization History ===
    @Test
    @DisplayName("Should record optimization history to repository")
    void shouldRecordOptimizationHistory() {
        ParkingOptimizationHistory history = new ParkingOptimizationHistory();
        history.setTimestamp(LocalDateTime.now());

        optimizationService.recordOptimization(history);

        verify(optimizationHistoryRepository).save(history);
    }

    // === TEST 12: Record RL Decision ===
    @Test
    @DisplayName("Should record RL decision to repository")
    void shouldRecordRlDecision() {
        ParkingRlDecision decision = new ParkingRlDecision();

        optimizationService.recordRlDecision(decision);

        verify(rlDecisionRepository).save(decision);
    }

    // === TEST 13: Congestion Classification ===
    @Test
    @DisplayName("Should classify congestion levels correctly based on occupancy")
    void shouldClassifyCongestionLevelsCorrectly() {
        // With default 0 slots, all zones return 50% -> MODERATE
        CongestionResponse response = optimizationService.getCongestionAnalysis();

        assertThat(response.getOverallLevel()).isNotNull();
        // With 50% default, should be MODERATE
        assertThat(response.getOverallLevel()).isEqualTo("MODERATE");
    }

    // === TEST 14: Recommendation includes zone data ===
    @Test
    @DisplayName("Should include zone data in recommendation")
    void shouldIncludeZoneDataInRecommendation() {
        ZoneRecommendationResponse response = optimizationService.getRecommendation();

        assertThat(response).isNotNull();
        assertThat(response.getReasoning()).isNotNull();
    }

    // === TEST 15: Smart Recommendations - High Occupancy Alerts ===
    @Test
    @DisplayName("Should generate alerts for high occupancy zones")
    void shouldGenerateAlertsForHighOccupancy() {
        when(parkingSlotRepository.count()).thenReturn(100L);
        when(parkingSlotRepository.countOccupied()).thenReturn(95L);
        when(optimizationHistoryRepository.findTop50ByOrderByTimestampDesc()).thenReturn(Collections.emptyList());
        when(rlDecisionRepository.findTopByOrderByEpisodeDesc()).thenReturn(Optional.empty());
        when(optimizationHistoryRepository.getAverageSearchTimeSince(any())).thenReturn(null);
        when(optimizationHistoryRepository.getAverageRewardSince(any())).thenReturn(null);
        when(optimizationHistoryRepository.getAverageOccupancySince(any())).thenReturn(null);

        SmartRecommendationResponse response = optimizationService.getSmartRecommendations();

        assertThat(response).isNotNull();
        assertThat(response.getUrgencyLevel()).isIn("MEDIUM", "HIGH");
    }
}