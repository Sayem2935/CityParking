package com.cityparking.backend.service;

import com.cityparking.backend.dto.vehicle.VehicleRequest;
import com.cityparking.backend.dto.vehicle.VehicleResponse;
import com.cityparking.backend.entity.User;
import com.cityparking.backend.entity.Vehicle;
import com.cityparking.backend.exception.DuplicateResourceException;
import com.cityparking.backend.exception.ResourceNotFoundException;
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

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("VehicleService Tests")
class VehicleServiceTest {

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private VehicleService vehicleService;

    private User testUser;
    private Vehicle testVehicle;
    private VehicleRequest validRequest;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("test@example.com")
                .password("encodedPassword")
                .build();

        testVehicle = Vehicle.builder()
                .id(1L)
                .licensePlate("ABC123")
                .make("Toyota")
                .model("Camry")
                .year(2023)
                .color("Blue")
                .vehicleType("SEDAN")
                .isDefault(true)
                .user(testUser)
                .build();

        validRequest = new VehicleRequest();
        validRequest.setLicensePlate("ABC123");
        validRequest.setMake("Toyota");
        validRequest.setModel("Camry");
        validRequest.setYear(2023);
        validRequest.setColor("Blue");
        validRequest.setVehicleType("SEDAN");
        validRequest.setIsDefault(true);
    }

    @Nested
    @DisplayName("Get User Vehicles")
    class GetUserVehiclesTests {

        @Test
        @DisplayName("Should return list of vehicles for user")
        void shouldReturnListOfVehiclesForUser() {
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(vehicleRepository.findByUserId(1L)).thenReturn(List.of(testVehicle));

            List<VehicleResponse> result = vehicleService.getUserVehicles("test@example.com");

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getLicensePlate()).isEqualTo("ABC123");
        }

        @Test
        @DisplayName("Should return empty list when user has no vehicles")
        void shouldReturnEmptyListWhenUserHasNoVehicles() {
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(vehicleRepository.findByUserId(1L)).thenReturn(Collections.emptyList());

            List<VehicleResponse> result = vehicleService.getUserVehicles("test@example.com");

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should throw exception when user not found")
        void shouldThrowExceptionWhenUserNotFound() {
            when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> vehicleService.getUserVehicles("nonexistent@example.com"))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("User not found");
        }
    }

    @Nested
    @DisplayName("Create Vehicle")
    class CreateVehicleTests {

        @Test
        @DisplayName("Should create vehicle successfully")
        void shouldCreateVehicleSuccessfully() {
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(vehicleRepository.existsByLicensePlateAndUserId("ABC123", 1L)).thenReturn(false);
            when(vehicleRepository.findByUserId(1L)).thenReturn(Collections.emptyList());
            when(vehicleRepository.save(any(Vehicle.class))).thenReturn(testVehicle);

            VehicleResponse result = vehicleService.createVehicle("test@example.com", validRequest);

            assertThat(result).isNotNull();
            assertThat(result.getLicensePlate()).isEqualTo("ABC123");
            verify(vehicleRepository).save(any(Vehicle.class));
        }

        @Test
        @DisplayName("Should throw exception for duplicate license plate")
        void shouldThrowExceptionForDuplicateLicensePlate() {
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(vehicleRepository.existsByLicensePlateAndUserId("ABC123", 1L)).thenReturn(true);

            assertThatThrownBy(() -> vehicleService.createVehicle("test@example.com", validRequest))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessageContaining("already exists");
        }
    }

    @Nested
    @DisplayName("Update Vehicle")
    class UpdateVehicleTests {

        @Test
        @DisplayName("Should update vehicle successfully")
        void shouldUpdateVehicleSuccessfully() {
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(vehicleRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testVehicle));
            when(vehicleRepository.existsByLicensePlateAndUserIdAndIdNot("ABC123", 1L, 1L)).thenReturn(false);
            when(vehicleRepository.save(any(Vehicle.class))).thenReturn(testVehicle);

            VehicleResponse result = vehicleService.updateVehicle("test@example.com", 1L, validRequest);

            assertThat(result).isNotNull();
            assertThat(result.getLicensePlate()).isEqualTo("ABC123");
            verify(vehicleRepository).save(any(Vehicle.class));
        }

        @Test
        @DisplayName("Should throw exception when vehicle not found")
        void shouldThrowExceptionWhenVehicleNotFound() {
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(vehicleRepository.findByIdAndUserId(999L, 1L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> vehicleService.updateVehicle("test@example.com", 999L, validRequest))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Vehicle not found");
        }

        @Test
        @DisplayName("Should throw exception for duplicate license plate on update")
        void shouldThrowExceptionForDuplicateLicensePlateOnUpdate() {
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(vehicleRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testVehicle));
            when(vehicleRepository.existsByLicensePlateAndUserIdAndIdNot("ABC123", 1L, 1L)).thenReturn(true);

            assertThatThrownBy(() -> vehicleService.updateVehicle("test@example.com", 1L, validRequest))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessageContaining("already exists");
        }
    }

    @Nested
    @DisplayName("Delete Vehicle")
    class DeleteVehicleTests {

        @Test
        @DisplayName("Should delete vehicle successfully")
        void shouldDeleteVehicleSuccessfully() {
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(vehicleRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testVehicle));
            when(vehicleRepository.findByUserId(1L)).thenReturn(Collections.emptyList());

            vehicleService.deleteVehicle("test@example.com", 1L);

            verify(vehicleRepository).delete(testVehicle);
        }

        @Test
        @DisplayName("Should throw exception when deleting non-existent vehicle")
        void shouldThrowExceptionWhenDeletingNonExistentVehicle() {
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(vehicleRepository.findByIdAndUserId(999L, 1L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> vehicleService.deleteVehicle("test@example.com", 999L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Vehicle not found");
        }
    }
}