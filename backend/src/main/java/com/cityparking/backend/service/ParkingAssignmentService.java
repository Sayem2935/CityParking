package com.cityparking.backend.service;

import com.cityparking.backend.dto.parking.ParkingAssignmentResponse;
import com.cityparking.backend.entity.ParkingAssignment;
import com.cityparking.backend.entity.ParkingAssignment.AssignmentStatus;
import com.cityparking.backend.entity.ParkingSlot;
import com.cityparking.backend.entity.ParkingSlot.SlotStatus;
import com.cityparking.backend.exception.BadRequestException;
import com.cityparking.backend.exception.ResourceNotFoundException;
import com.cityparking.backend.repository.ParkingAssignmentRepository;
import com.cityparking.backend.repository.ParkingSlotRepository;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ParkingAssignmentService {

    private final ParkingAssignmentRepository parkingAssignmentRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;

    /**
     * Assign the nearest available parking slot to a user/vehicle.
     * Algorithm:
     * 1. Find the nearest free slot (by floor priority, then zone alphabetically, then slot code)
     * 2. Respect preferred floor/zone if provided
     * 3. Reserve the slot
     * 4. Create an assignment record
     */
    @Transactional
    public ParkingAssignmentResponse assignSlot(Long userId, Long vehicleId, Integer preferredFloor, String preferredZone) {
        // Prevent duplicate active assignment for the same vehicle
        Optional<ParkingAssignment> existingAssignment = parkingAssignmentRepository
                .findByVehicleIdAndStatus(vehicleId, AssignmentStatus.ACTIVE);
        if (existingAssignment.isPresent()) {
            throw new BadRequestException("Vehicle already has an active parking assignment (slot: "
                    + existingAssignment.get().getSlot().getSlotCode() + ")");
        }

        // Find the nearest free slot
        ParkingSlot slot = findNearestFreeSlot(preferredFloor, preferredZone)
                .orElseThrow(() -> new BadRequestException("No free parking slots available"));

        // Reserve the slot
        slot.setStatus(SlotStatus.RESERVED);
        slot.setUpdatedAt(LocalDateTime.now());
        parkingSlotRepository.save(slot);

        // Calculate distance from entrance (simple heuristic: floor * 50 + zone offset)
        int distance = calculateDistance(slot);

        // Create assignment
        ParkingAssignment assignment = ParkingAssignment.builder()
                .userId(userId)
                .vehicleId(vehicleId)
                .slot(slot)
                .assignedAt(LocalDateTime.now())
                .status(AssignmentStatus.ACTIVE)
                .build();
        parkingAssignmentRepository.save(assignment);

        log.info("Assigned slot {} to user {} vehicle {} (distance: {}m)",
                slot.getSlotCode(), userId, vehicleId, distance);

        return ParkingAssignmentResponse.builder()
                .id(assignment.getId())
                .userId(userId)
                .vehicleId(vehicleId)
                .slotCode(slot.getSlotCode())
                .zone(slot.getZone())
                .floor(slot.getFloorNumber())
                .distance(distance)
                .status(AssignmentStatus.ACTIVE.name())
                .assignedAt(assignment.getAssignedAt())
                .build();
    }

    /**
     * Release a parking slot when vehicle exits.
     */
    @Transactional
    public ParkingAssignmentResponse releaseSlot(Long assignmentId) {
        ParkingAssignment assignment = parkingAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Parking assignment not found: " + assignmentId));

        if (assignment.getStatus() != AssignmentStatus.ACTIVE) {
            throw new BadRequestException("Assignment is not active (current status: " + assignment.getStatus() + ")");
        }

        // Release slot
        ParkingSlot slot = assignment.getSlot();
        slot.setStatus(SlotStatus.FREE);
        slot.setUpdatedAt(LocalDateTime.now());
        parkingSlotRepository.save(slot);

        // Update assignment
        assignment.setStatus(AssignmentStatus.RELEASED);
        assignment.setReleasedAt(LocalDateTime.now());
        parkingAssignmentRepository.save(assignment);

        log.info("Released slot {} (assignment {})", slot.getSlotCode(), assignmentId);

        return ParkingAssignmentResponse.builder()
                .id(assignment.getId())
                .userId(assignment.getUserId())
                .vehicleId(assignment.getVehicleId())
                .slotCode(slot.getSlotCode())
                .zone(slot.getZone())
                .floor(slot.getFloorNumber())
                .distance(calculateDistance(slot))
                .status(AssignmentStatus.RELEASED.name())
                .assignedAt(assignment.getAssignedAt())
                .releasedAt(assignment.getReleasedAt())
                .build();
    }

    /**
     * Release slot by vehicle ID.
     */
    @Transactional
    public ParkingAssignmentResponse releaseSlotByVehicle(Long vehicleId) {
        ParkingAssignment assignment = parkingAssignmentRepository
                .findByVehicleIdAndStatus(vehicleId, AssignmentStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("No active parking assignment found for vehicle: " + vehicleId));
        return releaseSlot(assignment.getId());
    }

    /**
     * Get all active assignments.
     */
    public List<ParkingAssignmentResponse> getActiveAssignments() {
        return parkingAssignmentRepository.findByStatus(AssignmentStatus.ACTIVE).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get assignment for a specific user.
     */
    public Optional<ParkingAssignmentResponse> getActiveAssignmentForUser(Long userId) {
        return parkingAssignmentRepository.findByUserIdAndStatus(userId, AssignmentStatus.ACTIVE)
                .stream().findFirst().map(this::mapToResponse);
    }

    /**
     * Get assignment for a specific vehicle.
     */
    public Optional<ParkingAssignmentResponse> getActiveAssignmentForVehicle(Long vehicleId) {
        return parkingAssignmentRepository.findByVehicleIdAndStatus(vehicleId, AssignmentStatus.ACTIVE)
                .map(this::mapToResponse);
    }

    /**
     * Find the nearest free slot with optional floor/zone preference.
     * Priority: preferred floor/zone first, then fall back to any free slot.
     */
    private Optional<ParkingSlot> findNearestFreeSlot(Integer preferredFloor, String preferredZone) {
        List<ParkingSlot> freeSlots = parkingSlotRepository.findByStatus(SlotStatus.FREE);
        if (freeSlots.isEmpty()) {
            return Optional.empty();
        }

        // Try preferred floor and zone first
        if (preferredFloor != null && preferredZone != null) {
            Optional<ParkingSlot> exactMatch = freeSlots.stream()
                    .filter(s -> s.getFloorNumber().equals(preferredFloor) && s.getZone().equalsIgnoreCase(preferredZone))
                    .sorted((a, b) -> a.getSlotCode().compareTo(b.getSlotCode()))
                    .findFirst();
            if (exactMatch.isPresent()) return exactMatch;
        }

        // Try preferred floor only
        if (preferredFloor != null) {
            Optional<ParkingSlot> floorMatch = freeSlots.stream()
                    .filter(s -> s.getFloorNumber().equals(preferredFloor))
                    .sorted((a, b) -> {
                        int zoneCompare = a.getZone().compareTo(b.getZone());
                        return zoneCompare != 0 ? zoneCompare : a.getSlotCode().compareTo(b.getSlotCode());
                    })
                    .findFirst();
            if (floorMatch.isPresent()) return floorMatch;
        }

        // Try preferred zone only
        if (preferredZone != null) {
            Optional<ParkingSlot> zoneMatch = freeSlots.stream()
                    .filter(s -> s.getZone().equalsIgnoreCase(preferredZone))
                    .sorted((a, b) -> {
                        int floorCompare = Integer.compare(a.getFloorNumber(), b.getFloorNumber());
                        return floorCompare != 0 ? floorCompare : a.getSlotCode().compareTo(b.getSlotCode());
                    })
                    .findFirst();
            if (zoneMatch.isPresent()) return zoneMatch;
        }

        // Default: nearest = lowest floor, then alphabetical zone, then slot code
        return freeSlots.stream()
                .sorted((a, b) -> {
                    int floorCompare = Integer.compare(a.getFloorNumber(), b.getFloorNumber());
                    if (floorCompare != 0) return floorCompare;
                    int zoneCompare = a.getZone().compareTo(b.getZone());
                    return zoneCompare != 0 ? zoneCompare : a.getSlotCode().compareTo(b.getSlotCode());
                })
                .findFirst();
    }

    /**
     * Calculate distance from entrance. Simple heuristic:
     * Ground floor slots are closest. Each additional floor adds ~50m.
     * Zone offset adds ~10m per zone letter.
     */
    private int calculateDistance(ParkingSlot slot) {
        int floorDistance = (slot.getFloorNumber() - 1) * 50;
        int zoneDistance = (slot.getZone().toUpperCase().charAt(0) - 'A') * 10;
        // Extract numeric part of slot code for additional offset
        int slotOffset = 0;
        try {
            String numericPart = slot.getSlotCode().replaceAll("[^0-9]", "");
            if (!numericPart.isEmpty()) {
                slotOffset = Integer.parseInt(numericPart) % 20;
            }
        } catch (NumberFormatException e) {
            // ignore
        }
        return floorDistance + zoneDistance + slotOffset;
    }

    private ParkingAssignmentResponse mapToResponse(ParkingAssignment assignment) {
        ParkingSlot slot = assignment.getSlot();
        return ParkingAssignmentResponse.builder()
                .id(assignment.getId())
                .userId(assignment.getUserId())
                .vehicleId(assignment.getVehicleId())
                .slotCode(slot.getSlotCode())
                .zone(slot.getZone())
                .floor(slot.getFloorNumber())
                .distance(calculateDistance(slot))
                .status(assignment.getStatus().name())
                .assignedAt(assignment.getAssignedAt())
                .releasedAt(assignment.getReleasedAt())
                .build();
    }
}