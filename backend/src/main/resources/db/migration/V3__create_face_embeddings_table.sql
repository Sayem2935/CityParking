-- Face Embeddings table for storing AI-generated face embeddings
CREATE TABLE IF NOT EXISTS face_embeddings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrollment_id BIGINT NOT NULL REFERENCES face_enrollments(id) ON DELETE CASCADE,
    embedding_vector TEXT NOT NULL,
    model_name VARCHAR(100) NOT NULL DEFAULT 'buffalo_l',
    faces_detected INTEGER,
    embedding_count INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX idx_face_embeddings_user_id ON face_embeddings(user_id);
CREATE INDEX idx_face_embeddings_enrollment_id ON face_embeddings(enrollment_id);