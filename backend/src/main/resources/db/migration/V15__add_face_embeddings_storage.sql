-- ============================================================
-- V15: Face Embeddings Storage for InsightFace/ArcFace
-- Replaces AWS Rekognition with local embedding-based recognition
-- ============================================================
-- This migration re-creates the face_embeddings table (dropped in V11)
-- for 512-d ArcFace embedding storage.
-- Note: pgvector extension is not available for PG16, so embedding
-- is stored as TEXT in pgvector-compatible format "[0.123,-0.456,...]"
-- ============================================================

-- Face embeddings table: stores 512-d ArcFace embeddings
CREATE TABLE IF NOT EXISTS face_embeddings (
    id                  BIGSERIAL           PRIMARY KEY,
    user_id             BIGINT              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrollment_id       BIGINT              NOT NULL REFERENCES face_enrollments(id) ON DELETE CASCADE,

    -- ArcFace 512-dimensional embedding vector stored as pgvector-compatible text
    -- Format: "[0.0123,-0.0456,...]"
    embedding           TEXT                NOT NULL,

    -- Model metadata
    model_name          VARCHAR(100)        NOT NULL DEFAULT 'w600k_r50',
    model_pack          VARCHAR(100)        NOT NULL DEFAULT 'buffalo_l',

    -- Face detection metadata from RetinaFace
    face_score          DOUBLE PRECISION,
    bbox_x              INTEGER,
    bbox_y              INTEGER,
    bbox_w              INTEGER,
    bbox_h              INTEGER,

    -- Status: ACTIVE, SUPERSEDED, DELETED
    status              VARCHAR(20)         NOT NULL DEFAULT 'ACTIVE',

    -- Timestamps
    created_at          TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_face_embeddings_v15_user_id
    ON face_embeddings(user_id);

CREATE INDEX IF NOT EXISTS idx_face_embeddings_v15_enrollment_id
    ON face_embeddings(enrollment_id);

CREATE INDEX IF NOT EXISTS idx_face_embeddings_v15_status
    ON face_embeddings(status);

CREATE INDEX IF NOT EXISTS idx_face_embeddings_v15_user_status
    ON face_embeddings(user_id, status);