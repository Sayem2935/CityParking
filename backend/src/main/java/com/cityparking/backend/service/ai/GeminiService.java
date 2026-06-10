package com.cityparking.backend.service.ai;

import org.springframework.web.multipart.MultipartFile;

/**
 * Service interface for AI vision capabilities (license plate detection,
 * vehicle analysis, parking slot detection, general image analysis).
 *
 * Implementations:
 * - MockGeminiService: Returns realistic mock data (default for development)
 * - GeminiServiceImpl: Real Gemini API integration (requires API key)
 *
 * Selected via feature flag: ai.provider.vision
 */
public interface GeminiService {

    /**
     * Detect and extract a license plate number from an image.
     *
     * @param image The image containing a vehicle with a license plate
     * @return Detection result with plate number, confidence, and bounding box
     */
    PlateDetectionResult detectPlate(MultipartFile image);

    /**
     * Analyze a vehicle image to determine type, color, make, and other attributes.
     *
     * @param image The image of a vehicle
     * @return Analysis result with vehicle attributes
     */
    VehicleAnalysisResult analyzeVehicle(MultipartFile image);

    /**
     * Detect parking slots in an overhead or wide-angle parking area image.
     *
     * @param image The image of the parking area
     * @return Detection result with occupied/free slot counts and details
     */
    ParkingDetectionResult detectParkingSlots(MultipartFile image);

    /**
     * General-purpose image analysis for parking-related queries.
     *
     * @param image  The image to analyze
     * @param prompt The analysis prompt/question
     * @return General analysis result as structured text
     */
    String analyzeParkingImage(MultipartFile image, String prompt);
}