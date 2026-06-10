-- Sprint 10: Parking Slot Detection & Smart Slot Management
-- Creates tables for parking slots and parking assignments

-- Parking slot status enum values: FREE, OCCUPIED, RESERVED, MAINTENANCE
-- Assignment status values: ACTIVE, COMPLETED, CANCELLED

CREATE TABLE parking_slots (
    id BIGSERIAL PRIMARY KEY,
    slot_code VARCHAR(20) NOT NULL UNIQUE,
    slot_type VARCHAR(30) NOT NULL DEFAULT 'STANDARD',
    status VARCHAR(20) NOT NULL DEFAULT 'FREE',
    floor_number INTEGER NOT NULL DEFAULT 1,
    zone VARCHAR(10) NOT NULL DEFAULT 'A',
    coordinates_json TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parking_slots_status ON parking_slots(status);
CREATE INDEX idx_parking_slots_zone ON parking_slots(zone);
CREATE INDEX idx_parking_slots_floor ON parking_slots(floor_number);
CREATE INDEX idx_parking_slots_slot_code ON parking_slots(slot_code);

COMMENT ON TABLE parking_slots IS 'Parking slot definitions with location and status tracking';
COMMENT ON COLUMN parking_slots.status IS 'FREE, OCCUPIED, RESERVED, MAINTENANCE';
COMMENT ON COLUMN parking_slots.slot_type IS 'STANDARD, COMPACT, HANDICAPPED, EV_CHARGING, VIP';
COMMENT ON COLUMN parking_slots.coordinates_json IS 'JSON with x,y coordinates for heat map visualization';

CREATE TABLE parking_assignments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    vehicle_id BIGINT,
    slot_id BIGINT NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT fk_parking_assignments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_parking_assignments_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    CONSTRAINT fk_parking_assignments_slot FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE CASCADE
);

CREATE INDEX idx_parking_assignments_user_id ON parking_assignments(user_id);
CREATE INDEX idx_parking_assignments_vehicle_id ON parking_assignments(vehicle_id);
CREATE INDEX idx_parking_assignments_slot_id ON parking_assignments(slot_id);
CREATE INDEX idx_parking_assignments_status ON parking_assignments(status);
CREATE INDEX idx_parking_assignments_assigned_at ON parking_assignments(assigned_at);

COMMENT ON TABLE parking_assignments IS 'Tracks parking slot assignments to users/vehicles';
COMMENT ON COLUMN parking_assignments.status IS 'ACTIVE, COMPLETED, CANCELLED';

