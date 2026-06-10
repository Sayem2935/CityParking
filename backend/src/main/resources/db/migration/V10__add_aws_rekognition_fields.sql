-- =============================================================
-- V10: Add AWS Rekognition fields to face_enrollments table
-- Phase 2: Database Migration for AWS Rekognition Architecture
-- =============================================================

-- Add AWS Rekognition provider fields to face_enrollments
ALTER TABLE face_enrollments ADD COLUMN IF NOT EXISTS external_face_id VARCHAR(255);
ALTER TABLE face_enrollments ADD COLUMN IF NOT EXISTS collection_id VARCHAR(255);
ALTER TABLE face_enrollments ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'mock';
ALTER TABLE face_enrollments ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION;

-- Add additional fields referenced by FaceEnrollment JPA entity
ALTER TABLE face_enrollments ADD COLUMN IF NOT EXISTS processing_attempts INTEGER DEFAULT 0;
ALTER TABLE face_enrollments ADD COLUMN IF NOT EXISTS error_message VARCHAR(1000);
ALTER TABLE face_enrollments ADD COLUMN IF NOT EXISTS image_path VARCHAR(500);

-- Create index for fast face lookups by external_face_id
CREATE INDEX IF NOT EXISTS idx_face_enrollments_external_face_id ON face_enrollments(external_face_id);
CREATE INDEX IF NOT EXISTS idx_face_enrollments_provider ON face_enrollments(provider);
CREATE INDEX IF NOT EXISTS idx_face_enrollments_collection_id ON face_enrollments(collection_id);

-- Note: face_embeddings table (V3) becomes obsolete after AWS migration is verified.
-- It will be dropped in V11.