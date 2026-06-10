package com.cityparking.backend.service;

import com.cityparking.backend.dto.parking.AvailabilityResponse;
import com.cityparking.backend.dto.parking.ParkingSlotResponse;
import com.cityparking.backend.dto.parking.ParkingStatisticsResponse;
import com.cityparking.backend.dto.parking.ScanResultResponse;
import com.cityparking.backend.entity.ParkingSlot;
import com.cityparking.backend.entity.ParkingScanLog;
import com.cityparking.backend.entity.ParkingSlot.SlotStatus;
import com.cityparking.backend.exception.ResourceNotFoundException;
import com.cityparking.backend.repository.ParkingSlotRepository;
import com.cityparking.backend.repository.ParkingAssignmentRepository;
import com.cityparking.backend.repository.ParkingScanLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ParkingSlotService {

    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingAssignmentRepository parkingAssignmentRepository;
    private final ParkingScanLogRepository parkingScanLogRepository;

    public List<ParkingSlotResponse> getAllSlots() {
        return parkingSlotRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<ParkingSlotResponse> getSlotsByZone(String zone) {
        return parkingSlotRepository.findByZone(zone).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<ParkingSlotResponse> getSlotsByStatus(SlotStatus status) {
        return parkingSlotRepository.findByStatus(status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public AvailabilityResponse getAvailability() {
        long total = parkingSlotRepository.count();
        long free = parkingSlotRepository.countByStatus(SlotStatus.FREE);
        long occupied = parkingSlotRepository.countByStatus(SlotStatus.OCCUPIED);
        long reserved = parkingSlotRepository.countByStatus(SlotStatus.RESERVED);
        long maintenance = parkingSlotRepository.countByStatus(SlotStatus.MAINTENANCE);

        double utilization = total > 0 ? ((double)(occupied + reserved) / total) * 100.0 : 0.0;

        // Zone breakdown using countSlotsByZoneAndStatus
        List<Object[]> zoneStatusCounts = parkingSlotRepository.countSlotsByZoneAndStatus();
        Map<String, long[]> zoneAgg = new LinkedHashMap<>();
        for (Object[] row : zoneStatusCounts) {
            String zone = (String) row[0];
            String status = row[1].toString();
            Long cnt = (Long) row[2];
            zoneAgg.computeIfAbsent(zone, k -> new long[]{0, 0}); // [total, occupied]
            long[] agg = zoneAgg.get(zone);
            agg[0] += cnt;
            if ("OCCUPIED".equals(status) || "RESERVED".equals(status)) {
                agg[1] += cnt;
            }
        }
        Map<String, AvailabilityResponse.ZoneAvailability> zones = new LinkedHashMap<>();
        for (var entry : zoneAgg.entrySet()) {
            String zone = entry.getKey();
            long[] agg = entry.getValue();
            zones.put(zone, AvailabilityResponse.ZoneAvailability.builder()
                    .zone(zone)
                    .totalSlots(agg[0])
                    .freeSlots(agg[0] - agg[1])
                    .occupiedSlots(agg[1])
                    .build());
        }

        return AvailabilityResponse.builder()
                .totalSlots(total)
                .freeSlots(free)
                .occupiedSlots(occupied)
                .reservedSlots(reserved)
                .maintenanceSlots(maintenance)
                .utilizationPercent(Math.round(utilization * 100.0) / 100.0)
                .zones(zones)
                .build();
    }

    @Transactional
    public ScanResultResponse processAiDetection(ScanResultResponse aiResult) {
        if (aiResult.getDetections() == null || aiResult.getDetections().isEmpty()) {
            return aiResult;
        }

        int updated = 0;
        for (ScanResultResponse.SlotDetection detection : aiResult.getDetections()) {
            Optional<ParkingSlot> slotOpt = parkingSlotRepository.findBySlotCode(detection.getSlotCode());
            if (slotOpt.isPresent()) {
                ParkingSlot slot = slotOpt.get();
                SlotStatus newStatus = Boolean.TRUE.equals(detection.getOccupied()) ? SlotStatus.OCCUPIED : SlotStatus.FREE;
                if (slot.getStatus() != SlotStatus.MAINTENANCE && slot.getStatus() != SlotStatus.RESERVED) {
                    slot.setStatus(newStatus);
                    slot.setUpdatedAt(LocalDateTime.now());
                    parkingSlotRepository.save(slot);
                    updated++;
                }
            }
        }

        ParkingScanLog scanLog = ParkingScanLog.builder()
                .totalSlots(aiResult.getTotalSlots())
                .occupiedSlots(aiResult.getOccupiedSlots())
                .freeSlots(aiResult.getFreeSlots())
                .occupiedDetected(aiResult.getOccupiedSlots())
                .processingTimeMs(aiResult.getProcessingTimeMs())
                .scannedAt(LocalDateTime.now())
                .build();
        parkingScanLogRepository.save(scanLog);

        log.info("Processed AI detection: {} slots updated out of {} detections", updated, aiResult.getDetections().size());
        return aiResult;
    }

    @Transactional
    public void updateSlotStatus(Long slotId, SlotStatus status) {
        ParkingSlot slot = parkingSlotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Parking slot not found: " + slotId));
        slot.setStatus(status);
        slot.setUpdatedAt(LocalDateTime.now());
        parkingSlotRepository.save(slot);
    }

    public ParkingStatisticsResponse getStatistics() {
        long total = parkingSlotRepository.count();
        long currentOccupied = parkingSlotRepository.countByStatus(SlotStatus.OCCUPIED);
        long currentFree = parkingSlotRepository.countByStatus(SlotStatus.FREE);
        double currentUtilization = total > 0 ? ((double) currentOccupied / total) * 100.0 : 0.0;

        LocalDateTime todayStart = LocalDateTime.now().toLocalDate().atStartOfDay();
        long totalAssignmentsToday = parkingAssignmentRepository.count();

        List<ParkingScanLog> todayScans = parkingScanLogRepository.findByScannedAtAfter(todayStart);
        Map<String, Long> hourlyDistribution = new LinkedHashMap<>();
        for (int i = 0; i < 24; i++) {
            final int hour = i;
            long count = todayScans.stream()
                    .filter(s -> s.getScannedAt() != null && s.getScannedAt().getHour() == hour)
                    .mapToLong(s -> s.getOccupiedDetected() != null ? s.getOccupiedDetected() : 0)
                    .max()
                    .orElse(0);
            hourlyDistribution.put(String.format("%02d:00", i), count);
        }

        int peakHourVal = 0;
        long peakOccupancy = 0;
        for (var entry : hourlyDistribution.entrySet()) {
            if (entry.getValue() > peakOccupancy) {
                peakOccupancy = entry.getValue();
                peakHourVal = Integer.parseInt(entry.getKey().substring(0, 2));
            }
        }

        // Zone stats
        List<Object[]> zoneStatusCounts = parkingSlotRepository.countSlotsByZoneAndStatus();
        Map<String, long[]> zoneAgg = new LinkedHashMap<>();
        for (Object[] row : zoneStatusCounts) {
            String zone = (String) row[0];
            String status = row[1].toString();
            Long cnt = (Long) row[2];
            zoneAgg.computeIfAbsent(zone, k -> new long[]{0, 0});
            long[] agg = zoneAgg.get(zone);
            agg[0] += cnt;
            if ("OCCUPIED".equals(status)) {
                agg[1] += cnt;
            }
        }
        List<ParkingStatisticsResponse.ZoneStats> zoneStats = new ArrayList<>();
        for (var entry : zoneAgg.entrySet()) {
            long[] agg = entry.getValue();
            double zoneUtil = agg[0] > 0 ? ((double) agg[1] / agg[0]) * 100.0 : 0.0;
            zoneStats.add(ParkingStatisticsResponse.ZoneStats.builder()
                    .zone(entry.getKey())
                    .totalSlots(agg[0])
                    .occupiedSlots(agg[1])
                    .utilizationPercent(Math.round(zoneUtil * 100.0) / 100.0)
                    .build());
        }

        double avgOccupancy = todayScans.isEmpty() ? 0.0 :
                todayScans.stream()
                        .mapToLong(s -> s.getOccupiedDetected() != null ? s.getOccupiedDetected() : 0)
                        .average()
                        .orElse(0.0);

        return ParkingStatisticsResponse.builder()
                .totalSlots(total)
                .currentOccupied(currentOccupied)
                .currentFree(currentFree)
                .currentUtilization(Math.round(currentUtilization * 100.0) / 100.0)
                .totalAssignmentsToday(totalAssignmentsToday)
                .averageOccupancyToday(Math.round(avgOccupancy * 100.0) / 100.0)
                .peakOccupancyToday((int) peakOccupancy)
                .peakHour(String.format("%02d:00", peakHourVal))
                .hourlyDistribution(hourlyDistribution)
                .zoneStats(zoneStats)
                .build();
    }

    public List<ParkingSlotResponse> getSlotsByFloor(Integer floorNumber) {
        return parkingSlotRepository.findByFloorNumber(floorNumber).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private ParkingSlotResponse mapToResponse(ParkingSlot slot) {
        return ParkingSlotResponse.builder()
                .id(slot.getId())
                .slotCode(slot.getSlotCode())
                .slotType(slot.getSlotType() != null ? slot.getSlotType().name() : null)
                .status(slot.getStatus().name())
                .floorNumber(slot.getFloorNumber())
                .zone(slot.getZone())
                .coordinatesJson(slot.getCoordinatesJson())
                .createdAt(slot.getCreatedAt())
                .updatedAt(slot.getUpdatedAt())
                .build();
    }
}