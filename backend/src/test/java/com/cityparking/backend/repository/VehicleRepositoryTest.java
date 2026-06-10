package com.cityparking.backend.repository;

import com.cityparking.backend.entity.User;
import com.cityparking.backend.entity.Vehicle;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("VehicleRepository Tests")
class VehicleRepositoryTest {

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private UserRepository userRepository;

    private User savedUser;
    private Vehicle savedVehicle;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setFirstName("John");
        user.setLastName("Doe");
        user.setEmail("john@example.com");
        user.setPassword("encoded_password");
        user.setPhone("+1234567890");
        user.setRole(User.Role.USER);
        savedUser = userRepository.save(user);

        Vehicle vehicle = new Vehicle();
        vehicle.setLicensePlate("ABC123");
        vehicle.setMake("Toyota");
        vehicle.setModel("Camry");
        vehicle.setColor("Blue");
        vehicle.setYear(2023);
        vehicle.setUser(savedUser);
        savedVehicle = vehicleRepository.save(vehicle);
    }

    @Test
    @DisplayName("Should find vehicles by user ID")
    void findByUserId_Success() {
        List<Vehicle> vehicles = vehicleRepository.findByUserId(savedUser.getId());

        assertThat(vehicles).hasSize(1);
        assertThat(vehicles.get(0).getLicensePlate()).isEqualTo("ABC123");
    }

    @Test
    @DisplayName("Should find vehicle by ID and user ID")
    void findByIdAndUserId_Success() {
        Optional<Vehicle> found = vehicleRepository.findByIdAndUserId(savedVehicle.getId(), savedUser.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getMake()).isEqualTo("Toyota");
    }

    @Test
    @DisplayName("Should check duplicate license plate per user")
    void existsByLicensePlateAndUserId_True() {
        boolean exists = vehicleRepository.existsByLicensePlateAndUserId("ABC123", savedUser.getId());

        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("Should return false for non-duplicate plate")
    void existsByLicensePlateAndUserId_False() {
        boolean exists = vehicleRepository.existsByLicensePlateAndUserId("XYZ789", savedUser.getId());

        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Should return empty for wrong user")
    void findByIdAndUserId_WrongUser() {
        Optional<Vehicle> found = vehicleRepository.findByIdAndUserId(savedVehicle.getId(), 999L);

        assertThat(found).isEmpty();
    }
}