-- Create parking_scan_log table for occupancy history from AI detection
CREATE TABLE parking_scan_log (
    id BIGSERIAL PRIMARY KEY,
    total_slots INTEGER NOT NULL,
    occupied_slots INTEGER NOT NULL,
    free_slots INTEGER NOT NULL,
    detections_json TEXT,
    scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    occupied_detected INTEGER,
    scan_image_path VARCHAR(500),
    processing_time_ms DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parking_scan_log_created_at ON parking_scan_log(created_at);

COMMENT ON TABLE parking_scan_log IS 'History of parking occupancy scans from camera detection';

-- Seed initial parking slots: 3 floors, 3 zones (A, B, C), ~33 slots per zone per floor
-- Floor 1, Zone A: A01-A12
INSERT INTO parking_slots (slot_code, slot_type, floor_number, zone, coordinates_json) VALUES
('A01', 'STANDARD', 1, 'A', '{"x":10,"y":10}'),
('A02', 'STANDARD', 1, 'A', '{"x":10,"y":30}'),
('A03', 'STANDARD', 1, 'A', '{"x":10,"y":50}'),
('A04', 'STANDARD', 1, 'A', '{"x":10,"y":70}'),
('A05', 'COMPACT', 1, 'A', '{"x":10,"y":90}'),
('A06', 'COMPACT', 1, 'A', '{"x":10,"y":110}'),
('A07', 'STANDARD', 1, 'A', '{"x":30,"y":10}'),
('A08', 'STANDARD', 1, 'A', '{"x":30,"y":30}'),
('A09', 'HANDICAPPED', 1, 'A', '{"x":30,"y":50}'),
('A10', 'STANDARD', 1, 'A', '{"x":30,"y":70}'),
('A11', 'EV_CHARGING', 1, 'A', '{"x":30,"y":90}'),
('A12', 'STANDARD', 1, 'A', '{"x":30,"y":110}');

-- Floor 1, Zone B: B01-B12
INSERT INTO parking_slots (slot_code, slot_type, floor_number, zone, coordinates_json) VALUES
('B01', 'STANDARD', 1, 'B', '{"x":60,"y":10}'),
('B02', 'STANDARD', 1, 'B', '{"x":60,"y":30}'),
('B03', 'STANDARD', 1, 'B', '{"x":60,"y":50}'),
('B04', 'STANDARD', 1, 'B', '{"x":60,"y":70}'),
('B05', 'COMPACT', 1, 'B', '{"x":60,"y":90}'),
('B06', 'COMPACT', 1, 'B', '{"x":60,"y":110}'),
('B07', 'STANDARD', 1, 'B', '{"x":80,"y":10}'),
('B08', 'STANDARD', 1, 'B', '{"x":80,"y":30}'),
('B09', 'VIP', 1, 'B', '{"x":80,"y":50}'),
('B10', 'STANDARD', 1, 'B', '{"x":80,"y":70}'),
('B11', 'STANDARD', 1, 'B', '{"x":80,"y":90}'),
('B12', 'STANDARD', 1, 'B', '{"x":80,"y":110}');

-- Floor 1, Zone C: C01-C09
INSERT INTO parking_slots (slot_code, slot_type, floor_number, zone, coordinates_json) VALUES
('C01', 'STANDARD', 1, 'C', '{"x":110,"y":10}'),
('C02', 'STANDARD', 1, 'C', '{"x":110,"y":30}'),
('C03', 'STANDARD', 1, 'C', '{"x":110,"y":50}'),
('C04', 'COMPACT', 1, 'C', '{"x":110,"y":70}'),
('C05', 'STANDARD', 1, 'C', '{"x":110,"y":90}'),
('C06', 'STANDARD', 1, 'C', '{"x":130,"y":10}'),
('C07', 'STANDARD', 1, 'C', '{"x":130,"y":30}'),
('C08', 'EV_CHARGING', 1, 'C', '{"x":130,"y":50}'),
('C09', 'STANDARD', 1, 'C', '{"x":130,"y":70}');

-- Floor 2, Zone A: A13-A20
INSERT INTO parking_slots (slot_code, slot_type, floor_number, zone, coordinates_json) VALUES
('A13', 'STANDARD', 2, 'A', '{"x":10,"y":10}'),
('A14', 'STANDARD', 2, 'A', '{"x":10,"y":30}'),
('A15', 'STANDARD', 2, 'A', '{"x":10,"y":50}'),
('A16', 'STANDARD', 2, 'A', '{"x":10,"y":70}'),
('A17', 'COMPACT', 2, 'A', '{"x":10,"y":90}'),
('A18', 'STANDARD', 2, 'A', '{"x":30,"y":10}'),
('A19', 'STANDARD', 2, 'A', '{"x":30,"y":30}'),
('A20', 'HANDICAPPED', 2, 'A', '{"x":30,"y":50}');

-- Floor 2, Zone B: B13-B20
INSERT INTO parking_slots (slot_code, slot_type, floor_number, zone, coordinates_json) VALUES
('B13', 'STANDARD', 2, 'B', '{"x":60,"y":10}'),
('B14', 'STANDARD', 2, 'B', '{"x":60,"y":30}'),
('B15', 'STANDARD', 2, 'B', '{"x":60,"y":50}'),
('B16', 'COMPACT', 2, 'B', '{"x":60,"y":70}'),
('B17', 'STANDARD', 2, 'B', '{"x":60,"y":90}'),
('B18', 'VIP', 2, 'B', '{"x":80,"y":10}'),
('B19', 'STANDARD', 2, 'B', '{"x":80,"y":30}'),
('B20', 'STANDARD', 2, 'B', '{"x":80,"y":50}');

-- Floor 3, Zone A: A21-A27
INSERT INTO parking_slots (slot_code, slot_type, floor_number, zone, coordinates_json) VALUES
('A21', 'STANDARD', 3, 'A', '{"x":10,"y":10}'),
('A22', 'STANDARD', 3, 'A', '{"x":10,"y":30}'),
('A23', 'STANDARD', 3, 'A', '{"x":10,"y":50}'),
('A24', 'COMPACT', 3, 'A', '{"x":10,"y":70}'),
('A25', 'STANDARD', 3, 'A', '{"x":30,"y":10}'),
('A26', 'STANDARD', 3, 'A', '{"x":30,"y":30}'),
('A27', 'STANDARD', 3, 'A', '{"x":30,"y":50}');

-- Floor 3, Zone B: B21-B27
INSERT INTO parking_slots (slot_code, slot_type, floor_number, zone, coordinates_json) VALUES
('B21', 'STANDARD', 3, 'B', '{"x":60,"y":10}'),
('B22', 'STANDARD', 3, 'B', '{"x":60,"y":30}'),
('B23', 'STANDARD', 3, 'B', '{"x":60,"y":50}'),
('B24', 'STANDARD', 3, 'B', '{"x":60,"y":70}'),
('B25', 'COMPACT', 3, 'B', '{"x":80,"y":10}'),
('B26', 'STANDARD', 3, 'B', '{"x":80,"y":30}'),
('B27', 'STANDARD', 3, 'B', '{"x":80,"y":50}');