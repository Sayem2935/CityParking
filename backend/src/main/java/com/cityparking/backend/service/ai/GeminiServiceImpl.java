package com.cityparking.backend.service.ai;

import com.cityparking.backend.config.GeminiProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.time.Duration;
import java.util.*;

/**
 * Real Gemini API implementation of GeminiService.
 * Activated when: ai.provider.vision=gemini
 *
 * Uses Google's Gemini 1.5 Flash model via REST API.
 * API key is loaded from GEMINI_API_KEY environment variable — NEVER hardcoded.
 *
 * TOMORROW: Set GEMINI_API_KEY env var and switch ai.provider.vision=gemini
 */
@Service
@ConditionalOnProperty(name = "ai.provider.vision", havingValue = "gemini")
@Slf4j
public class GeminiServiceImpl implements GeminiService {

    private final WebClient webClient;
    private final GeminiProperties properties;
    private final ObjectMapper objectMapper;

    public GeminiServiceImpl(
            @Qualifier("geminiWebClient") WebClient webClient,
            GeminiProperties properties) {
        this.webClient = webClient;
        this.properties = properties;
        this.objectMapper = new ObjectMapper();
        log.info("GeminiServiceImpl initialized with model: {}", properties.getModel());
    }

    @Override
    @CircuitBreaker(name = "gemini", fallbackMethod = "detectPlateFallback")
    @Retry(name = "gemini")
    public PlateDetectionResult detectPlate(MultipartFile image) {
        String prompt = """
                Analyze this vehicle image and detect the license plate.
                
                Return ONLY a JSON object with this exact structure:
                {
                  "plateNumber": "ABC1234",
                  "confidence": 0.95,
                  "vehicleType": "sedan",
                  "vehicleColor": "white"
                }
                
                Rules:
                - plateNumber: the alphanumeric characters on the plate (uppercase, no spaces)
                - confidence: 0.0 to 1.0
                - vehicleType: sedan, suv, truck, van, motorcycle, bus, or unknown
                - vehicleColor: the primary color of the vehicle
                
                If no plate is visible, set plateNumber to "", confidence to 0.0.
                Return ONLY the JSON object, no other text.
                """;

        try {
            String base64Image = encodeImage(image);
            String response = callGeminiVision(prompt, base64Image);
            return parsePlateDetectionResponse(response);
        } catch (Exception e) {
            log.error("Gemini plate detection failed: {}", e.getMessage());
            PlateDetectionResult result = new PlateDetectionResult();
            result.setPlateNumber("");
            result.setConfidence(0.0);
            return result;
        }
    }

    @Override
    @CircuitBreaker(name = "gemini", fallbackMethod = "analyzeVehicleFallback")
    @Retry(name = "gemini")
    public VehicleAnalysisResult analyzeVehicle(MultipartFile image) {
        String prompt = """
                Analyze this vehicle image and provide detailed information.
                
                Return ONLY a JSON object with this exact structure:
                {
                  "vehicleType": "sedan",
                  "vehicleColor": "white",
                  "make": "Toyota",
                  "model": "Camry",
                  "confidence": 0.85
                }
                
                Return ONLY the JSON object, no other text.
                """;

        try {
            String base64Image = encodeImage(image);
            String response = callGeminiVision(prompt, base64Image);
            return parseVehicleAnalysisResponse(response);
        } catch (Exception e) {
            log.error("Gemini vehicle analysis failed: {}", e.getMessage());
            VehicleAnalysisResult result = new VehicleAnalysisResult();
            result.setConfidence(0.0);
            return result;
        }
    }

