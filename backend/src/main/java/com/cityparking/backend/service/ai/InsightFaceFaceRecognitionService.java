package com.cityparking.backend.service.ai;

import com.cityparking.backend.config.InsightFaceProperties;
import com.cityparking.backend.entity.FaceEmbedding;
import com.cityparking.backend.entity.FaceEnrollment;
import com.cityparking.backend.entity.User;
import com.cityparking.backend.repository.FaceEmbeddingRepository;
import com.cityparking.backend.repository.FaceEnrollmentRepository;
import com.cityparking.backend.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Production FaceRecognitionService implementation using InsightFace via FastAPI.
 *
 * Architecture:
 *   Spring Boot ──HTTP/REST──> FastAPI (InsightFace) ──ONNX Runtime──> RetinaFace + ArcFace
 *
 * Embedding flow:
 *   1. Spring sends image bytes to FastAPI
 *   2. FastAPI returns 512-d normalized ArcFace embedding
 *   3. Spring stores embedding in PostgreSQL (face_embeddings table)
 *   4. For verification, Spring compares probe embedding vs all cached embeddings
 *
 * In-memory cache:
 *   ConcurrentHashMap<userId, float[]> loaded at startup and refreshed periodically.
 *   Cosine similarity computed in-memory for sub-millisecond matching.
 *
 * Activated when: ai.provider.face=insightface
 */
@Service
@ConditionalOnProperty(name = "ai.provider.face", havingValue = "insightface")
public class InsightFaceFaceRecognitionService implements FaceRecognitionService {

    private static final Logger log = LoggerFactory.getLogger(InsightFaceFaceRecognitionService.class);

    private final InsightFaceProperties properties;
    private final WebClient webClient;
    private final FaceEmbeddingRepository embeddingRepository;
    private final FaceEnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    /** In-memory cache: userId → normalized 512-d embedding vector. */
    private final ConcurrentHashMap<Long, float[]> embeddingCache = new ConcurrentHashMap<>();

    public InsightFaceFaceRecognitionService(
            InsightFaceProperties properties,
            FaceEmbeddingRepository embeddingRepository,
            FaceEnrollmentRepository enrollmentRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this.properties = properties;
        this.embeddingRepository = embeddingRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;

        this.webClient = WebClient.builder()
                .baseUrl(properties.getBaseUrl())
                .build();
    }

    @PostConstruct
    public void init() {
        log.info("Initializing InsightFace service. FastAPI URL: {}", properties.getBaseUrl());
        log.info("Similarity threshold: {}", properties.getSimilarityThreshold());
        loadEmbeddingCache();
    }

    // ── FaceRecognitionService interface methods ─────────────

    @Override
    public FaceEnrollmentResult enrollFace(Long userId, byte[] imageData) {
        log.info("Enrolling face via InsightFace for userId: {}", userId);

        try {
            // Call FastAPI /face/enroll
            JsonNode response = callFastApiEnroll(imageData, userId);

            if (!response.path("success").asBoolean(false)) {
                String error = response.path("error").asText("unknown");
                String message = response.path("message").asText("Enrollment failed");
                log.warn("InsightFace enrollment failed for userId {}: {} - {}", userId, error, message);
                return new FaceEnrollmentResult(userId, null, false, message);
            }

            // Extract embedding
            float[] embedding = parseEmbedding(response.path("embedding"));
            double faceScore = response.path("face_score").asDouble(0.0);

            // Store embedding in database
            storeEmbedding(userId, embedding, faceScore, response);

            String faceId = "insightface-" + userId + "-" + System.currentTimeMillis();
            log.info("Face enrolled successfully for userId: {}, faceScore: {}", userId, faceScore);

            return new FaceEnrollmentResult(userId, faceId, true, "Face enrolled successfully via InsightFace");

        } catch (Exception e) {
            log.error("InsightFace enrollment failed for userId {}: {}", userId, e.getMessage(), e);
            return new FaceEnrollmentResult(userId, null, false, "Enrollment failed: " + e.getMessage());
        }
    }

    @Override
    public FaceVerificationResult verifyFace(Long userId, byte[] imageData) {
        log.info("Verifying face via InsightFace for userId: {}", userId);

        try {
            // Extract probe embedding from the verification image
            float[] probeEmbedding = extractEmbeddingFromFastApi(imageData);

            // Load the target embedding from cache
            float[] targetEmbedding = embeddingCache.get(userId);
            if (targetEmbedding == null) {
                // Try loading from DB (cache miss)
                Optional<FaceEmbedding> dbEmbedding =
                        embeddingRepository.findByUserIdAndStatus(userId, "ACTIVE");
                if (dbEmbedding.isPresent()) {
                    targetEmbedding = dbEmbedding.get().getEmbeddingVector();
                    embeddingCache.put(userId, targetEmbedding);
                } else {
                    log.warn("No active embedding found for userId: {}", userId);
                    return new FaceVerificationResult(false, userId, 0.0, "No face enrollment found for user");
                }
            }

            // Compute cosine similarity
            double similarity = cosineSimilarity(probeEmbedding, targetEmbedding);
            boolean verified = similarity >= properties.getSimilarityThreshold();

            log.info("Face verification for userId {}: similarity={}, verified={}",
                    userId, similarity, verified);

            return new FaceVerificationResult(
                    verified,
                    userId,
                    similarity,
                    verified ? "Face verified successfully" : "Face does not match enrollment"
            );

        } catch (Exception e) {
            log.error("Face verification failed for userId {}: {}", userId, e.getMessage(), e);
            return new FaceVerificationResult(false, userId, 0.0, "Verification failed: " + e.getMessage());
        }
    }

