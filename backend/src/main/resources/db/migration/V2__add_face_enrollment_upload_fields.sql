-- Add video upload fields to face_enrollments table
ALTER TABLE face_enrollments ADD COLUMN IF NOT EXISTS video_path VARCHAR(500);
ALTER TABLE face_enrollments ADD COLUMN IF NOT EXISTS video_size BIGINT;
ALTER TABLE face_enrollments ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE face_enrollments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP;
