-- Sprint 9: Dual Verification & Access Decision Engine
-- Creates tables for access logs and security events

-- Access decision enum values: ACCESS_GRANTED, ACCESS_DENIED, SECURITY_ALERT

CREATE TABLE access_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    vehicle_id BIGINT,
    decision VARCHAR(30) NOT NULL,
    face_verified BOOLEAN NOT NULL DEFAULT FALSE,
    plate_verified BOOLEAN NOT NULL DEFAULT FALSE,
    face_confidence DOUBLE PRECISION,
    plate_confidence DOUBLE PRECISION,
    detected_plate VARCHAR(50),
    face_message VARCHAR(500),
    plate_message VARCHAR(500),
    processing_time_ms DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_access_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_access_logs_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_vehicle_id ON access_logs(vehicle_id);
CREATE INDEX idx_access_logs_decision ON access_logs(decision);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);

COMMENT ON TABLE access_logs IS 'Stores all access verification attempts with dual face+plate results';
COMMENT ON COLUMN access_logs.decision IS 'ACCESS_GRANTED, ACCESS_DENIED, or SECURITY_ALERT';

CREATE TABLE security_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'HIGH',
    user_id BIGINT,
    vehicle_id BIGINT,
    access_log_id BIGINT,
    description TEXT NOT NULL,
    face_confidence DOUBLE PRECISION,
    plate_confidence DOUBLE PRECISION,
    detected_plate VARCHAR(50),
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by BIGINT,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_security_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_security_events_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    CONSTRAINT fk_security_events_access_log FOREIGN KEY (access_log_id) REFERENCES access_logs(id) ON DELETE SET NULL,
    CONSTRAINT fk_security_events_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_resolved ON security_events(resolved);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);

COMMENT ON TABLE security_events IS 'Stores security alerts triggered during access verification';
COMMENT ON COLUMN security_events.event_type IS 'FACE_MISMATCH, PLATE_MISMATCH, MULTIPLE_FACES, MULTIPLE_PLATES';
COMMENT ON COLUMN security_events.severity IS 'LOW, MEDIUM, HIGH, CRITICAL';