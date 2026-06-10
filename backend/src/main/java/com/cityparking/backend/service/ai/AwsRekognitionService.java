package com.cityparking.backend.service.ai;

import com.cityparking.backend.config.AwsProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.rekognition.RekognitionClient;
import software.amazon.awssdk.services.rekognition.model.*;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.List;
import java.util.stream.Collectors;

/**
 * AWS Rekognition implementation of FaceRecognitionService.
 *
 * Uses AWS Rekognition for:
 * - IndexFaces (enrollment)
 * - SearchFacesByImage (verification)
 * - DeleteFaces (removal)
 * - IndexFaces with ExternalImageId update (update)
 *
 * Configuration loaded from application.yml via AwsProperties.
 * No hardcoded credentials — uses environment variables only.
 */
@Service
@ConditionalOnProperty(name = "ai.provider.face", havingValue = "aws")
public class AwsRekognitionService implements FaceRecognitionService {

    private static final Logger log = LoggerFactory.getLogger(AwsRekognitionService.class);

    private final AwsProperties awsProperties;
    private RekognitionClient rekognitionClient;

    public AwsRekognitionService(AwsProperties awsProperties) {
        this.awsProperties = awsProperties;
    }

    @PostConstruct
    public void init() {
        log.info("Initializing AWS Rekognition client for region: {}", awsProperties.getRegion());

        AwsBasicCredentials credentials = AwsBasicCredentials.create(
                awsProperties.getAccessKeyId(),
                awsProperties.getSecretAccessKey()
        );

        this.rekognitionClient = RekognitionClient.builder()
                .region(Region.of(awsProperties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();

        // Ensure collection exists
        ensureCollectionExists();

        log.info("AWS Rekognition client initialized successfully. Collection: {}",
                awsProperties.getCollectionId());
    }

    /**
     * Search for a face in the Rekognition collection.
     * Implements the abstract method from FaceRecognitionService interface.
     *
     * @param imageData The raw image bytes to search for
     * @return FaceSearchResult with best match user ID and confidence, or no match
     */
    @Override
    public FaceSearchResult searchFace(byte[] imageData) {
        log.info("Searching for face in collection: {}", awsProperties.getCollectionId());

        try {
            SearchFacesByImageRequest request = SearchFacesByImageRequest.builder()
                    .collectionId(awsProperties.getCollectionId())
                    .image(Image.builder()
                            .bytes(SdkBytes.fromByteArray(imageData))
                            .build())
                    .maxFaces(1)
                    .faceMatchThreshold(90.0f)
                    .build();

            SearchFacesByImageResponse response = rekognitionClient.searchFacesByImage(request);

            if (response.faceMatches().isEmpty()) {
                log.info("No matching face found in search");
                return new FaceSearchResult(false, null, 0.0, null, "No matching face found");
            }

            FaceMatch faceMatch = response.faceMatches().get(0);
            String externalFaceId = faceMatch.face().faceId();
            String externalImageId = faceMatch.face().externalImageId();
            double confidence = faceMatch.similarity();

            Long userId = null;
            if (externalImageId != null && !externalImageId.isEmpty()) {
                try {
                    userId = Long.parseLong(externalImageId);
                } catch (NumberFormatException e) {
                    log.warn("Could not parse userId from ExternalImageId: {}", externalImageId);
                }
            }

            log.info("Face search found match. externalFaceId: {}, userId: {}, confidence: {}",
                    externalFaceId, userId, confidence);

            return new FaceSearchResult(true, userId, confidence, externalFaceId, "Face matched");

        } catch (InvalidParameterException e) {
            log.error("No face detected in search image", e);
            return new FaceSearchResult(false, null, 0.0, null, "No face detected in image");
        } catch (Exception e) {
            log.error("Face search failed", e);
            throw new RuntimeException("Face search failed: " + e.getMessage(), e);
        }
    }

    /**
     * Enroll face with (Long, byte[]) signature required by the interface.
     */
    @Override
    public FaceEnrollmentResult enrollFace(Long userId, byte[] imageData) {
        FaceEnrollResult awsResult = enrollFace(imageData, userId);
        return new FaceEnrollmentResult(userId, awsResult.getExternalFaceId(), true, "Face enrolled successfully");
    }

    /**
     * Verify face with (Long, byte[]) signature required by the interface.
     */
    @Override
    public FaceVerificationResult verifyFace(Long userId, byte[] imageData) {
        FaceSearchResult searchResult = searchFace(imageData);
        if (searchResult.isMatchFound() && userId.equals(searchResult.getUserId())) {
            return new FaceVerificationResult(true, userId, searchResult.getConfidence(), "Face verified");
        }
        return new FaceVerificationResult(false, null, 0.0, "Face not verified");
    }

    @PreDestroy
    public void cleanup() {
        if (rekognitionClient != null) {
            rekognitionClient.close();
        }
    }

    /**
     * Enroll a face by indexing it into the Rekognition collection.
     *
     * Flow:
     * 1. Call IndexFaces with the image bytes
     * 2. AWS returns a FaceId (externalFaceId)
     * 3. Store the FaceId with userId as ExternalImageId
     *
     * @param imageBytes The face image as byte array
     * @param userId    The user ID to associate with the face
     * @return FaceEnrollResult with externalFaceId, collectionId, confidence, provider
     */
    @Override
    public FaceEnrollResult enrollFace(byte[] imageBytes, Long userId) {
        log.info("Enrolling face for userId: {} in collection: {}", userId, awsProperties.getCollectionId());

        try {
            IndexFacesRequest request = IndexFacesRequest.builder()
                    .collectionId(awsProperties.getCollectionId())
                    .image(Image.builder()
                            .bytes(SdkBytes.fromByteArray(imageBytes))
                            .build())
                    .externalImageId(String.valueOf(userId))
                    .maxFaces(1)
                    .qualityFilter(QualityFilter.AUTO)
                    .detectionAttributes(Attribute.DEFAULT)
                    .build();

            IndexFacesResponse response = rekognitionClient.indexFaces(request);

            if (response.faceRecords().isEmpty()) {
                log.warn("No face detected in image for userId: {}", userId);
                throw new RuntimeException("No face detected in the image. Please ensure your face is clearly visible.");
            }

            FaceRecord faceRecord = response.faceRecords().get(0);
            String externalFaceId = faceRecord.face().faceId();
            float confidence = faceRecord.face().confidence();

            log.info("Face enrolled successfully. externalFaceId: {}, confidence: {}",
                    externalFaceId, confidence);

            return new FaceEnrollResult(
                    externalFaceId,
                    awsProperties.getCollectionId(),
                    confidence,
                    "aws"
            );

        } catch (InvalidImageFormatException e) {
            log.error("Invalid image format for userId: {}", userId, e);
            throw new RuntimeException("Invalid image format. Please upload a valid JPEG or PNG image.", e);
        } catch (ImageTooLargeException e) {
            log.error("Image too large for userId: {}", userId, e);
            throw new RuntimeException("Image file is too large. Maximum size is 5MB.", e);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to enroll face for userId: {}", userId, e);
            throw new RuntimeException("Face enrollment failed: " + e.getMessage(), e);
        }
    }

    /**
     * Verify a face by searching for it in the Rekognition collection.
     *
     * Flow:
     * 1. Call SearchFacesByImage with the image bytes
     * 2. AWS returns matching faces with confidence scores
     * 3. Extract userId from ExternalImageId
     * 4. Return match result
     *
     * @param imageBytes The face image as byte array
     * @return FaceVerifyResult with externalFaceId, userId, confidence, provider, matched
     */
    @Override
    public FaceVerifyResult verifyFace(byte[] imageBytes) {
        log.info("Verifying face against collection: {}", awsProperties.getCollectionId());

        try {
            SearchFacesByImageRequest request = SearchFacesByImageRequest.builder()
                    .collectionId(awsProperties.getCollectionId())
                    .image(Image.builder()
                            .bytes(SdkBytes.fromByteArray(imageBytes))
                            .build())
                    .maxFaces(1)
                    .faceMatchThreshold(90.0f)
                    .build();

            SearchFacesByImageResponse response = rekognitionClient.searchFacesByImage(request);

            if (response.faceMatches().isEmpty()) {
                log.info("No matching face found");
                return new FaceVerifyResult(
                        null, null, 0.0f, "aws", false
                );
            }

            FaceMatch faceMatch = response.faceMatches().get(0);
            String externalFaceId = faceMatch.face().faceId();
            String externalImageId = faceMatch.face().externalImageId();
            float confidence = faceMatch.similarity();

            // ExternalImageId stores the userId during enrollment
            Long userId = null;
            if (externalImageId != null && !externalImageId.isEmpty()) {
                try {
                    userId = Long.parseLong(externalImageId);
                } catch (NumberFormatException e) {
                    log.warn("Could not parse userId from ExternalImageId: {}", externalImageId);
                }
            }

            log.info("Face verified. externalFaceId: {}, userId: {}, confidence: {}",
                    externalFaceId, userId, confidence);

            return new FaceVerifyResult(
                    externalFaceId,
                    userId,
                    confidence,
                    "aws",
                    true
            );

        } catch (InvalidImageFormatException e) {
            log.error("Invalid image format for face verification", e);
            throw new RuntimeException("Invalid image format. Please upload a valid JPEG or PNG image.", e);
        } catch (InvalidParameterException e) {
            log.error("No face detected in verification image", e);
            return new FaceVerifyResult(null, null, 0.0f, "aws", false);
        } catch (Exception e) {
            log.error("Face verification failed", e);
            throw new RuntimeException("Face verification failed: " + e.getMessage(), e);
        }
    }

    /**
     * Delete a face from the Rekognition collection.
     *
     * @param externalFaceId The AWS Rekognition FaceId to delete
     * @return true if deleted successfully
     */
    @Override
    public boolean deleteFace(String externalFaceId) {
        log.info("Deleting face: {} from collection: {}", externalFaceId, awsProperties.getCollectionId());

        try {
            DeleteFacesRequest request = DeleteFacesRequest.builder()
                    .collectionId(awsProperties.getCollectionId())
                    .faceIds(externalFaceId)
                    .build();

            DeleteFacesResponse response = rekognitionClient.deleteFaces(request);

            boolean deleted = !response.deletedFaces().isEmpty();
            log.info("Face deletion result: {} for externalFaceId: {}", deleted, externalFaceId);
            return deleted;

        } catch (Exception e) {
            log.error("Failed to delete face: {}", externalFaceId, e);
            throw new RuntimeException("Face deletion failed: " + e.getMessage(), e);
        }
    }

    /**
     * Update a face by deleting the old one and re-indexing.
     *
     * AWS Rekognition does not support in-place updates.
     * The flow is: delete old face → index new face.
     *
     * @param imageBytes    The new face image as byte array
     * @param externalFaceId The old AWS Rekognition FaceId to replace
     * @return FaceUpdateResult with new externalFaceId, collectionId, confidence, provider
     */
    @Override
    public FaceUpdateResult updateFace(byte[] imageBytes, String externalFaceId) {
        log.info("Updating face: {} in collection: {}", externalFaceId, awsProperties.getCollectionId());

        // Delete old face
        boolean deleted = deleteFace(externalFaceId);
        if (!deleted) {
            log.warn("Old face not found for deletion: {}. Proceeding with new enrollment.", externalFaceId);
        }

        // Extract userId from the old face before deletion (if needed)
        // For update, we need to know the userId — this should be passed by the caller
        // The new enrollment will use the same userId stored in the enrollment record
        try {
            // Index the new face - use externalFaceId as a placeholder for userId
            // The caller (FaceEnrollmentService) will handle userId lookup
            IndexFacesRequest request = IndexFacesRequest.builder()
                    .collectionId(awsProperties.getCollectionId())
                    .image(Image.builder()
                            .bytes(SdkBytes.fromByteArray(imageBytes))
                            .build())
                    .externalImageId(externalFaceId) // Will be updated by caller
                    .maxFaces(1)
                    .qualityFilter(QualityFilter.AUTO)
                    .detectionAttributes(Attribute.DEFAULT)
                    .build();

            IndexFacesResponse response = rekognitionClient.indexFaces(request);

            if (response.faceRecords().isEmpty()) {
                throw new RuntimeException("No face detected in the new image.");
            }

            FaceRecord faceRecord = response.faceRecords().get(0);
            String newExternalFaceId = faceRecord.face().faceId();
            float confidence = faceRecord.face().confidence();

            log.info("Face updated. Old: {}, New: {}, confidence: {}", externalFaceId, newExternalFaceId, confidence);

            return new FaceUpdateResult(
                    newExternalFaceId,
                    awsProperties.getCollectionId(),
                    confidence,
                    "aws"
            );

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to update face: {}", externalFaceId, e);
            throw new RuntimeException("Face update failed: " + e.getMessage(), e);
        }
    }

    /**
     * Ensure the Rekognition collection exists. Create it if it doesn't.
     */
    private void ensureCollectionExists() {
        try {
            DescribeCollectionRequest request = DescribeCollectionRequest.builder()
                    .collectionId(awsProperties.getCollectionId())
                    .build();
            rekognitionClient.describeCollection(request);
            log.info("Rekognition collection '{}' already exists.", awsProperties.getCollectionId());
        } catch (ResourceNotFoundException e) {
            log.info("Creating Rekognition collection: {}", awsProperties.getCollectionId());
            CreateCollectionRequest createRequest = CreateCollectionRequest.builder()
                    .collectionId(awsProperties.getCollectionId())
                    .build();
            CreateCollectionResponse createResponse = rekognitionClient.createCollection(createRequest);
            log.info("Collection created. ARN: {}", createResponse.collectionArn());
        } catch (Exception e) {
            log.error("Failed to check/create Rekognition collection", e);
            throw new RuntimeException("Failed to initialize Rekognition collection: " + e.getMessage(), e);
        }
    }
}