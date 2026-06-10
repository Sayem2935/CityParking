package com.cityparking.backend.service;

import com.cityparking.backend.dto.prediction.*;
import com.cityparking.backend.entity.ParkingOccupancyHistory;
import com.cityparking.backend.entity.ParkingPrediction;
import com.cityparking.backend.entity.ParkingSlot;
import com.cityparking.backend.repository.ParkingOccupancyHistoryRepository;
import com.cityparking.backend.repository.ParkingPredictionRepository;
import com.cityparking.backend.repository.ParkingSlotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ParkingPredictionServiceTest {

    @Mock
    private ParkingOccupancyHistoryRepository occupancyHistoryRepository;

    @Mock
    private ParkingPredictionRepository predictionRepository;

    @Mock
    private ParkingSlotRepository parkingSlotRepository;

    @InjectMocks
    private ParkingPredictionService predictionService;

    private List<ParkingOccupancyHistory> sampleHistory;
    private List<ParkingSlot> sampleSlots;

    @BeforeEach
    void setUp() {
        sampleHistory = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (int i = 0; i < 200; i++) {
            ParkingOccupancyHistory h = ParkingOccupancyHistory.builder()
                    .id((long) i)
                    .timestamp(now.minusMinutes(i * 5L))
                    .totalSlots(100)
                    .occupiedSlots(50 + (i % 40))
                    .freeSlots(50 - (i % 40))
                    .occupancyPercentage((double) (50 + (i % 40)))
                    .zone(null)
                    .floor(null)
                    .build();
            sampleHistory.add(h);
        }

        sampleSlots = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            ParkingSlot s = new ParkingSlot();
            s.setId((long) i);
            s.setSlotCode("A-" + (i + 1));
            s.setZone("A");
            s.setFloorNumber(1);
            s.setStatus(i < 60 ? ParkingSlot.SlotStatus.OCCUPIED : ParkingSlot.SlotStatus.FREE);
            sampleSlots.add(s);
        }
    }

    @SafeVarargs
    private static List<Object[]> objectList(Object[]... items) {
        return new ArrayList<>(Arrays.asList(items));
    }

    @Test
    void generatePredictions_WithSufficientHistory_ReturnsPredictions() {
        ParkingOccupancyHistory current = sampleHistory.get(0);
        when(occupancyHistoryRepository.findFirstByZoneIsNullOrderByTimestampDesc())
                .thenReturn(Optional.of(current));
        when(occupancyHistoryRepository.findByTimestampBetweenOrderByTimestampAsc(any(), any()))
                .thenReturn(sampleHistory);
        when(predictionRepository.save(any(ParkingPrediction.class))).thenAnswer(inv -> inv.getArgument(0));

        PredictionResponse response = predictionService.generatePredictions();

        assertNotNull(response);
        assertNotNull(response.getCurrentOccupancy());
        assertNotNull(response.getTrend());
        assertNotNull(response.getRecommendations());
        assertEquals(4, response.getPredictions().size());

        assertEquals(15, response.getPredictions().get(0).getMinutesAhead());
        assertEquals(30, response.getPredictions().get(1).getMinutesAhead());
        assertEquals(60, response.getPredictions().get(2).getMinutesAhead());
        assertEquals(120, response.getPredictions().get(3).getMinutesAhead());

        response.getPredictions().forEach(p -> {
            assertTrue(p.getConfidence() > 0 && p.getConfidence() <= 1.0,
                    "Confidence should be between 0 and 1");
        });

        verify(predictionRepository, times(4)).save(any(ParkingPrediction.class));
    }

    @Test
    void generatePredictions_WithInsufficientHistory_UsesSimulationFallback() {
        when(occupancyHistoryRepository.findFirstByZoneIsNullOrderByTimestampDesc())
                .thenReturn(Optional.empty());
        when(occupancyHistoryRepository.findByTimestampBetweenOrderByTimestampAsc(any(), any()))
                .thenReturn(Collections.emptyList());
        when(parkingSlotRepository.findAll()).thenReturn(sampleSlots);
        when(predictionRepository.save(any(ParkingPrediction.class))).thenAnswer(inv -> inv.getArgument(0));

        PredictionResponse response = predictionService.generatePredictions();

        assertNotNull(response);
        assertEquals(4, response.getPredictions().size());
        response.getPredictions().forEach(p -> {
            assertTrue(p.getConfidence() > 0);
            assertTrue(p.getPredictedOccupancy() >= 0);
        });
    }

    @Test
    void generatePredictions_NullZone_UsesGlobalData() {
        ParkingOccupancyHistory current = sampleHistory.get(0);
        when(occupancyHistoryRepository.findFirstByZoneIsNullOrderByTimestampDesc())
                .thenReturn(Optional.of(current));
        when(occupancyHistoryRepository.findByTimestampBetweenOrderByTimestampAsc(any(), any()))
                .thenReturn(sampleHistory);
        when(predictionRepository.save(any(ParkingPrediction.class))).thenAnswer(inv -> inv.getArgument(0));

        PredictionResponse response = predictionService.generatePredictions(null);

        assertNotNull(response);
        assertNotNull(response.getCurrentOccupancy());
    }

    @Test
    void generatePredictions_WithZone_UsesZoneData() {
        ParkingOccupancyHistory current = sampleHistory.get(0);
        current.setZone("A");
        when(occupancyHistoryRepository.findFirstByZoneOrderByTimestampDesc("A"))
                .thenReturn(Optional.of(current));
        when(occupancyHistoryRepository.findByZoneAndTimestampBetweenOrderByTimestampAsc(eq("A"), any(), any()))
                .thenReturn(sampleHistory);
        when(occupancyHistoryRepository.findHistoricalAveragesByZone(any()))
                .thenReturn(Collections.emptyList());
        when(predictionRepository.save(any(ParkingPrediction.class))).thenAnswer(inv -> inv.getArgument(0));

        PredictionResponse response = predictionService.generatePredictions("A");

        assertNotNull(response);
        assertNotNull(response.getCurrentOccupancy());
        assertEquals(4, response.getPredictions().size());
    }

    @Test
    void calculateConfidence_WithMoreDataPoints_ReturnsHigherConfidence() {
        ParkingOccupancyHistory current = sampleHistory.get(0);
        when(occupancyHistoryRepository.findFirstByZoneIsNullOrderByTimestampDesc())
                .thenReturn(Optional.of(current));
        when(occupancyHistoryRepository.findByTimestampBetweenOrderByTimestampAsc(any(), any()))
                .thenReturn(sampleHistory);
        when(predictionRepository.save(any(ParkingPrediction.class))).thenAnswer(inv -> inv.getArgument(0));

        PredictionResponse response = predictionService.generatePredictions();

        double conf15 = response.getPredictions().get(0).getConfidence();
        double conf120 = response.getPredictions().get(3).getConfidence();
        assertTrue(conf15 >= conf120, "15-min confidence should be >= 120-min confidence");
    }

    @Test
    void collectOccupancySnapshot_StoresHistoryRecord() {
        when(parkingSlotRepository.findAll()).thenReturn(sampleSlots);
        when(occupancyHistoryRepository.save(any(ParkingOccupancyHistory.class))).thenAnswer(inv -> inv.getArgument(0));

        predictionService.collectOccupancySnapshot();

        verify(occupancyHistoryRepository, times(1)).save(any(ParkingOccupancyHistory.class));
    }

    @Test
    void collectOccupancySnapshot_EmptySlots_DoesNotSave() {
        when(parkingSlotRepository.findAll()).thenReturn(Collections.emptyList());

        predictionService.collectOccupancySnapshot();

        verify(occupancyHistoryRepository, never()).save(any());
    }

    @Test
    void getTrends_ReturnsValidTrends() {
        when(occupancyHistoryRepository.findByTimestampBetweenOrderByTimestampAsc(any(), any()))
                .thenReturn(sampleHistory);
        when(occupancyHistoryRepository.findHourlyUtilization(any(LocalDateTime.class)))
                .thenReturn(objectList(new Object[]{10, 55.0, 80}));
        when(occupancyHistoryRepository.findDailyUtilization(any(LocalDateTime.class)))
                .thenReturn(objectList(new Object[]{"2026-06-01", 50.0, 85, 20}));
        when(occupancyHistoryRepository.findWeeklyUtilization(any(LocalDateTime.class)))
                .thenReturn(objectList(new Object[]{2, 52.0, 78}));

        TrendResponse response = predictionService.getTrends();

        assertNotNull(response);
        assertNotNull(response.getGrowthTrend());
        assertNotNull(response.getDeclineTrend());
        assertTrue(response.getHourlyTrend().size() > 0);
    }

    @Test
    void getPeakHours_ReturnsPeakData() {
        when(occupancyHistoryRepository.findHourlyUtilization(any(LocalDateTime.class)))
                .thenReturn(objectList(
                        new Object[]{9, 75.0, 95},
                        new Object[]{12, 80.0, 98},
                        new Object[]{17, 85.0, 99}
                ));
        when(occupancyHistoryRepository.findWeeklyUtilization(any(LocalDateTime.class)))
                .thenReturn(objectList(new Object[]{1, 70.0, 95}));

        PeakHourResponse response = predictionService.getPeakHours();

        assertNotNull(response);
        assertNotNull(response.getBusiestHourLabel());
        assertNotNull(response.getBusiestDayLabel());
        assertTrue(response.getAverageUtilization() >= 0);
    }

    @Test
    void getAnalytics_ReturnsCompleteAnalytics() {
        when(occupancyHistoryRepository.findByTimestampBetweenOrderByTimestampAsc(any(), any()))
                .thenReturn(sampleHistory);

        AnalyticsResponse response = predictionService.getAnalytics();

        assertNotNull(response);
        assertTrue(response.getAverageOccupancy() >= 0);
        assertTrue(response.getPeakOccupancy() >= 0);
        assertEquals(100, response.getTotalSlots());
        assertTrue(response.getUtilizationEfficiency() >= 0);
    }

    @Test
    void getAnalytics_EmptyHistory_ReturnsZeros() {
        when(occupancyHistoryRepository.findByTimestampBetweenOrderByTimestampAsc(any(), any()))
                .thenReturn(Collections.emptyList());

        AnalyticsResponse response = predictionService.getAnalytics();

        assertNotNull(response);
        assertEquals(0.0, response.getAverageOccupancy());
        assertEquals(0.0, response.getPeakOccupancy());
        assertEquals(0, response.getTotalSlots());
    }

    @Test
    void generatePredictions_PredictedOccupancyWithinBounds() {
        ParkingOccupancyHistory current = sampleHistory.get(0);
        when(occupancyHistoryRepository.findFirstByZoneIsNullOrderByTimestampDesc())
                .thenReturn(Optional.of(current));
        when(occupancyHistoryRepository.findByTimestampBetweenOrderByTimestampAsc(any(), any()))
                .thenReturn(sampleHistory);
        when(predictionRepository.save(any(ParkingPrediction.class))).thenAnswer(inv -> inv.getArgument(0));

        PredictionResponse response = predictionService.generatePredictions();

        response.getPredictions().forEach(p -> {
            assertTrue(p.getPredictedOccupancy() >= 0 && p.getPredictedOccupancy() <= 100,
                    "Predicted occupancy should be between 0 and 100, got: " + p.getPredictedOccupancy());
        });
    }

    @Test
    void getLatestPredictions_WhenNoPredictionsExist_GeneratesNew() {
        when(predictionRepository.findLatestPredictions())
                .thenReturn(Collections.emptyList());
        ParkingOccupancyHistory current = sampleHistory.get(0);
        when(occupancyHistoryRepository.findFirstByZoneIsNullOrderByTimestampDesc())
                .thenReturn(Optional.of(current));
        when(occupancyHistoryRepository.findByTimestampBetweenOrderByTimestampAsc(any(), any()))
                .thenReturn(sampleHistory);
        when(predictionRepository.save(any(ParkingPrediction.class))).thenAnswer(inv -> inv.getArgument(0));

        PredictionResponse response = predictionService.getLatestPredictions();

        assertNotNull(response);
        assertNotNull(response.getPredictions());
    }

    @Test
    void trendCalculation_DetectsIncreasingTrend() {
        List<ParkingOccupancyHistory> increasingHistory = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (int i = 0; i < 200; i++) {
            ParkingOccupancyHistory h = ParkingOccupancyHistory.builder()
                    .id((long) i)
                    .timestamp(now.minusMinutes(i * 5L))
                    .totalSlots(100)
                    .occupiedSlots((int) ((199 - i) * 0.5))
                    .freeSlots(100 - (int) ((199 - i) * 0.5))
                    .occupancyPercentage((199 - i) * 0.5)
                    .zone(null)
                    .floor(null)
                    .build();
            increasingHistory.add(h);
        }

        ParkingOccupancyHistory current = increasingHistory.get(0);
        when(occupancyHistoryRepository.findFirstByZoneIsNullOrderByTimestampDesc())
                .thenReturn(Optional.of(current));

        List<ParkingOccupancyHistory> ascendingHistory = new ArrayList<>(increasingHistory);
        Collections.reverse(ascendingHistory);

        when(occupancyHistoryRepository.findByTimestampBetweenOrderByTimestampAsc(any(), any()))
                .thenReturn(ascendingHistory);
        when(predictionRepository.save(any(ParkingPrediction.class))).thenAnswer(inv -> inv.getArgument(0));

        PredictionResponse response = predictionService.generatePredictions();

        assertEquals("INCREASING", response.getTrend());
    }

    @Test
    void generatePredictions_EmptySlots_ReturnsEmptyPrediction() {
        when(occupancyHistoryRepository.findFirstByZoneIsNullOrderByTimestampDesc())
                .thenReturn(Optional.empty());
        when(parkingSlotRepository.findAll()).thenReturn(Collections.emptyList());

        PredictionResponse response = predictionService.generatePredictions();

        assertNotNull(response);
        assertEquals(0, response.getTotalSlots());
        assertEquals(0.0, response.getCurrentOccupancy());
    }

    @Test
    void generateRecommendations_HighOccupancy_ReturnsWarnings() {
        List<PredictionPointResponse> predictions = List.of(
                PredictionPointResponse.builder().minutesAhead(15).predictedOccupancy(92.0).confidence(0.9).build(),
                PredictionPointResponse.builder().minutesAhead(30).predictedOccupancy(95.0).confidence(0.85).build(),
                PredictionPointResponse.builder().minutesAhead(60).predictedOccupancy(98.0).confidence(0.8).build(),
                PredictionPointResponse.builder().minutesAhead(120).predictedOccupancy(99.0).confidence(0.7).build()
        );

        List<String> recommendations = predictionService.generateRecommendations(88.0, predictions, "INCREASING");

        assertNotNull(recommendations);
        assertFalse(recommendations.isEmpty());
        assertTrue(recommendations.stream().anyMatch(r -> r.contains("90%") || r.contains("capacity") || r.contains("WARNING")));
    }
}