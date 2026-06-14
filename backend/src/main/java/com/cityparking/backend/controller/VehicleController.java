package com.cityparking.backend.controller;

import com.cityparking.backend.dto.common.ApiResponse;
import com.cityparking.backend.dto.vehicle.VehicleRequest;
import com.cityparking.backend.dto.vehicle.VehicleResponse;
import com.cityparking.backend.service.VehicleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
@Tag(name = "Vehicles", description = "Vehicle management endpoints")
public class VehicleController {

    private final VehicleService vehicleService;

    @GetMapping
    @Operation(summary = "Get all vehicles", description = "Get all vehicles for the authenticated user")
    public ResponseEntity<ApiResponse<List<VehicleResponse>>> getVehicles(Authentication authentication) {
        List<VehicleResponse> vehicles = vehicleService.getUserVehicles(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(vehicles));
    }

    @PostMapping
    @Operation(summary = "Create vehicle", description = "Add a new vehicle for the authenticated user")
    public ResponseEntity<ApiResponse<VehicleResponse>> createVehicle(
            Authentication authentication,
            @Valid @RequestBody VehicleRequest request) {
        log.info("Vehicle create request: {}", request);
        VehicleResponse vehicle = vehicleService.createVehicle(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Vehicle created", vehicle));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update vehicle", description = "Update an existing vehicle by ID")
    public ResponseEntity<ApiResponse<VehicleResponse>> updateVehicle(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody VehicleRequest request) {
        VehicleResponse vehicle = vehicleService.updateVehicle(authentication.getName(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Vehicle updated", vehicle));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete vehicle", description = "Delete a vehicle by ID")
    public ResponseEntity<ApiResponse<Void>> deleteVehicle(
            Authentication authentication,
            @PathVariable Long id) {
        vehicleService.deleteVehicle(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.success("Vehicle deleted", null));
    }
}