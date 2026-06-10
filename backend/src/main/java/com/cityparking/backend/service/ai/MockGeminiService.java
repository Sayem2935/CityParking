package com.cityparking.backend.service.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Mock implementation of GeminiService that returns realistic fake data.
 * Used during development and testing when no Gemini API key is available.
 *
 * Activated when: ai.provider.vision=mock (default)
 */
@Service
@ConditionalOnProperty(name = "ai.provider.vision", havingValue = "mock", matchIfMissing = true)
public class MockGeminiService implements GeminiService {

    private static final Logger log = LoggerFactory.getLogger(MockGeminiService.class);

    private static final String[] PLATE_PATTERNS = {
            "DHAKA-METRO-GA-1234",
            "DHAKA-METRO-KA-5678",
            "CHITTAGONG-CHA-9012",
            "SYLHET-SYL-3456",
            "RAJSHAHI-RAJ-7890",
            "KHULNA-KHA-2345",
            "BARISAL-BAR-6789",
            "RANGPUR-RAN-0123",
            "MYMENSINGH-MYM-4567",
            "COMILLA-COM-8901"
    };

    private static final String[] VEHICLE_TYPES = {"Sedan", "SUV", "Hatchback", "Pickup Truck", "Van", "Motorcycle", "Micro Bus"};
    private static final String[] VEHICLE_COLORS = {"White", "Black", "Silver", "Red", "Blue", "Grey", "Green", "Yellow"};
    private static final String[] VEHICLE_MAKES = {"Toyota", "Honda", "Hyundai", "Nissan", "Suzuki", "Mitsubishi", "Ford"};
    private static final String[] VEHICLE_MODELS = {"Corolla", "Civic", "Tucson", "X-Press", "Swift", "Pajero", "Ranger"};
    private static final String[] ZONES = {"Zone-A", "Zone-B", "Zone-C", "Zone-D", "VIP", "Handicap"};

    @Override
    public PlateDetectionResult detectPlate(MultipartFile image) {
        log.info("[MOCK] detectPlate() called - returning simulated plate detection");

        String plateNumber = PLATE_PATTERNS[ThreadLocalRandom.current().nextInt(PLATE_PATTERNS.length)];
        double confidence = 0.85 + (ThreadLocalRandom.current().nextDouble() * 0.14); // 0.85 - 0.99
        String vehicleType = VEHICLE_TYPES[ThreadLocalRandom.current().nextInt(VEHICLE_TYPES.length)];
        String vehicleColor = VEHICLE_COLORS[ThreadLocalRandom.current().nextInt(VEHICLE_COLORS.length)];

        PlateDetectionResult result = new PlateDetectionResult();
        result.setPlateNumber(plateNumber);
        result.setConfidence(Math.round(confidence * 100.0) / 100.0);
        result.setVehicleType(vehicleType);
        result.setVehicleColor(vehicleColor);
        result.setBoundingBox(new PlateDetectionResult.BoundingBox(120, 200, 300, 80));

        return result;
    }

    @Override
    public VehicleAnalysisResult analyzeVehicle(MultipartFile image) {
        log.info("[MOCK] analyzeVehicle() called - returning simulated vehicle analysis");

        VehicleAnalysisResult result = new VehicleAnalysisResult();
        result.setVehicleType(VEHICLE_TYPES[ThreadLocalRandom.current().nextInt(VEHICLE_TYPES.length)]);
        result.setVehicleColor(VEHICLE_COLORS[ThreadLocalRandom.current().nextInt(VEHICLE_COLORS.length)]);
        result.setMake(VEHICLE_MAKES[ThreadLocalRandom.current().nextInt(VEHICLE_MAKES.length)]);
        result.setModel(VEHICLE_MODELS[ThreadLocalRandom.current().nextInt(VEHICLE_MODELS.length)]);
        result.setYearEstimate(2018 + ThreadLocalRandom.current().nextInt(7)); // 2018-2024
        result.setConfidence(0.80 + (ThreadLocalRandom.current().nextDouble() * 0.19)); // 0.80 - 0.99

        return result;
    }

    @Override
    public ParkingDetectionResult detectParkingSlots(MultipartFile image) {
        log.info("[MOCK] detectParkingSlots() called - returning simulated parking detection");

        int totalSlots = 20;
        int occupied = 8 + ThreadLocalRandom.current().nextInt(8); // 8-15 occupied
        int free = totalSlots - occupied;

        List<ParkingDetectionResult.SlotDetail> slots = Arrays.asList(
                new ParkingDetectionResult.SlotDetail("A1", false, 0.97, "Zone-A"),
                new ParkingDetectionResult.SlotDetail("A2", true, 0.95, "Zone-A"),
                new ParkingDetectionResult.SlotDetail("A3", true, 0.93, "Zone-A"),
                new ParkingDetectionResult.SlotDetail("A4", false, 0.96, "Zone-A"),
                new ParkingDetectionResult.SlotDetail("B1", true, 0.94, "Zone-B"),
                new ParkingDetectionResult.SlotDetail("B2", false, 0.98, "Zone-B"),
                new ParkingDetectionResult.SlotDetail("B3", true, 0.92, "Zone-B"),
                new ParkingDetectionResult.SlotDetail("B4", true, 0.91, "Zone-B"),
                new ParkingDetectionResult.SlotDetail("C1", false, 0.97, "Zone-C"),
                new ParkingDetectionResult.SlotDetail("C2", true, 0.95, "Zone-C"),
                new ParkingDetectionResult.SlotDetail("C3", false, 0.96, "Zone-C"),
                new ParkingDetectionResult.SlotDetail("C4", true, 0.93, "Zone-C"),
                new ParkingDetectionResult.SlotDetail("D1", true, 0.94, "Zone-D"),
                new ParkingDetectionResult.SlotDetail("D2", false, 0.97, "Zone-D"),
                new ParkingDetectionResult.SlotDetail("D3", true, 0.95, "Zone-D"),
                new ParkingDetectionResult.SlotDetail("D4", false, 0.98, "Zone-D"),
                new ParkingDetectionResult.SlotDetail("VIP1", false, 0.99, "VIP"),
                new ParkingDetectionResult.SlotDetail("VIP2", true, 0.97, "VIP"),
                new ParkingDetectionResult.SlotDetail("H1", false, 0.98, "Handicap"),
                new ParkingDetectionResult.SlotDetail("H2", true, 0.96, "Handicap")
        );

        ParkingDetectionResult result = new ParkingDetectionResult();
        result.setTotalSlots(totalSlots);
        result.setOccupiedSlots(occupied);
        result.setFreeSlots(free);
        result.setConfidence(0.93);
        result.setSlots(slots);

        return result;
    }

    @Override
    public String analyzeParkingImage(MultipartFile image, String prompt) {
        log.info("[MOCK] analyzeParkingImage() called with prompt: '{}' - returning simulated analysis", prompt);

        return String.format("""
                {
                  "analysis": "The parking area appears to be moderately occupied with approximately %d%% of spaces filled.",
                  "observations": [
                    "Zone A has high availability",
                    "Zone B is near capacity",
                    "Zone C has moderate availability",
                    "VIP section has 1 open space"
                  ],
                  "recommendations": [
                    "Direct incoming vehicles to Zone A for best availability",
                    "Consider temporary overflow to Zone D"
                  ],
                  "overallStatus": "MODERATE",
                  "confidence": 0.92
                }
                """, 50 + ThreadLocalRandom.current().nextInt(30));
    }
}