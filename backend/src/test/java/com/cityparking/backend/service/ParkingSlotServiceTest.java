package com.cityparking.backend.service;

import com.cityparking.backend.dto.parking.AvailabilityResponse;
import com.cityparking.backend.dto.parking.ParkingSlotResponse;
import com.cityparking.backend.dto.parking.ParkingStatisticsResponse;
import com.cityparking.backend.dto.parking.ScanResultResponse;
import com.cityparking.backend.entity.ParkingSlot;
import com.cityparking.backend.entity.ParkingSlot.SlotStatus;
import com.cityparking.backend.exception.ResourceNotFoundException;
import com.cityparking.backend.repository.ParkingAssignmentRepository;
import com.cityparking.backend.repository.ParkingScanLogRepository;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ParkingSlotService Tests")
class ParkingSlotServiceTest {

    @Mock
    private ParkingSlotRepository parkingSlotRepository;

    @Mock
    private ParkingAssignmentRepository parkingAssignmentRepository;

    @Mock
    private ParkingScanLogRepository parkingScanLogRepository;

    @InjectMocks
    private ParkingSlotService parkingSlotService;

    private ParkingSlot sampleSlot;
    private List<ParkingSlot> sampleSlots;

    @BeforeEach
    void setUp() {
        sampleSlot = new ParkingSlot();
        sampleSlot.setId(1L);
        sampleSlot.setSlotCode("AB4-01");
        sampleSlot.setStatus(SlotStatus.FREE);
        sampleSlot.setZone("AB4 Parking");
        sampleSlot.setCreatedAt(LocalDateTime.now());
        sampleSlot.setUpdatedAt(LocalDateTime.now());

        ParkingSlot slot2 = new ParkingSlot();
        slot2.setId(2L);
        slot2.setSlotCode("AB4-02");
        slot2.setStatus(SlotStatus.OCCUPIED);
        slot2.setZone("AB4 Parking");
        slot2.setCreatedAt(LocalDateTime.now());
        slot2.setUpdatedAt(LocalDateTime.now());

        sampleSlots = List.of(sampleSlot, slot2);
    }

