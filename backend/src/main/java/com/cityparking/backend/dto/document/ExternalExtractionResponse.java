package com.cityparking.backend.dto.document;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * DTO representing the response from the external university ID extraction API.
 * Maps the JSON fields returned by the ParkFlow extraction service.
 */
@Data
public class ExternalExtractionResponse {

    private String name;

    @JsonProperty("id_number")
    private String idNumber;

    private String department;
}