    @Override
    public FaceSearchResult searchFace(byte[] imageData) {
        log.info("Searching face across {} enrolled users", embeddingCache.size());

        try {
            // Extract probe embedding
            float[] probeEmbedding = extractEmbeddingFromFastApi(imageData);

            // Brute-force search against all cached embeddings
            Long bestUserId = null;
            double bestSimilarity = -1.0;
            String bestFaceId = null;

            for (Map.Entry<Long, float[]> entry : embeddingCache.entrySet()) {
                double similarity = cosineSimilarity(probeEmbedding, entry.getValue());
                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestUserId = entry.getKey();
                    bestFaceId = "insightface-" + entry.getKey();
                }
            }

            boolean matched = bestSimilarity >= properties.getSimilarityThreshold();

            if (matched) {
                log.info("Face search matched userId: {}, similarity: {}", bestUserId, bestSimilarity);
                return new FaceSearchResult(true, bestUserId, bestSimilarity, bestFaceId, "Face matched");
            } else {
                log.info("No face match found. Best similarity: {}", bestSimilarity);
                return new FaceSearchResult(false, null, bestSimilarity, null, "No matching face found");
            }

        } catch (Exception e) {
            log.error("Face search failed: {}", e.getMessage(), e);
            return new FaceSearchResult(false, null, 0.0, null, "Search failed: " + e.getMessage());
        }
    }

    // ── Cloud-style methods (called by FaceEnrollmentService) ─

    @Override
    public FaceEnrollResult enrollFace(byte[] imageBytes, Long userId) {
        log.info("enrollFace(byte[], Long) called for userId: {}", userId);

        try {
            JsonNode response = callFastApiEnroll(imageBytes, userId);

            if (!response.path("success").asBoolean(false)) {
                String message = response.path("message").asText("Enrollment failed");
                throw new RuntimeException(message);
            }

            float[] embedding = parseEmbedding(response.path("embedding"));
            double faceScore = response.path("face_score").asDouble(0.0);

            // Store embedding
            storeEmbedding(userId, embedding, faceScore, response);

            String faceId = "insightface-" + userId + "-" + System.currentTimeMillis();
            return new FaceEnrollResult(faceId, "local", (float) faceScore, "insightface");

        } catch (Exception e) {
            log.error("enrollFace failed for userId {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Face enrollment failed: " + e.getMessage(), e);
        }
    }

    @Override
    public FaceVerifyResult verifyFace(byte[] imageBytes) {
        log.info("verifyFace(byte[]) called — performing 1:N search");

        try {
            float[] probeEmbedding = extractEmbeddingFromFastApi(imageBytes);

            Long bestUserId = null;
            float bestSimilarity = -1.0f;
            String bestFaceId = null;

            for (Map.Entry<Long, float[]> entry : embeddingCache.entrySet()) {
                float similarity = (float) cosineSimilarity(probeEmbedding, entry.getValue());
                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestUserId = entry.getKey();
                    bestFaceId = "insightface-" + entry.getKey();
                }
            }

            boolean matched = bestSimilarity >= properties.getSimilarityThreshold();

            if (matched) {
                log.info("Face verified. userId: {}, similarity: {}", bestUserId, bestSimilarity);
                return new FaceVerifyResult(bestFaceId, bestUserId, bestSimilarity, "insightface", true);
            } else {
                log.info("No face match. Best similarity: {}", bestSimilarity);
                return new FaceVerifyResult(null, null, bestSimilarity, "insightface", false);
            }

        } catch (Exception e) {
            log.error("verifyFace failed: {}", e.getMessage(), e);
            throw new RuntimeException("Face verification failed: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean deleteFace(String externalFaceId) {
        log.info("Deleting face: {}", externalFaceId);
        // Extract userId from faceId format: "insightface-{userId}-{timestamp}"
        try {
            if (externalFaceId != null && externalFaceId.startsWith("insightface-")) {
                String[] parts = externalFaceId.split("-");
                if (parts.length >= 2) {
                    Long userId = Long.parseLong(parts[1]);
                    embeddingRepository.supersedePreviousEmbeddings(userId);
                    embeddingCache.remove(userId);
                    log.info("Face deleted for userId: {}", userId);
                    return true;
                }
            }
        } catch (Exception e) {
            log.error("Failed to delete face {}: {}", externalFaceId, e.getMessage());
        }
        return false;
    }

    @Override
    public FaceUpdateResult updateFace(byte[] imageBytes, String externalFaceId) {
        log.info("Updating face: {}", externalFaceId);
        // Delete old, enroll new
        deleteFace(externalFaceId);
        // We don't have userId here — caller handles re-enrollment
        return new FaceUpdateResult(null, "local", 0.0f, "insightface");
    }

    // ── FastAPI communication ───────────────────────────────

    private JsonNode callFastApiEnroll(byte[] imageBytes, Long userId) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("image", new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() {
                return "face.jpg";
            }
        }).contentType(MediaType.IMAGE_JPEG);
        builder.part("user_id", userId.toString());

        String responseBody = webClient.post()
                .uri("/face/enroll")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofMillis(properties.getReadTimeoutMs()))
                .block();

        try {
            return objectMapper.readTree(responseBody);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse FastAPI response", e);
        }
    }

    private float[] extractEmbeddingFromFastApi(byte[] imageBytes) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("image", new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() {
                return "face.jpg";
            }
        }).contentType(MediaType.IMAGE_JPEG);

        String responseBody = webClient.post()
                .uri("/face/extract-embedding")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofMillis(properties.getReadTimeoutMs()))
                .block();

        try {
            JsonNode response = objectMapper.readTree(responseBody);
            if (!response.path("success").asBoolean(false)) {
                String message = response.path("message").asText("Embedding extraction failed");
                throw new RuntimeException(message);
            }
            return parseEmbedding(response.path("embedding"));
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse embedding response", e);
        }
    }

    // ── Embedding storage ───────────────────────────────────

    @Transactional
    protected void storeEmbedding(Long userId, float[] embedding, double faceScore, JsonNode response) {
        // Supersede any previous active embeddings for this user
        int superseded = embeddingRepository.supersedePreviousEmbeddings(userId);
        if (superseded > 0) {
            log.info("Superseded {} previous embeddings for userId: {}", superseded, userId);
        }

        // Find the latest enrollment for this user
        Optional<FaceEnrollment> enrollment =
                enrollmentRepository.findFirstByUserIdOrderByCreatedAtDesc(userId);
        if (enrollment.isEmpty()) {
            log.warn("No enrollment found for userId: {} — embedding stored without enrollment link", userId);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        // Create new embedding record
        FaceEmbedding faceEmbedding = FaceEmbedding.builder()
                .user(user)
                .enrollment(enrollment.orElse(null))
                .faceScore(faceScore)
                .status("ACTIVE")
                .build();

        faceEmbedding.setEmbeddingVector(embedding);

        // Parse bbox if available
        if (response.has("bbox") && response.path("bbox").isArray()) {
            JsonNode bbox = response.path("bbox");
            if (bbox.size() >= 4) {
                faceEmbedding.setBboxX(bbox.get(0).asInt());
                faceEmbedding.setBboxY(bbox.get(1).asInt());
                faceEmbedding.setBboxW(bbox.get(2).asInt());
                faceEmbedding.setBboxH(bbox.get(3).asInt());
            }
        }

        embeddingRepository.save(faceEmbedding);

        // Update in-memory cache
        embeddingCache.put(userId, embedding);

        log.info("Embedding stored for userId: {}, dimensions: {}", userId, embedding.length);
    }

    // ── Cache management ────────────────────────────────────

    /**
     * Load all active embeddings into the in-memory cache.
     * Called at startup and periodically refreshed.
     */
    public void loadEmbeddingCache() {
        try {
            List<FaceEmbedding> activeEmbeddings = embeddingRepository.findAllByStatus("ACTIVE");
            embeddingCache.clear();
            for (FaceEmbedding fe : activeEmbeddings) {
                float[] vector = fe.getEmbeddingVector();
                if (vector.length == 512) {
                    embeddingCache.put(fe.getUserId(), vector);
                }
            }
            log.info("Embedding cache loaded: {} active embeddings", embeddingCache.size());
        } catch (Exception e) {
            log.error("Failed to load embedding cache: {}", e.getMessage(), e);
        }
    }

    /**
     * Periodic cache refresh.
     */
    @Scheduled(fixedDelayString = "${insightface.cache-refresh-interval-ms:300000}")
    public void refreshEmbeddingCache() {
        log.debug("Refreshing embedding cache...");
        loadEmbeddingCache();
    }

    // ── Math ────────────────────────────────────────────────

    /**
     * Compute cosine similarity between two vectors.
     * For L2-normalized vectors (ArcFace embeddings), this equals the dot product.
     */
    private static double cosineSimilarity(float[] a, float[] b) {
        if (a.length != b.length) return 0.0;

        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (int i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA == 0 || normB == 0) return 0.0;

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private float[] parseEmbedding(JsonNode embeddingNode) {
        if (embeddingNode == null || !embeddingNode.isArray()) {
            throw new RuntimeException("Invalid embedding format in FastAPI response");
        }
        float[] embedding = new float[embeddingNode.size()];
        for (int i = 0; i < embeddingNode.size(); i++) {
            embedding[i] = (float) embeddingNode.get(i).asDouble();
        }
        return embedding;
    }
}
