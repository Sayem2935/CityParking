-- V11: Drop face_embeddings table (embedding-based recognition removed)
-- AWS Rekognition now handles face storage via collection IDs

-- Drop the face_embeddings table created in V3
DROP TABLE IF EXISTS face_embeddings CASCADE;

-- Remove embedding-related columns from face_enrollments if they exist
ALTER TABLE face_enrollments DROP COLUMN IF EXISTS embedding_model CASCADE;
ALTER TABLE face_enrollments DROP COLUMN IF EXISTS embedding_version CASCADE;
ALTER TABLE face_enrollments DROP COLUMN IF EXISTS embedding_extracted_at CASCADE;