package com.cityparking.backend.repository;

import com.cityparking.backend.entity.FaceEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface FaceEmbeddingRepository extends JpaRepository<FaceEmbedding, Long> {

    /**
     * Find the active embedding for a specific user.
     */
    Optional<FaceEmbedding> findByUserIdAndStatus(Long userId, String status);

    /**
     * Find all active embeddings (for loading into cache).
     */
    List<FaceEmbedding> findAllByStatus(String status);

    /**
     * Find embedding by enrollment ID.
     */
    Optional<FaceEmbedding> findByEnrollmentId(Long enrollmentId);

    /**
     * Find all embeddings for a user (regardless of status).
     */
    List<FaceEmbedding> findByUserId(Long userId);

    /**
     * Supersede (deactivate) all active embeddings for a user.
     * Called before inserting a new enrollment embedding.
     */
    @Transactional
    @Modifying
    @Query("UPDATE FaceEmbedding fe SET fe.status = 'SUPERSEDED' WHERE fe.userId = :userId AND fe.status = 'ACTIVE'")
    int supersedePreviousEmbeddings(@Param("userId") Long userId);

    /**
     * Count active embeddings in the system (for health/stats).
     */
    @Query("SELECT COUNT(fe) FROM FaceEmbedding fe WHERE fe.status = 'ACTIVE'")
    long countActiveEmbeddings();

    /**
     * Find all active embeddings for a user (multi-embedding gallery).
     * Used during verification to load the user's full embedding gallery.
     */
    List<FaceEmbedding> findAllByUserIdAndStatus(Long userId, String status);

    /**
     * Count active embeddings for a specific user.
     */
    long countByUserIdAndStatus(Long userId, String status);

    /**
     * Find embeddings by enrollment session.
     */
    List<FaceEmbedding> findBySessionId(Long sessionId);

    /**
     * Supersede embeddings from a specific session.
     */
    @Transactional
    @Modifying
    @Query("UPDATE FaceEmbedding fe SET fe.status = 'SUPERSEDED' WHERE fe.session.id = :sessionId AND fe.status = 'ACTIVE'")
    int supersedeSessionEmbeddings(@Param("sessionId") Long sessionId);
}
