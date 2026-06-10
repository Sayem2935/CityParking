package com.cityparking.backend.service.ai;

import java.util.List;

/**
 * Service interface for face recognition capabilities (enrollment, verification, search).
 *
 * Implementations:
 * - MockFaceRecognitionService: Returns realistic mock data (default for development)
 * - AwsRekognitionService: Real AWS Rekognition integration (requires credentials)
 *
 * Selected via feature flag: ai.provider.face
 */
public interface FaceRecognitionService {

    /**
     * Enroll (register) a face from image data into the face collection.
     *
     * @param userId   The user ID to associate with the face
     * @param imageData The raw image bytes containing the face
     * @return Enrollment result with face ID and status
     */
    FaceEnrollmentResult enrollFace(Long userId, byte[] imageData);

    /**
     * Verify that a face in an image matches a previously enrolled user.
     *
     * @param userId    The user ID to verify against
     * @param imageData The raw image bytes to verify
     * @return Verification result with match status and confidence
     */
    FaceVerificationResult verifyFace(Long userId, byte[] imageData);

    /**
     * Search for a face in the collection and return the best matching user.
     *
     * @param imageData The raw image bytes to search for
     * @return Search result with best match user ID and confidence, or no match
     */
    FaceSearchResult searchFace(byte[] imageData);

    /**
     * Result DTO for face enrollment operations.
     */
    class FaceEnrollmentResult {
        private Long userId;
        private String faceId;
        private boolean success;
        private String message;

        public FaceEnrollmentResult() {
        }

        public FaceEnrollmentResult(Long userId, String faceId, boolean success, String message) {
            this.userId = userId;
            this.faceId = faceId;
            this.success = success;
            this.message = message;
        }

        public Long getUserId() {
            return userId;
        }

        public void setUserId(Long userId) {
            this.userId = userId;
        }

        public String getFaceId() {
            return faceId;
        }

        public void setFaceId(String faceId) {
            this.faceId = faceId;
        }

        public boolean isSuccess() {
            return success;
        }

        public void setSuccess(boolean success) {
            this.success = success;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }

    /**
     * Result DTO for face verification operations.
     */
    class FaceVerificationResult {
        private boolean verified;
        private Long userId;
        private double confidence;
        private String message;

        public FaceVerificationResult() {
        }

        public FaceVerificationResult(boolean verified, Long userId, double confidence, String message) {
            this.verified = verified;
            this.userId = userId;
            this.confidence = confidence;
            this.message = message;
        }

        public boolean isVerified() {
            return verified;
        }

        public void setVerified(boolean verified) {
            this.verified = verified;
        }

        public Long getUserId() {
            return userId;
        }

        public void setUserId(Long userId) {
            this.userId = userId;
        }

        public double getConfidence() {
            return confidence;
        }

        public void setConfidence(double confidence) {
            this.confidence = confidence;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }

    /**
     * Enroll a face from image data (AWS Rekognition / Cloud provider flow).
     * Indexes the face and returns a provider-specific face ID.
     *
     * @param imageBytes The raw image bytes containing the face
     * @param userId     The user ID to associate with the face
     * @return FaceEnrollResult with externalFaceId, collectionId, confidence, provider
     */
    default FaceEnrollResult enrollFace(byte[] imageBytes, Long userId) {
        throw new UnsupportedOperationException("enrollFace(byte[], Long) not implemented");
    }

    /**
     * Verify / search for a face in the collection (AWS Rekognition / Cloud provider flow).
     * Searches the face collection and returns the best match.
     *
     * @param imageBytes The raw image bytes to search for
     * @return FaceVerifyResult with externalFaceId, userId, confidence, provider, matched
     */
    default FaceVerifyResult verifyFace(byte[] imageBytes) {
        throw new UnsupportedOperationException("verifyFace(byte[]) not implemented");
    }

    /**
     * Delete a face from the face collection.
     *
     * @param externalFaceId The provider-specific face ID to delete
     * @return true if deleted successfully
     */
    default boolean deleteFace(String externalFaceId) {
        throw new UnsupportedOperationException("deleteFace not implemented");
    }

