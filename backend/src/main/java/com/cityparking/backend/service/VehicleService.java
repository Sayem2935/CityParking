package com.cityparking.backend.service;

import com.cityparking.backend.dto.vehicle.VehicleRequest;
import com.cityparking.backend.dto.vehicle.VehicleResponse;
import com.cityparking.backend.entity.User;
import com.cityparking.backend.entity.Vehicle;
import com.cityparking.backend.exception.BadRequestException;
import com.cityparking.backend.exception.DuplicateResourceException;
import com.cityparking.backend.exception.ResourceNotFoundException;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<VehicleResponse> getUserVehicles(String email) {
        User user = getUserByEmail(email);
        return vehicleRepository.findByUserId(user.getId()).stream()
                .map(VehicleResponse::fromEntity)
                .toList();
    }

    @Transactional
    public VehicleResponse createVehicle(String email, VehicleRequest request) {
        User user = getUserByEmail(email);

        if (vehicleRepository.existsByLicensePlateAndUserId(
                request.getLicensePlate().toUpperCase().trim(), user.getId())) {
            throw new DuplicateResourceException(
                    "Vehicle with license plate '" + request.getLicensePlate() + "' already exists");
        }

        // If setting as default, unset other defaults
        if (Boolean.TRUE.equals(request.getIsDefault())) {
            unsetDefaultVehicles(user.getId());
        }

        // If this is the first vehicle, make it default
        List<Vehicle> existingVehicles = vehicleRepository.findByUserId(user.getId());
        boolean isFirstVehicle = existingVehicles.isEmpty();

        Vehicle vehicle = Vehicle.builder()
                .licensePlate(request.getLicensePlate().toUpperCase().trim())
                .make(request.getMake().trim())
                .model(request.getModel().trim())
                .year(request.getYear())
                .color(request.getColor())
                .vehicleType(request.getVehicleType())
                .isDefault(isFirstVehicle || Boolean.TRUE.equals(request.getIsDefault()))
                .user(user)
                .build();

        vehicleRepository.save(vehicle);
        return VehicleResponse.fromEntity(vehicle);
    }

    @Transactional
    public VehicleResponse updateVehicle(String email, Long vehicleId, VehicleRequest request) {
        User user = getUserByEmail(email);
        Vehicle vehicle = vehicleRepository.findByIdAndUserId(vehicleId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + vehicleId));

        // Check for duplicate license plate (excluding current vehicle)
        if (vehicleRepository.existsByLicensePlateAndUserIdAndIdNot(
                request.getLicensePlate().toUpperCase().trim(), user.getId(), vehicleId)) {
            throw new DuplicateResourceException(
                    "Vehicle with license plate '" + request.getLicensePlate() + "' already exists");
        }

        if (Boolean.TRUE.equals(request.getIsDefault()) && !vehicle.getIsDefault()) {
            unsetDefaultVehicles(user.getId());
        }

        vehicle.setLicensePlate(request.getLicensePlate().toUpperCase().trim());
        vehicle.setMake(request.getMake().trim());
        vehicle.setModel(request.getModel().trim());
        vehicle.setYear(request.getYear());
        vehicle.setColor(request.getColor());
        vehicle.setVehicleType(request.getVehicleType());
        vehicle.setIsDefault(request.getIsDefault());

        vehicleRepository.save(vehicle);
        return VehicleResponse.fromEntity(vehicle);
    }

    @Transactional
    public void deleteVehicle(String email, Long vehicleId) {
        User user = getUserByEmail(email);
        Vehicle vehicle = vehicleRepository.findByIdAndUserId(vehicleId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + vehicleId));

        boolean wasDefault = vehicle.getIsDefault();
        vehicleRepository.delete(vehicle);

        // If deleted vehicle was default, set another as default
        if (wasDefault) {
            List<Vehicle> remaining = vehicleRepository.findByUserId(user.getId());
            if (!remaining.isEmpty()) {
                Vehicle newDefault = remaining.get(0);
                newDefault.setIsDefault(true);
                vehicleRepository.save(newDefault);
            }
        }
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private void unsetDefaultVehicles(Long userId) {
        List<Vehicle> defaults = vehicleRepository.findByUserId(userId).stream()
                .filter(Vehicle::getIsDefault)
                .toList();
        defaults.forEach(v -> v.setIsDefault(false));
        vehicleRepository.saveAll(defaults);
    }
}