-- ============================================================================
-- V6: Database Reliability Sprint
-- Addresses: DB-1, DB-2, DB-3, DB-4, DB-5
-- Requirements: Audit trail preservation, FK integrity, indexing, 
--               duplicate prevention, data validation, cascade review
-- ============================================================================

-- ============================================================================
-- DB-1: PRESERVE AUDIT TRAIL
-- Change ON DELETE SET NULL to ON DELETE NO ACTION on audit tables.
-- Deleting a user must NOT silently nullify their access/security history.
-- ============================================================================

-- access_logs: user reference
ALTER TABLE access_logs DROP CONSTRAINT IF EXISTS fk_access_logs_user;
ALTER TABLE access_logs ADD CONSTRAINT fk_access_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION;

-- access_logs: vehicle reference
ALTER TABLE access_logs DROP CONSTRAINT IF EXISTS fk_access_logs_vehicle;
ALTER TABLE access_logs ADD CONSTRAINT fk_access_logs_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE NO ACTION;

-- security_events: user reference
ALTER TABLE security_events DROP CONSTRAINT IF EXISTS fk_security_events_user;
ALTER TABLE security_events ADD CONSTRAINT fk_security_events_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION;

-- security_events: vehicle reference
ALTER TABLE security_events DROP CONSTRAINT IF EXISTS fk_security_events_vehicle;
ALTER TABLE security_events ADD CONSTRAINT fk_security_events_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE NO ACTION;

-- security_events: access_log reference (keep NO ACTION to prevent log deletion)
ALTER TABLE security_events DROP CONSTRAINT IF EXISTS fk_security_events_access_log;
ALTER TABLE security_events ADD CONSTRAINT fk_security_events_access_log
    FOREIGN KEY (access_log_id) REFERENCES access_logs(id) ON DELETE NO ACTION;

-- security_events: resolved_by user reference
ALTER TABLE security_events DROP CONSTRAINT IF EXISTS fk_security_events_resolved_by;
ALTER TABLE security_events ADD CONSTRAINT fk_security_events_resolved_by
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE NO ACTION;

-- Add soft-delete support for users to preserve audit trail
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN users.deleted_at IS 'Soft-delete timestamp. Non-null means user is deactivated. Audit records retain user_id FK.'; 


-- ============================================================================
-- DB-3: FIX PLATE VERIFICATION LOG CASCADE
-- Change ON DELETE CASCADE to ON DELETE NO ACTION.
-- Deleting a user must NOT destroy their verification history.
-- ============================================================================

-- plate_verification_logs: user reference
ALTER TABLE plate_verification_logs DROP CONSTRAINT IF EXISTS fk_plate_log_user;
ALTER TABLE plate_verification_logs ADD CONSTRAINT fk_plate_log_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION;

-- plate_verification_logs: vehicle reference (already SET NULL, keep as-is for matched_vehicle_id)
-- This is acceptable because matched_vehicle_id is a soft link to a detected vehicle,
-- not the primary audit subject.


-- ============================================================================
-- DB-2: DATA VALIDATION — Embedding vector integrity
-- Ensure embedding_vector is non-empty at the DB level.
-- ============================================================================

ALTER TABLE face_embeddings
    ADD CONSTRAINT chk_embedding_vector_not_empty
    CHECK (LENGTH(TRIM(embedding_vector)) > 0);


-- ============================================================================
-- DB-4: PREVENT DUPLICATE ENROLLMENTS
-- Partial unique index: a user may only have ONE enrollment with status ENROLLED.
-- Multiple PENDING/FAILED records are allowed (retry flow).
-- ============================================================================

CREATE UNIQUE INDEX idx_face_enrollments_user_active
    ON face_enrollments(user_id)
    WHERE status = 'ENROLLED';


-- ============================================================================
-- DB-5: ADD MISSING INDEXES — Composite & covering indexes for common queries
-- ============================================================================

-- Composite index: access_logs by user + time (dashboard/history queries)
CREATE INDEX IF NOT EXISTS idx_access_logs_user_created
    ON access_logs(user_id, created_at);

-- Composite index: security_events by user + time (audit queries)
CREATE INDEX IF NOT EXISTS idx_security_events_user_created
    ON security_events(user_id, created_at);