    /**
     * Update a face by deleting the old one and re-indexing.
     *
     * @param imageBytes     The new face image as byte array
     * @param externalFaceId The old provider-specific face ID to replace
     * @return FaceUpdateResult with new externalFaceId, collectionId, confidence, provider
     */
    default FaceUpdateResult updateFace(byte[] imageBytes, String externalFaceId) {
        throw new UnsupportedOperationException("updateFace not implemented");
    }

    /**
     * Result DTO for AWS/Cloud face enrollment operations.
     */
    class FaceEnrollResult {
        private String externalFaceId;
        private String collectionId;
        private float confidence;
        private String provider;

        public FaceEnrollResult() {
        }

        public FaceEnrollResult(String externalFaceId, String collectionId, float confidence, String provider) {
            this.externalFaceId = externalFaceId;
            this.collectionId = collectionId;
            this.confidence = confidence;
            this.provider = provider;
        }

        public String getExternalFaceId() { return externalFaceId; }
        public void setExternalFaceId(String externalFaceId) { this.externalFaceId = externalFaceId; }
        public String getCollectionId() { return collectionId; }
        public void setCollectionId(String collectionId) { this.collectionId = collectionId; }
        public float getConfidence() { return confidence; }
        public void setConfidence(float confidence) { this.confidence = confidence; }
        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }
    }

    /**
     * Result DTO for AWS/Cloud face verification / search operations.
     */
    class FaceVerifyResult {
        private String externalFaceId;
        private Long userId;
        private float confidence;
        private String provider;
        private boolean matched;

        public FaceVerifyResult() {
        }

        public FaceVerifyResult(String externalFaceId, Long userId, float confidence, String provider, boolean matched) {
            this.externalFaceId = externalFaceId;
            this.userId = userId;
            this.confidence = confidence;
            this.provider = provider;
            this.matched = matched;
        }

        public String getExternalFaceId() { return externalFaceId; }
        public void setExternalFaceId(String externalFaceId) { this.externalFaceId = externalFaceId; }
        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        public float getConfidence() { return confidence; }
        public void setConfidence(float confidence) { this.confidence = confidence; }
        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }
        public boolean isMatched() { return matched; }
        public void setMatched(boolean matched) { this.matched = matched; }
    }

    /**
     * Result DTO for AWS/Cloud face update operations.
     */
    class FaceUpdateResult {
        private String externalFaceId;
        private String collectionId;
        private float confidence;
        private String provider;

        public FaceUpdateResult() {
        }

        public FaceUpdateResult(String externalFaceId, String collectionId, float confidence, String provider) {
            this.externalFaceId = externalFaceId;
            this.collectionId = collectionId;
            this.confidence = confidence;
            this.provider = provider;
        }

        public String getExternalFaceId() { return externalFaceId; }
        public void setExternalFaceId(String externalFaceId) { this.externalFaceId = externalFaceId; }
        public String getCollectionId() { return collectionId; }
        public void setCollectionId(String collectionId) { this.collectionId = collectionId; }
        public float getConfidence() { return confidence; }
        public void setConfidence(float confidence) { this.confidence = confidence; }
        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }
    }

    /**
     * Result DTO for face search operations.
     */
    class FaceSearchResult {
        private boolean matchFound;
        private Long userId;
        private double confidence;
        private String faceId;
        private String message;

        public FaceSearchResult() {
        }

        public FaceSearchResult(boolean matchFound, Long userId, double confidence, String faceId, String message) {
            this.matchFound = matchFound;
            this.userId = userId;
            this.confidence = confidence;
            this.faceId = faceId;
            this.message = message;
        }

        public boolean isMatchFound() {
            return matchFound;
        }

        public void setMatchFound(boolean matchFound) {
            this.matchFound = matchFound;
        }

        public Long getUserId() {
            return userId;
        }

        public void setUserId(Long userId) {
            this.userId = userId;
        }

        public double getConfidence() {
            return confidence;
        }

        public void setConfidence(double confidence) {
            this.confidence = confidence;
        }

        public String getFaceId() {
            return faceId;
        }

        public void setFaceId(String faceId) {
            this.faceId = faceId;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }
}