package com.cityparking.backend.controller;

import com.cityparking.backend.dto.vehicle.VehicleRequest;
import com.cityparking.backend.dto.vehicle.VehicleResponse;
import com.cityparking.backend.security.JwtTokenProvider;
import com.cityparking.backend.service.VehicleService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(VehicleController.class)
@AutoConfigureMockMvc(addFilters = false)
class VehicleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private VehicleService vehicleService;

    @MockBean
    private AuthenticationManager authenticationManager;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(
                new UsernamePasswordAuthenticationToken("john@example.com", null, Collections.emptyList()));
        SecurityContextHolder.setContext(context);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private VehicleResponse createSampleVehicle() {
        return VehicleResponse.builder()
                .id(1L)
                .licensePlate("ABC123")
                .make("Toyota")
                .model("Camry")
                .year(2023)
                .color("Blue")
                .vehicleType("Sedan")
                .isDefault(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    void getVehicles_ShouldReturnList() throws Exception {
        when(vehicleService.getUserVehicles("john@example.com"))
                .thenReturn(List.of(createSampleVehicle()));

        mockMvc.perform(get("/api/vehicles")
                        .principal(new UsernamePasswordAuthenticationToken("john@example.com", null, Collections.emptyList())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].licensePlate").value("ABC123"));
    }

    @Test
    void createVehicle_ShouldReturnCreated() throws Exception {
        VehicleRequest request = VehicleRequest.builder()
                .licensePlate("ABC123")
                .make("Toyota")
                .model("Camry")
                .year(2023)
                .color("Blue")
                .vehicleType("Sedan")
                .build();

        when(vehicleService.createVehicle(eq("john@example.com"), any(VehicleRequest.class)))
                .thenReturn(createSampleVehicle());

        mockMvc.perform(post("/api/vehicles")
                        .principal(new UsernamePasswordAuthenticationToken("john@example.com", null, Collections.emptyList()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.licensePlate").value("ABC123"));
    }

    @Test
    void updateVehicle_ShouldReturnOk() throws Exception {
        VehicleRequest request = VehicleRequest.builder()
                .licensePlate("XYZ789")
                .make("Honda")
                .model("Civic")
                .year(2024)
                .color("Red")
                .vehicleType("Sedan")
                .build();

        VehicleResponse updated = createSampleVehicle();
        updated.setLicensePlate("XYZ789");
        updated.setMake("Honda");

        when(vehicleService.updateVehicle(eq("john@example.com"), eq(1L), any(VehicleRequest.class)))
                .thenReturn(updated);

        mockMvc.perform(put("/api/vehicles/1")
                        .principal(new UsernamePasswordAuthenticationToken("john@example.com", null, Collections.emptyList()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void deleteVehicle_ShouldReturnOk() throws Exception {
        doNothing().when(vehicleService).deleteVehicle("john@example.com", 1L);

        mockMvc.perform(delete("/api/vehicles/1")
                        .principal(new UsernamePasswordAuthenticationToken("john@example.com", null, Collections.emptyList())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}