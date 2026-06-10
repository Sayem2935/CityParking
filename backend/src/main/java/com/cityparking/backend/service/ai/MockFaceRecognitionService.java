package com.cityparking.backend.service.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Mock implementation of FaceRecognitionService that returns realistic fake data.
 * Used during development and testing when no AWS credentials are available.
 *
 * Activated when: ai.provider.face=mock (default)
 */
@Service
@ConditionalOnProperty(name = "ai.provider.face", havingValue = "mock", matchIfMissing = true)
public class MockFaceRecognitionService implements FaceRecognitionService {

    private static final AtomicLong faceIdCounter = new AtomicLong(1);

    private static final Logger log = LoggerFactory.getLogger(MockFaceRecognitionService.class);

    @Override
    public FaceEnrollmentResult enrollFace(Long userId, byte[] imageData) {
        log.info("[MOCK] enrollFace() called for userId: {} - returning simulated enrollment", userId);

        String faceId = "mock-face-" + UUID.randomUUID().toString().substring(0, 8);

        return new FaceEnrollmentResult(
                userId,
                faceId,
                true,
                "Face enrolled successfully (mock mode)"
        );
    }

    @Override
    public FaceVerificationResult verifyFace(Long userId, byte[] imageData) {
        log.info("[MOCK] verifyFace() called for userId: {} - returning simulated verification", userId);

        // Simulate high confidence match (95-99%)
        double confidence = 95.0 + (ThreadLocalRandom.current().nextDouble() * 4.5);

        return new FaceVerificationResult(
                true,
                userId,
                Math.round(confidence * 10.0) / 10.0,
                "Face verified successfully (mock mode)"
        );
    }

    @Override
    public FaceSearchResult searchFace(byte[] imageData) {
        log.info("[MOCK] searchFace() called - returning simulated search result");

        // Simulate finding a user with high confidence
        Long mockUserId = (long) (1 + ThreadLocalRandom.current().nextInt(10));
        double confidence = 93.0 + (ThreadLocalRandom.current().nextDouble() * 6.5);
        String faceId = "mock-face-" + UUID.randomUUID().toString().substring(0, 8);

        return new FaceSearchResult(
                true,
                mockUserId,
                Math.round(confidence * 10.0) / 10.0,
                faceId,
                "Face match found (mock mode)"
        );
    }

    @Override
    public FaceEnrollResult enrollFace(byte[] imageBytes, Long userId) {
        log.info("[MOCK] enrollFace(byte[], Long) called for userId: {} with {} bytes - returning simulated enrollment",
                userId, imageBytes != null ? imageBytes.length : 0);

        String externalFaceId = "mock-face-" + UUID.randomUUID().toString().substring(0, 8);
        String collectionId = "mock-collection";
        float confidence = 97.0f + (float)(ThreadLocalRandom.current().nextDouble() * 2.5);
        confidence = Math.round(confidence * 10.0f) / 10.0f;

        return new FaceEnrollResult(externalFaceId, collectionId, confidence, "mock");
    }

    @Override
    public FaceVerifyResult verifyFace(byte[] imageBytes) {
        log.info("[MOCK] verifyFace(byte[]) called with {} bytes - returning simulated verification",
                imageBytes != null ? imageBytes.length : 0);

        Long mockUserId = (long) (1 + ThreadLocalRandom.current().nextInt(10));
        float confidence = 95.0f + (float)(ThreadLocalRandom.current().nextDouble() * 4.5);
        confidence = Math.round(confidence * 10.0f) / 10.0f;
        String externalFaceId = "mock-face-" + UUID.randomUUID().toString().substring(0, 8);

        return new FaceVerifyResult(externalFaceId, mockUserId, confidence, "mock", true);
    }

    @Override
    public boolean deleteFace(String externalFaceId) {
        log.info("[MOCK] deleteFace() called for externalFaceId: {} - returning success", externalFaceId);
        return true;
    }

    @Override
    public FaceUpdateResult updateFace(byte[] imageBytes, String externalFaceId) {
        log.info("[MOCK] updateFace() called for externalFaceId: {} with {} bytes - returning simulated update",
                externalFaceId, imageBytes != null ? imageBytes.length : 0);

        String newExternalFaceId = "mock-face-" + UUID.randomUUID().toString().substring(0, 8);
        String collectionId = "mock-collection";
        float confidence = 97.0f + (float)(ThreadLocalRandom.current().nextDouble() * 2.5);
        confidence = Math.round(confidence * 10.0f) / 10.0f;

        return new FaceUpdateResult(newExternalFaceId, collectionId, confidence, "mock");
    }
}
