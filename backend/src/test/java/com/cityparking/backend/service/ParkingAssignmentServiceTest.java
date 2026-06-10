package com.cityparking.backend.service;

import com.cityparking.backend.dto.parking.ParkingAssignmentResponse;
import com.cityparking.backend.entity.ParkingAssignment;
import com.cityparking.backend.entity.ParkingAssignment.AssignmentStatus;
import com.cityparking.backend.entity.ParkingSlot;
import com.cityparking.backend.entity.ParkingSlot.SlotStatus;
import com.cityparking.backend.entity.User;
import com.cityparking.backend.entity.Vehicle;
import com.cityparking.backend.exception.BadRequestException;
import com.cityparking.backend.exception.ResourceNotFoundException;
import com.cityparking.backend.repository.ParkingAssignmentRepository;
import com.cityparking.backend.repository.ParkingSlotRepository;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.repository.VehicleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ParkingAssignmentService Tests")
class ParkingAssignmentServiceTest {

    @Mock
    private ParkingAssignmentRepository parkingAssignmentRepository;

    @Mock
    private ParkingSlotRepository parkingSlotRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @InjectMocks
    private ParkingAssignmentService assignmentService;

    private User testUser;
    private Vehicle testVehicle;
    private ParkingSlot freeSlot;
    private ParkingAssignment activeAssignment;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");

        testVehicle = new Vehicle();
        testVehicle.setId(1L);
        testVehicle.setLicensePlate("ABC-123");
        testVehicle.setMake("Toyota");
        testVehicle.setModel("Camry");
        testVehicle.setYear(2024);
        testVehicle.setIsDefault(true);
        testVehicle.setUser(testUser);

        freeSlot = new ParkingSlot();
        freeSlot.setId(1L);
        freeSlot.setSlotCode("A-01");
        freeSlot.setStatus(ParkingSlot.SlotStatus.FREE);
        freeSlot.setFloorNumber(1);
        freeSlot.setZone("A");
        freeSlot.setSlotType(ParkingSlot.SlotType.COMPACT);
        freeSlot.setCreatedAt(LocalDateTime.now());
        freeSlot.setUpdatedAt(LocalDateTime.now());

        activeAssignment = new ParkingAssignment();
        activeAssignment.setId(1L);
        activeAssignment.setUserId(1L);
        activeAssignment.setVehicleId(1L);
        activeAssignment.setSlot(freeSlot);
        activeAssignment.setStatus(AssignmentStatus.ACTIVE);
        activeAssignment.setAssignedAt(LocalDateTime.now());
    }

    @Nested
    @DisplayName("Assign Slot")
    class AssignSlot {

        @Test
        @DisplayName("Should assign nearest free slot to user")
        void shouldAssignNearestFreeSlot() {
            when(parkingAssignmentRepository.findByVehicleIdAndStatus(1L, AssignmentStatus.ACTIVE))
                    .thenReturn(Optional.empty());
            when(parkingSlotRepository.findByStatus(SlotStatus.FREE))
                    .thenReturn(List.of(freeSlot));
            when(parkingSlotRepository.save(any(ParkingSlot.class))).thenReturn(freeSlot);
            when(parkingAssignmentRepository.save(any(ParkingAssignment.class))).thenAnswer(i -> {
                ParkingAssignment a = i.getArgument(0);
                a.setId(1L);
                return a;
            });

            ParkingAssignmentResponse response = assignmentService.assignSlot(1L, 1L, null, null);

            assertNotNull(response);
            assertEquals("A-01", response.getSlotCode());
            assertEquals("A", response.getZone());
            assertEquals(1, response.getFloor());
            assertEquals("ACTIVE", response.getStatus());
        }

        @Test
        @DisplayName("Should throw when no free slots available")
        void shouldThrowWhenNoFreeSlots() {
            when(parkingAssignmentRepository.findByVehicleIdAndStatus(1L, AssignmentStatus.ACTIVE))
                    .thenReturn(Optional.empty());
            when(parkingSlotRepository.findByStatus(SlotStatus.FREE))
                    .thenReturn(java.util.Collections.emptyList());

            assertThrows(BadRequestException.class,
                    () -> assignmentService.assignSlot(1L, 1L, null, null));
        }

        @Test
        @DisplayName("Should throw when vehicle already has active assignment")
        void shouldThrowWhenDuplicateAssignment() {
            when(parkingAssignmentRepository.findByVehicleIdAndStatus(1L, AssignmentStatus.ACTIVE))
                    .thenReturn(Optional.of(activeAssignment));

            assertThrows(BadRequestException.class,
                    () -> assignmentService.assignSlot(1L, 1L, null, null));
        }
    }

    @Nested
    @DisplayName("Release Slot")
    class ReleaseSlot {

        @Test
        @DisplayName("Should release active assignment")
        void shouldReleaseActiveAssignment() {
            when(parkingAssignmentRepository.findById(1L))
                    .thenReturn(Optional.of(activeAssignment));
            when(parkingSlotRepository.save(any(ParkingSlot.class))).thenReturn(freeSlot);
            when(parkingAssignmentRepository.save(any(ParkingAssignment.class))).thenReturn(activeAssignment);

            assignmentService.releaseSlot(1L);

            assertEquals(AssignmentStatus.RELEASED, activeAssignment.getStatus());
            assertNotNull(activeAssignment.getReleasedAt());
            assertEquals(SlotStatus.FREE, freeSlot.getStatus());
        }

        @Test
        @DisplayName("Should throw when no active assignment found")
        void shouldThrowWhenNoActiveAssignment() {
            when(parkingAssignmentRepository.findById(999L))
                    .thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> assignmentService.releaseSlot(999L));
        }
    }

    @Nested
    @DisplayName("Get Active Assignments")
    class GetActiveAssignments {

        @Test
        @DisplayName("Should return all active assignments")
        void shouldReturnActiveAssignments() {
            when(parkingAssignmentRepository.findByStatus(AssignmentStatus.ACTIVE))
                    .thenReturn(List.of(activeAssignment));

            List<ParkingAssignmentResponse> result = assignmentService.getActiveAssignments();

            assertEquals(1, result.size());
            assertEquals("A-01", result.get(0).getSlotCode());
        }
    }
}