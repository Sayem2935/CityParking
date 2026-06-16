package com.cityparking.backend.service;

import com.cityparking.backend.entity.FaceEmbedding;
import com.cityparking.backend.repository.FaceEmbeddingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service for managing and querying user embedding galleries.
 *
 * Handles the multi-embedding verification workflow:
 *   1. Load user's active embedding gallery from DB
 *   2. Parse embedding strings to float arrays
 *   3. Compute cosine similarity (probe vs gallery)
 *   4. Return max similarity with matched embedding metadata
 */
@Service
public class EmbeddingGalleryService {

    private static final Logger log = LoggerFactory.getLogger(EmbeddingGalleryService.class);

    private final FaceEmbeddingRepository faceEmbeddingRepository;

    public EmbeddingGalleryService(FaceEmbeddingRepository faceEmbeddingRepository) {
        this.faceEmbeddingRepository = faceEmbeddingRepository;
    }

    /**
     * Load all active embeddings for a user.
     *
     * @param userId The user ID
     * @return List of active FaceEmbedding entities
     */
    @Transactional(readOnly = true)
    public List<FaceEmbedding> getActiveGallery(Long userId) {
        return faceEmbeddingRepository.findAllByUserIdAndStatus(userId, "ACTIVE");
    }

    /**
     * Match a probe embedding against a user's gallery.
     * Returns the maximum cosine similarity across all gallery embeddings.
     *
     * @param probeVector 512-d probe embedding (float array)
     * @param userId      User ID to match against
     * @return GalleryMatchResult with match details
     */
    @Transactional(readOnly = true)
    public GalleryMatchResult matchAgainstGallery(float[] probeVector, Long userId) {
        List<FaceEmbedding> gallery = getActiveGallery(userId);

        if (gallery.isEmpty()) {
            log.info("No active embeddings found for user {}", userId);
            return GalleryMatchResult.noMatch();
        }

        float maxSimilarity = -1.0f;
        Long matchedEmbeddingId = null;
        String matchedPoseLabel = null;
        int embeddingsCompared = 0;

        for (FaceEmbedding embedding : gallery) {
            float[] galleryVector = embedding.getEmbeddingVector();
            if (galleryVector.length == 0) {
                continue;
            }

            float similarity = cosineSimilarity(probeVector, galleryVector);
            embeddingsCompared++;

            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                matchedEmbeddingId = embedding.getId();
                matchedPoseLabel = embedding.getPoseLabel();
            }
        }

        log.info(
                "Gallery match for user {}: maxSim={:.4f}, embeddings={}, bestPose={}",
                userId, maxSimilarity, embeddingsCompared, matchedPoseLabel
        );

        return GalleryMatchResult.builder()
                .maxSimilarity(maxSimilarity)
                .matchedEmbeddingId(matchedEmbeddingId)
                .matchedPoseLabel(matchedPoseLabel)
                .embeddingsCompared(embeddingsCompared)
                .build();
    }

    /**
     * Count active embeddings for a user.
     */
    @Transactional(readOnly = true)
    public long countActiveEmbeddings(Long userId) {
        return faceEmbeddingRepository.countByUserIdAndStatus(userId, "ACTIVE");
    }

    /**
     * Compute cosine similarity between two vectors.
     * For L2-normalized vectors, this is equivalent to the dot product.
     */
    public static float cosineSimilarity(float[] a, float[] b) {
        if (a.length != b.length || a.length == 0) {
            return 0.0f;
        }

        float dot = 0.0f;
        float normA = 0.0f;
        float normB = 0.0f;

        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        normA = (float) Math.sqrt(normA);
        normB = (float) Math.sqrt(normB);

        if (normA < 1e-8f || normB < 1e-8f) {
            return 0.0f;
        }

        return dot / (normA * normB);
    }

    /**
     * Result of matching a probe against a user's embedding gallery.
     */
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class GalleryMatchResult {
        private float maxSimilarity;
        private Long matchedEmbeddingId;
        private String matchedPoseLabel;
        private int embeddingsCompared;

        public static GalleryMatchResult noMatch() {
            return GalleryMatchResult.builder()
                    .maxSimilarity(0.0f)
                    .embeddingsCompared(0)
                    .build();
        }
    }
}
