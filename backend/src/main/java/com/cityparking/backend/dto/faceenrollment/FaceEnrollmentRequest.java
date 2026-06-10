package com.cityparking.backend.dto.faceenrollment;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FaceEnrollmentRequest {

    @Size(max = 500, message = "Video URL must not exceed 500 characters")
    private String videoUrl;

    @Size(max = 1000, message = "Notes must not exceed 1000 characters")
    private String notes;
}