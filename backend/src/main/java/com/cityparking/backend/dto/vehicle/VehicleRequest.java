package com.cityparking.backend.dto.vehicle;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleRequest {

    @NotBlank(message = "License plate is required")
    @Size(min = 2, max = 50, message = "License plate must be between 2 and 50 characters")
    @Pattern(
        regexp = "^[\\u0980-\\u09FF\\w\\s\\-]+$",
        message = "License plate may contain Bangla letters, English letters, numbers, spaces, and hyphens only"
    )
    private String licensePlate;

    @NotBlank(message = "Make is required")
    @Size(max = 100, message = "Make must not exceed 100 characters")
    private String make;

    @NotBlank(message = "Model is required")
    @Size(max = 100, message = "Model must not exceed 100 characters")
    private String model;

    @NotNull(message = "Year is required")
    @Min(value = 1900, message = "Year must be 1900 or later")
    @Max(value = 2100, message = "Year must be 2100 or earlier")
    private Integer year;

    @Size(max = 50, message = "Color must not exceed 50 characters")
    private String color;

    @Size(max = 50, message = "Vehicle type must not exceed 50 characters")
    private String vehicleType;

    @Builder.Default
    private Boolean isDefault = false;
}