-- Composite index: plate_verification_logs by user + time
CREATE INDEX IF NOT EXISTS idx_plate_verification_user_created
    ON plate_verification_logs(user_id, created_at);

-- Composite index: face_enrollments by user + status (enrollment lookups)
CREATE INDEX IF NOT EXISTS idx_face_enrollments_user_status
    ON face_enrollments(user_id, status);

-- License plate lookup (plate verification matching)
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate
    ON vehicles(license_plate);

-- Access logs: decision + time (reporting/dashboard queries)
CREATE INDEX IF NOT EXISTS idx_access_logs_decision_created
    ON access_logs(decision, created_at);

-- Partial index: unresolved security events (operator dashboard)
CREATE INDEX IF NOT EXISTS idx_security_events_unresolved
    ON security_events(severity, created_at)
    WHERE resolved = FALSE;


-- ============================================================================
-- ADDITIONAL DATA VALIDATION CONSTRAINTS
-- ============================================================================

-- Vehicle year range
ALTER TABLE vehicles
    ADD CONSTRAINT chk_vehicle_year
    CHECK (year >= 1900 AND year <= 2100);

-- User role enum
ALTER TABLE users
    ADD CONSTRAINT chk_user_role
    CHECK (role IN ('USER', 'ADMIN'));

-- Enrollment status enum
ALTER TABLE face_enrollments
    ADD CONSTRAINT chk_enrollment_status
    CHECK (status IN ('PENDING', 'PROCESSING', 'ENROLLED', 'FAILED'));

-- Access decision enum
ALTER TABLE access_logs
    ADD CONSTRAINT chk_access_decision
    CHECK (decision IN ('ACCESS_GRANTED', 'ACCESS_DENIED', 'SECURITY_ALERT'));

-- Security event severity enum
ALTER TABLE security_events
    ADD CONSTRAINT chk_severity
    CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

-- Security event type enum
ALTER TABLE security_events
    ADD CONSTRAINT chk_event_type
    CHECK (event_type IN ('FACE_MISMATCH', 'PLATE_MISMATCH', 'MULTIPLE_FACES', 'MULTIPLE_PLATES'));

-- Confidence value ranges (0.0 to 1.0)
ALTER TABLE plate_verification_logs
    ADD CONSTRAINT chk_plate_confidence_range
    CHECK (confidence >= 0.0 AND confidence <= 1.0);

ALTER TABLE access_logs
    ADD CONSTRAINT chk_access_face_confidence
    CHECK (face_confidence IS NULL OR (face_confidence >= 0.0 AND face_confidence <= 1.0));

ALTER TABLE access_logs
    ADD CONSTRAINT chk_access_plate_confidence
    CHECK (plate_confidence IS NULL OR (plate_confidence >= 0.0 AND plate_confidence <= 1.0));

-- Video size must be positive if provided
ALTER TABLE face_enrollments
    ADD CONSTRAINT chk_video_size_positive
    CHECK (video_size IS NULL OR video_size > 0);

-- Duration must be positive if provided
ALTER TABLE face_enrollments
    ADD CONSTRAINT chk_duration_positive
    CHECK (duration_seconds IS NULL OR duration_seconds > 0);

-- Processing time must be positive if provided
ALTER TABLE plate_verification_logs
    ADD CONSTRAINT chk_plate_processing_time
    CHECK (processing_time_ms IS NULL OR processing_time_ms >= 0);

ALTER TABLE access_logs
    ADD CONSTRAINT chk_access_processing_time
    CHECK (processing_time_ms IS NULL OR processing_time_ms >= 0);


-- ============================================================================
-- MIGRATION SAFETY: Add table comments for documentation
-- ============================================================================

COMMENT ON TABLE face_enrollments IS 'Face enrollment records. Unique constraint ensures only one ENROLLED record per user.';
COMMENT ON TABLE face_embeddings IS 'AI-generated face embeddings. Vector stored as TEXT with CHECK constraint for non-empty validation.';
COMMENT ON TABLE plate_verification_logs IS 'ANPR verification audit trail. Cascade changed to NO ACTION to preserve records.';
COMMENT ON COLUMN users.deleted_at IS 'Soft-delete timestamp. Used instead of hard DELETE to preserve foreign key integrity in audit tables.';