    @Override
    @CircuitBreaker(name = "gemini", fallbackMethod = "detectParkingSlotsFallback")
    @Retry(name = "gemini")
    public ParkingDetectionResult detectParkingSlots(MultipartFile image) {
        String prompt = """
                Analyze this overhead parking lot image and detect all parking slots.
                
                Return ONLY a JSON object with this exact structure:
                {
                  "totalSlots": 10,
                  "occupiedSlots": 7,
                  "freeSlots": 3,
                  "confidence": 0.95,
                  "slots": [
                    {"slotId": "A1", "occupied": true, "confidence": 0.95, "zone": "Zone-A"},
                    {"slotId": "A2", "occupied": false, "confidence": 0.90, "zone": "Zone-A"}
                  ]
                }
                
                Return ONLY the JSON object, no other text.
                """;

        try {
            String base64Image = encodeImage(image);
            String response = callGeminiVision(prompt, base64Image);
            return parseParkingDetectionResponse(response);
        } catch (Exception e) {
            log.error("Gemini parking detection failed: {}", e.getMessage());
            return new ParkingDetectionResult();
        }
    }

    @Override
    @CircuitBreaker(name = "gemini", fallbackMethod = "analyzeParkingImageFallback")
    @Retry(name = "gemini")
    public String analyzeParkingImage(MultipartFile image, String prompt) {
        try {
            String base64Image = encodeImage(image);
            return callGeminiVision(prompt, base64Image);
        } catch (Exception e) {
            log.error("Gemini parking image analysis failed: {}", e.getMessage());
            return "{\"error\": \"Analysis failed: " + e.getMessage() + "\"}";
        }
    }

    // ── Core API Call Methods ──────────────────────────────────────────

    private String callGeminiVision(String prompt, String base64Image) {
        Map<String, Object> request = buildVisionRequest(prompt, base64Image);
        String url = "/models/" + properties.getModel() + ":generateContent?key=" + properties.getApiKey();

        log.debug("Calling Gemini Vision API with model: {}", properties.getModel());

        String response = webClient.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofMillis(properties.getTimeout().getReadMs()))
                .block();

