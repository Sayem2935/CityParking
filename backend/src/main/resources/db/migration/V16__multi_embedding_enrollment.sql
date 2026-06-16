-- ============================================================
-- V16: Multi-Embedding Guided Enrollment System
-- Redesigns face enrollment from single-image to multi-pose
-- guided session with liveness detection
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. enrollment_sessions — Tracks each guided enrollment attempt
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollment_sessions (
    id                          BIGSERIAL       PRIMARY KEY,
    user_id                     BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Unique session identifier (UUID-based token)
    session_token               VARCHAR(64)     NOT NULL UNIQUE,

    -- Session status: INITIATED → CAPTURING → PROCESSING → COMPLETED / FAILED / EXPIRED
    status                      VARCHAR(20)     NOT NULL DEFAULT 'INITIATED',

    -- Capture statistics
    total_frames_captured       INTEGER         DEFAULT 0,
    quality_frames_accepted     INTEGER         DEFAULT 0,
    embeddings_generated        INTEGER         DEFAULT 0,
    embeddings_after_dedup      INTEGER         DEFAULT 0,

    -- Liveness result
    liveness_passed             BOOLEAN,
    liveness_score              DOUBLE PRECISION,

    -- Pose completion tracking (JSONB map: {"center": true, "left": true, ...})
    pose_completion             JSONB           DEFAULT '{}',

    -- Timing
    session_duration_seconds    DOUBLE PRECISION,

    -- Client metadata
    device_info                 VARCHAR(500),
    ip_address                  VARCHAR(45),

    -- Timestamps
    started_at                  TIMESTAMP,
    completed_at                TIMESTAMP,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enrollment_sessions_user_id
    ON enrollment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_sessions_status
    ON enrollment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_enrollment_sessions_token
    ON enrollment_sessions(session_token);

-- ────────────────────────────────────────────────────────────
-- 2. enrollment_frames — Individual frames from guided session
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollment_frames (
    id                  BIGSERIAL           PRIMARY KEY,
    session_id          BIGINT              NOT NULL REFERENCES enrollment_sessions(id) ON DELETE CASCADE,

    -- Frame ordering and pose association
    frame_index         INTEGER             NOT NULL,
    pose_label          VARCHAR(20)         NOT NULL,

    -- Quality metrics
    blur_score          DOUBLE PRECISION,
    face_score          DOUBLE PRECISION,

    -- Face bounding box
    bbox_x              INTEGER,
    bbox_y              INTEGER,
    bbox_w              INTEGER,
    bbox_h              INTEGER,

    -- 5-point landmarks as JSONB: [[x1,y1],[x2,y2],[x3,y3],[x4,y4],[x5,y5]]
    landmarks_5pt       JSONB,

    -- Processing flags
    passed_quality      BOOLEAN             DEFAULT FALSE,
    embedding_extracted BOOLEAN             DEFAULT FALSE,

    -- Frame storage path (temporary — deleted after embedding extraction)
    frame_path          VARCHAR(500),

    captured_at         TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enrollment_frames_session_id
    ON enrollment_frames(session_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_frames_pose
    ON enrollment_frames(session_id, pose_label);

-- ────────────────────────────────────────────────────────────
-- 3. liveness_challenges — Liveness detection evidence
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS liveness_challenges (
    id                  BIGSERIAL           PRIMARY KEY,
    session_id          BIGINT              NOT NULL REFERENCES enrollment_sessions(id) ON DELETE CASCADE,

    -- Challenge type: BLINK, TEXTURE_ANALYSIS, DEPTH_MAP, FRAME_DIFF, HEAD_MOTION
    challenge_type      VARCHAR(30)         NOT NULL,

    -- Result
    passed              BOOLEAN             NOT NULL,
    confidence          DOUBLE PRECISION,

    -- Evidence metadata (type-specific JSONB)
    evidence            JSONB               DEFAULT '{}',

    challenged_at       TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_liveness_challenges_session_id
    ON liveness_challenges(session_id);

-- ────────────────────────────────────────────────────────────
-- 4. Enhance face_embeddings with pose and session metadata
-- ────────────────────────────────────────────────────────────
ALTER TABLE face_embeddings
    ADD COLUMN IF NOT EXISTS session_id  BIGINT REFERENCES enrollment_sessions(id) ON DELETE SET NULL;

ALTER TABLE face_embeddings
    ADD COLUMN IF NOT EXISTS pose_label  VARCHAR(20);

ALTER TABLE face_embeddings
    ADD COLUMN IF NOT EXISTS yaw         DOUBLE PRECISION;

ALTER TABLE face_embeddings
    ADD COLUMN IF NOT EXISTS pitch       DOUBLE PRECISION;

ALTER TABLE face_embeddings
    ADD COLUMN IF NOT EXISTS roll        DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_face_embeddings_session_id
    ON face_embeddings(session_id);
CREATE INDEX IF NOT EXISTS idx_face_embeddings_pose
    ON face_embeddings(user_id, pose_label);

-- ────────────────────────────────────────────────────────────
-- 5. Enhance users with enrollment metadata
-- ────────────────────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS face_enrolled        BOOLEAN DEFAULT FALSE;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS face_enrolled_at     TIMESTAMP;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS face_embedding_count INTEGER DEFAULT 0;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS active_session_id    BIGINT REFERENCES enrollment_sessions(id) ON DELETE SET NULL;
