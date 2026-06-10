package com.cityparking.backend.repository;

import com.cityparking.backend.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    List<Vehicle> findByUserId(Long userId);

    Optional<Vehicle> findByIdAndUserId(Long id, Long userId);

    boolean existsByLicensePlateAndUserId(String licensePlate, Long userId);

    boolean existsByLicensePlateAndUserIdAndIdNot(String licensePlate, Long userId, Long id);
}