-- V4: Create plate_verification_logs table for ANPR
CREATE TABLE IF NOT EXISTS plate_verification_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    detected_plate VARCHAR(50) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    matched_vehicle_id BIGINT,
    image_path VARCHAR(500),
    ai_response_raw TEXT,
    processing_time_ms DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_plate_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_plate_log_vehicle FOREIGN KEY (matched_vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

CREATE INDEX idx_plate_verification_user_id ON plate_verification_logs(user_id);
CREATE INDEX idx_plate_verification_created_at ON plate_verification_logs(created_at);
CREATE INDEX idx_plate_verification_verified ON plate_verification_logs(verified);
CREATE INDEX idx_plate_verification_detected_plate ON plate_verification_logs(detected_plate);