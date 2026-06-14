package com.cityparking.backend.controller;

import com.cityparking.backend.dto.common.ApiResponse;
import com.cityparking.backend.dto.parking.*;
import com.cityparking.backend.entity.ParkingSlot.SlotStatus;
import com.cityparking.backend.service.ParkingAssignmentService;
import com.cityparking.backend.service.ParkingSlotService;
import com.cityparking.backend.service.ai.GeminiService;
import com.cityparking.backend.service.ai.ParkingDetectionResult;
import com.cityparking.backend.exception.BadRequestException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/parking")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Parking Management", description = "Parking slot detection, assignment, and management APIs")
public class ParkingController {

    private final ParkingSlotService parkingSlotService;
    private final ParkingAssignmentService parkingAssignmentService;
    private final GeminiService geminiService;

    @GetMapping("/slots")
    @Operation(summary = "Get all parking slots", description = "Returns all parking slots with their current status")
    public ResponseEntity<List<ParkingSlotResponse>> getAllSlots(
            @RequestParam(required = false) String zone,
            @RequestParam(required = false) String status) {
        if (zone != null) {
            return ResponseEntity.ok(parkingSlotService.getSlotsByZone(zone));
        }
        if (status != null) {
            return ResponseEntity.ok(parkingSlotService.getSlotsByStatus(SlotStatus.valueOf(status)));
        }
        return ResponseEntity.ok(parkingSlotService.getAllSlots());
    }

    @GetMapping("/availability")
    @Operation(summary = "Get parking availability", description = "Returns current parking availability with zone breakdown")
    public ResponseEntity<AvailabilityResponse> getAvailability() {
        return ResponseEntity.ok(parkingSlotService.getAvailability());
    }

    @PostMapping("/scan")
    @Operation(summary = "Scan parking lot", description = "Detect parking occupancy from an overhead camera image using Gemini Vision API")
    public ResponseEntity<ScanResultResponse> scanParkingLot(@RequestParam("image") MultipartFile image) {
        long startTime = System.currentTimeMillis();

        // Call Gemini Vision API for parking detection
        ParkingDetectionResult aiResult = geminiService.detectParkingSlots(image);

        // Convert AI result to scan response
        List<ScanResultResponse.SlotDetection> detections = aiResult.getSlots() != null
                ? aiResult.getSlots().stream()
                    .map(d -> ScanResultResponse.SlotDetection.builder()
                            .slotCode(d.getSlotId())
                            .occupied(d.isOccupied())
                            .confidence(d.getConfidence())
                            .build())
                    .collect(Collectors.toList())
                : List.of();

        ScanResultResponse scanResult = ScanResultResponse.builder()
                .totalSlots(aiResult.getTotalSlots())
                .occupiedSlots(aiResult.getOccupiedSlots())
                .freeSlots(aiResult.getFreeSlots())
                .detections(detections)
                .processingTimeMs((double) (System.currentTimeMillis() - startTime))
                .scannedAt(LocalDateTime.now())
                .build();

        // Process AI results and update slot statuses
        ScanResultResponse processedResult = parkingSlotService.processAiDetection(scanResult);

        return ResponseEntity.ok(processedResult);
    }

    @PostMapping("/assign")
    @Operation(summary = "Assign a parking slot", description = "Automatically assign the nearest available parking slot to a user/vehicle")
    public ResponseEntity<ParkingAssignmentResponse> assignSlot(@RequestBody AssignSlotRequest request) {
        ParkingAssignmentResponse assignment = parkingAssignmentService.assignSlot(
                request.getUserId(),
                request.getVehicleId(),
                request.getPreferredFloor(),
                request.getPreferredZone()
        );
        return ResponseEntity.ok(assignment);
    }

    @PostMapping("/release")
    @Operation(summary = "Release a parking slot", description = "Release a parking slot when vehicle exits")
    public ResponseEntity<ParkingAssignmentResponse> releaseSlot(@RequestBody ReleaseSlotRequest request) {
        if (request.getAssignmentId() != null) {
            return ResponseEntity.ok(parkingAssignmentService.releaseSlot(request.getAssignmentId()));
        }
        if (request.getVehicleId() != null) {
            return ResponseEntity.ok(parkingAssignmentService.releaseSlotByVehicle(request.getVehicleId()));
        }
        return ResponseEntity.badRequest().build();
    }

    @GetMapping("/statistics")
    @Operation(summary = "Get parking statistics", description = "Returns comprehensive parking statistics including utilization, trends, and peak hours")
    public ResponseEntity<ParkingStatisticsResponse> getStatistics() {
        return ResponseEntity.ok(parkingSlotService.getStatistics());
    }

    @GetMapping("/occupancy")
    @Operation(summary = "Get parking occupancy", description = "Returns current parking occupancy statistics")
    public ResponseEntity<ParkingStatisticsResponse> getOccupancy() {
        return ResponseEntity.ok(parkingSlotService.getStatistics());
    }

    @GetMapping("/assignments/active")
    @Operation(summary = "Get active assignments", description = "Returns all currently active parking assignments")
    public ResponseEntity<List<ParkingAssignmentResponse>> getActiveAssignments() {
        return ResponseEntity.ok(parkingAssignmentService.getActiveAssignments());
    }

    @GetMapping("/assignments/user/{userId}")
    @Operation(summary = "Get user's active assignment", description = "Returns the active parking assignment for a specific user")
    public ResponseEntity<ParkingAssignmentResponse> getUserAssignment(@PathVariable Long userId) {
        return parkingAssignmentService.getActiveAssignmentForUser(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/assignments/vehicle/{vehicleId}")
    @Operation(summary = "Get vehicle's active assignment", description = "Returns the active parking assignment for a specific vehicle")
    public ResponseEntity<ParkingAssignmentResponse> getVehicleAssignment(@PathVariable Long vehicleId) {
        return parkingAssignmentService.getActiveAssignmentForVehicle(vehicleId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}