        return extractTextFromResponse(response);
    }

    private Map<String, Object> buildVisionRequest(String prompt, String base64Image) {
        Map<String, Object> inlineData = new HashMap<>();
        inlineData.put("mime_type", "image/jpeg");
        inlineData.put("data", base64Image);

        Map<String, Object> imagePart = new HashMap<>();
        imagePart.put("inline_data", inlineData);

        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", prompt);

        Map<String, Object> content = new HashMap<>();
        content.put("parts", List.of(imagePart, textPart));

        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("temperature", 0.1);
        generationConfig.put("maxOutputTokens", 1024);

        Map<String, Object> request = new HashMap<>();
        request.put("contents", List.of(content));
        request.put("generationConfig", generationConfig);

        return request;
    }

    private String extractTextFromResponse(String response) {
        if (response == null || response.isBlank()) {
            throw new RuntimeException("Empty response from Gemini API");
        }
        try {
            JsonNode root = objectMapper.readTree(response);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    return parts.get(0).path("text").asText();
                }
            }
            throw new RuntimeException("No text content in Gemini response");
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to parse Gemini response: " + e.getMessage());
        }
    }

    // ── Response Parsing ───────────────────────────────────────────────

    private PlateDetectionResult parsePlateDetectionResponse(String response) {
        try {
            String jsonStr = extractJsonFromText(response);
            JsonNode node = objectMapper.readTree(jsonStr);

            PlateDetectionResult result = new PlateDetectionResult();
            result.setPlateNumber(node.path("plateNumber").asText(""));
            result.setConfidence(node.path("confidence").asDouble(0.0));
            result.setVehicleType(node.path("vehicleType").asText("unknown"));
            result.setVehicleColor(node.path("vehicleColor").asText("unknown"));
            return result;
        } catch (Exception e) {
            log.warn("Failed to parse plate detection response: {}", e.getMessage());
            PlateDetectionResult result = new PlateDetectionResult();
            result.setPlateNumber("");
            result.setConfidence(0.0);
            return result;
        }
    }

    private VehicleAnalysisResult parseVehicleAnalysisResponse(String response) {
        try {
            String jsonStr = extractJsonFromText(response);
            JsonNode node = objectMapper.readTree(jsonStr);

            VehicleAnalysisResult result = new VehicleAnalysisResult();
            result.setVehicleType(node.path("vehicleType").asText("unknown"));
            result.setVehicleColor(node.path("vehicleColor").asText("unknown"));
            result.setMake(node.path("make").asText("unknown"));
            result.setModel(node.path("model").asText("unknown"));
            result.setConfidence(node.path("confidence").asDouble(0.0));
            return result;
        } catch (Exception e) {
            log.warn("Failed to parse vehicle analysis response: {}", e.getMessage());
            VehicleAnalysisResult result = new VehicleAnalysisResult();
            result.setConfidence(0.0);
            return result;
        }
    }

    private ParkingDetectionResult parseParkingDetectionResponse(String response) {
        try {
            String jsonStr = extractJsonFromText(response);
            JsonNode node = objectMapper.readTree(jsonStr);

            ParkingDetectionResult result = new ParkingDetectionResult();
            result.setTotalSlots(node.path("totalSlots").asInt(0));
            result.setOccupiedSlots(node.path("occupiedSlots").asInt(0));
            result.setFreeSlots(node.path("freeSlots").asInt(0));
            result.setConfidence(node.path("confidence").asDouble(0.0));

            List<ParkingDetectionResult.SlotDetail> slots = new ArrayList<>();
            JsonNode slotsNode = node.path("slots");
            if (slotsNode.isArray()) {
                for (JsonNode slotNode : slotsNode) {
                    ParkingDetectionResult.SlotDetail slot = new ParkingDetectionResult.SlotDetail();
                    slot.setSlotId(slotNode.path("slotId").asText(""));
                    slot.setOccupied(slotNode.path("occupied").asBoolean(false));
                    slot.setConfidence(slotNode.path("confidence").asDouble(0.0));
                    slot.setZone(slotNode.path("zone").asText(""));
                    slots.add(slot);
                }
            }
            result.setSlots(slots);
            return result;
        } catch (Exception e) {
            log.warn("Failed to parse parking detection response: {}", e.getMessage());
            return new ParkingDetectionResult();
        }
    }

    private String extractJsonFromText(String text) {
        if (text == null) return "{}";

        // Try to find JSON in markdown code blocks
        int jsonStart = text.indexOf("```json");
        if (jsonStart >= 0) {
            jsonStart = text.indexOf("\n", jsonStart) + 1;
            int jsonEnd = text.indexOf("```", jsonStart);
            if (jsonEnd > jsonStart) {
                return text.substring(jsonStart, jsonEnd).trim();
            }
        }

        // Try to find raw JSON object
        jsonStart = text.indexOf("{");
        int jsonEnd = text.lastIndexOf("}");
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
            return text.substring(jsonStart, jsonEnd + 1);
        }

        return text.trim();
    }

    // ── Image Encoding ─────────────────────────────────────────────────

    private String encodeImage(MultipartFile image) throws IOException {
        byte[] imageBytes = image.getBytes();
        return Base64.getEncoder().encodeToString(imageBytes);
    }

    // ── Fallback Methods ───────────────────────────────────────────────

    public PlateDetectionResult detectPlateFallback(MultipartFile image, Throwable t) {
        log.warn("Gemini plate detection fallback triggered: {}", t.getMessage());
        PlateDetectionResult result = new PlateDetectionResult();
        result.setPlateNumber("");
        result.setConfidence(0.0);
        return result;
    }

    public VehicleAnalysisResult analyzeVehicleFallback(MultipartFile image, Throwable t) {
        log.warn("Gemini vehicle analysis fallback triggered: {}", t.getMessage());
        VehicleAnalysisResult result = new VehicleAnalysisResult();
        result.setConfidence(0.0);
        return result;
    }

    public ParkingDetectionResult detectParkingSlotsFallback(MultipartFile image, Throwable t) {
        log.warn("Gemini parking detection fallback triggered: {}", t.getMessage());
        return new ParkingDetectionResult();
    }

    public String analyzeParkingImageFallback(MultipartFile image, String prompt, Throwable t) {
        log.warn("Gemini parking image analysis fallback triggered: {}", t.getMessage());
        return "{\"error\": \"AI service temporarily unavailable\"}";
    }
}