    // === TEST 1: Get All Slots ===
    @Test
    @DisplayName("Should return all parking slots")
    void shouldReturnAllSlots() {
        when(parkingSlotRepository.findAll()).thenReturn(sampleSlots);

        List<ParkingSlotResponse> result = parkingSlotService.getAllSlots();

        assertThat(result).isNotNull();
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getSlotCode()).isEqualTo("AB4-01");
        verify(parkingSlotRepository).findAll();
    }

    // === TEST 2: Get Slots by Zone ===
    @Test
    @DisplayName("Should return slots filtered by zone")
    void shouldReturnSlotsByZone() {
        when(parkingSlotRepository.findByZone("AB4 Parking")).thenReturn(sampleSlots);

        List<ParkingSlotResponse> result = parkingSlotService.getSlotsByZone("AB4 Parking");

        assertThat(result).hasSize(2);
        verify(parkingSlotRepository).findByZone("AB4 Parking");
    }

    // === TEST 3: Get Slots by Status ===
    @Test
    @DisplayName("Should return slots filtered by status")
    void shouldReturnSlotsByStatus() {
        when(parkingSlotRepository.findByStatus(SlotStatus.FREE)).thenReturn(List.of(sampleSlot));

        List<ParkingSlotResponse> result = parkingSlotService.getSlotsByStatus(SlotStatus.FREE);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo("FREE");
    }

    // === TEST 4: Get Availability ===
    @Test
    @DisplayName("Should return parking availability summary")
    void shouldReturnAvailability() {
        when(parkingSlotRepository.count()).thenReturn(10L);
        when(parkingSlotRepository.countByStatus(SlotStatus.FREE)).thenReturn(6L);
        when(parkingSlotRepository.countByStatus(SlotStatus.OCCUPIED)).thenReturn(3L);
        when(parkingSlotRepository.countByStatus(SlotStatus.RESERVED)).thenReturn(1L);
        when(parkingSlotRepository.countByStatus(SlotStatus.MAINTENANCE)).thenReturn(0L);
        when(parkingSlotRepository.countSlotsByZoneAndStatus()).thenReturn(Collections.emptyList());

        AvailabilityResponse result = parkingSlotService.getAvailability();

        assertThat(result).isNotNull();
        assertThat(result.getTotalSlots()).isEqualTo(10);
        assertThat(result.getFreeSlots()).isEqualTo(6);
        assertThat(result.getOccupiedSlots()).isEqualTo(3);
    }

    // === TEST 5: Update Slot Status ===
    @Test
    @DisplayName("Should update slot status successfully")
    void shouldUpdateSlotStatus() {
        when(parkingSlotRepository.findById(1L)).thenReturn(Optional.of(sampleSlot));
        when(parkingSlotRepository.save(any(ParkingSlot.class))).thenReturn(sampleSlot);

        parkingSlotService.updateSlotStatus(1L, SlotStatus.OCCUPIED);

        verify(parkingSlotRepository).save(any(ParkingSlot.class));
    }

    // === TEST 6: Update Slot Status - Not Found ===
    @Test
    @DisplayName("Should throw exception when updating non-existent slot")
    void shouldThrowWhenUpdatingNonExistentSlot() {
        when(parkingSlotRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> parkingSlotService.updateSlotStatus(999L, SlotStatus.OCCUPIED))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // === TEST 7: Get Statistics ===
    @Test
    @DisplayName("Should return parking statistics")
    void shouldReturnStatistics() {
        when(parkingSlotRepository.count()).thenReturn(10L);
        when(parkingSlotRepository.countByStatus(SlotStatus.OCCUPIED)).thenReturn(5L);
        when(parkingSlotRepository.countByStatus(SlotStatus.FREE)).thenReturn(5L);
        when(parkingAssignmentRepository.count()).thenReturn(20L);
        when(parkingScanLogRepository.findByScannedAtAfter(any())).thenReturn(Collections.emptyList());
        when(parkingSlotRepository.countSlotsByZoneAndStatus()).thenReturn(Collections.emptyList());

        ParkingStatisticsResponse result = parkingSlotService.getStatistics();

        assertThat(result).isNotNull();
        assertThat(result.getTotalSlots()).isEqualTo(10);
        assertThat(result.getCurrentOccupied()).isEqualTo(5);
        assertThat(result.getCurrentFree()).isEqualTo(5);
    }

    // === TEST 8: Process AI Detection ===
    @Test
    @DisplayName("Should process AI detection and update slots")
    void shouldProcessAiDetection() {
        ScanResultResponse.SlotDetection detection = new ScanResultResponse.SlotDetection();
        detection.setSlotCode("AB4-01");
        detection.setOccupied(true);

        ScanResultResponse aiResult = ScanResultResponse.builder()
                .totalSlots(10)
                .occupiedSlots(5)
                .freeSlots(5)
                .processingTimeMs(100.0)
                .detections(List.of(detection))
                .build();

        when(parkingSlotRepository.findBySlotCode("AB4-01")).thenReturn(Optional.of(sampleSlot));
        when(parkingSlotRepository.save(any(ParkingSlot.class))).thenReturn(sampleSlot);
        when(parkingScanLogRepository.save(any())).thenReturn(null);

        ScanResultResponse result = parkingSlotService.processAiDetection(aiResult);

        assertThat(result).isNotNull();
        assertThat(result.getTotalSlots()).isEqualTo(10);
        verify(parkingSlotRepository).save(any(ParkingSlot.class));
    }

    // === TEST 9: Empty Slots List ===
    @Test
    @DisplayName("Should return empty list when no slots exist")
    void shouldReturnEmptyListWhenNoSlots() {
        when(parkingSlotRepository.findAll()).thenReturn(Collections.emptyList());

        List<ParkingSlotResponse> result = parkingSlotService.getAllSlots();

        assertThat(result).isEmpty();
    }

    // === TEST 11: Availability with Zone Breakdown ===
    @Test
    @DisplayName("Should include zone breakdown in availability response")
    void shouldIncludeZoneBreakdownInAvailability() {
        when(parkingSlotRepository.count()).thenReturn(10L);
        when(parkingSlotRepository.countByStatus(SlotStatus.FREE)).thenReturn(6L);
        when(parkingSlotRepository.countByStatus(SlotStatus.OCCUPIED)).thenReturn(4L);
        when(parkingSlotRepository.countByStatus(SlotStatus.RESERVED)).thenReturn(0L);
        when(parkingSlotRepository.countByStatus(SlotStatus.MAINTENANCE)).thenReturn(0L);

        List<Object[]> zoneData = new ArrayList<>();
        zoneData.add(new Object[]{"AB4 Parking", "FREE", 3L});
        zoneData.add(new Object[]{"AB4 Parking", "OCCUPIED", 2L});
        zoneData.add(new Object[]{"Engineering Parking", "FREE", 3L});
        zoneData.add(new Object[]{"Engineering Parking", "OCCUPIED", 2L});
        when(parkingSlotRepository.countSlotsByZoneAndStatus()).thenReturn(zoneData);

        AvailabilityResponse result = parkingSlotService.getAvailability();

        assertThat(result.getZones()).isNotEmpty();
    }

    // === TEST 11: Process AI Detection with Empty Detections ===
    @Test
    @DisplayName("Should return result unchanged when no detections")
    void shouldReturnUnchangedWhenNoDetections() {
        ScanResultResponse aiResult = ScanResultResponse.builder()
                .totalSlots(10)
                .occupiedSlots(0)
                .freeSlots(10)
                .detections(Collections.emptyList())
                .build();

        ScanResultResponse result = parkingSlotService.processAiDetection(aiResult);

        assertThat(result).isNotNull();
        verifyNoInteractions(parkingSlotRepository);
    }
}