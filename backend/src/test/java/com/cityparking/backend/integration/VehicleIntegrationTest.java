package com.cityparking.backend.integration;

import com.cityparking.backend.dto.auth.AuthResponse;
import com.cityparking.backend.dto.auth.RegisterRequest;
import com.cityparking.backend.dto.vehicle.VehicleRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("Vehicle Integration Tests")
class VehicleIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String authToken;

    @BeforeEach
    void setUp() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setFirstName("Vehicle");
        registerRequest.setLastName("Test User");
        registerRequest.setEmail("vehicle@test.com");
        registerRequest.setPassword("SecurePass123!");
        registerRequest.setPhone("+1234567890");
        

        String response = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andReturn().getResponse().getContentAsString();

        authToken = objectMapper.readTree(response).get("data").get("accessToken").asText();
    }

    @Test
    @DisplayName("Should add vehicle successfully")
    void addVehicle_Success() throws Exception {
        VehicleRequest request = new VehicleRequest();
        request.setLicensePlate("INT123");
        request.setMake("Honda");
        request.setModel("Civic");
        request.setColor("Red");
        request.setYear(2023);

        mockMvc.perform(post("/api/vehicles")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.licensePlate").value("INT123"))
                .andExpect(jsonPath("$.data.make").value("Honda"));
    }

    @Test
    @DisplayName("Should list vehicles")
    void listVehicles_Success() throws Exception {
        VehicleRequest request = new VehicleRequest();
        request.setLicensePlate("LIST123");
        request.setMake("Toyota");
        request.setModel("Camry");
        request.setColor("Blue");
        request.setYear(2023);

        mockMvc.perform(post("/api/vehicles")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/vehicles")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].licensePlate").value("LIST123"));
    }

    @Test
    @DisplayName("Should reject duplicate license plate for same user")
    void addVehicle_DuplicatePlate_Rejected() throws Exception {
        VehicleRequest request = new VehicleRequest();
        request.setLicensePlate("DUP123");
        request.setMake("BMW");
        request.setModel("X5");
        request.setColor("Black");
        request.setYear(2023);

        mockMvc.perform(post("/api/vehicles")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/vehicles")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Should require authentication")
    void addVehicle_NoAuth_Rejected() throws Exception {
        VehicleRequest request = new VehicleRequest();
        request.setLicensePlate("NOAUTH");
        request.setMake("Ford");
        request.setModel("Focus");
        request.setColor("White");
        request.setYear(2023);

        mockMvc.perform(post("/api/vehicles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should delete vehicle")
    void deleteVehicle_Success() throws Exception {
        VehicleRequest request = new VehicleRequest();
        request.setLicensePlate("DEL123");
        request.setMake("Audi");
        request.setModel("A4");
        request.setColor("Silver");
        request.setYear(2023);

        String addResponse = mockMvc.perform(post("/api/vehicles")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        // Get vehicle ID from response
        Long vehicleId = objectMapper.readTree(addResponse).get("data").get("id").asLong();

        mockMvc.perform(delete("/api/vehicles/" + vehicleId)
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk());

        // Verify it's deleted
        mockMvc.perform(get("/api/vehicles")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[?(@.licensePlate=='DEL123')]").doesNotExist());
    }
}