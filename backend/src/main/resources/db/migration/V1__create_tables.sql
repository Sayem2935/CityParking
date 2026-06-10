-- AI Parking System Database Schema
-- Sprint 4: Backend Foundation

-- Users table
CREATE TABLE users (
    id              BIGSERIAL       PRIMARY KEY,
    first_name      VARCHAR(100)    NOT NULL,
    last_name       VARCHAR(100)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password        VARCHAR(255)    NOT NULL,
    phone           VARCHAR(20),
    avatar_url      VARCHAR(500),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    role            VARCHAR(20)     NOT NULL DEFAULT 'USER',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- Vehicles table
CREATE TABLE vehicles (
    id              BIGSERIAL       PRIMARY KEY,
    license_plate   VARCHAR(20)     NOT NULL,
    make            VARCHAR(100)    NOT NULL,
    model           VARCHAR(100)    NOT NULL,
    year            INTEGER         NOT NULL,
    color           VARCHAR(50),
    vehicle_type    VARCHAR(50),
    is_default      BOOLEAN         NOT NULL DEFAULT FALSE,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE UNIQUE INDEX idx_vehicles_user_plate ON vehicles(user_id, license_plate);

-- Face Enrollments table
CREATE TABLE face_enrollments (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_url       VARCHAR(500),
    status          VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    notes           VARCHAR(1000),
    enrolled_at     TIMESTAMP,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_face_enrollments_user_id ON face_enrollments(user_id);
CREATE INDEX idx_face_enrollments_status ON face_enrollments(status);