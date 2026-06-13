-- University Parking Customization
-- Replaces generic zones A, B, C with university-specific zones
-- AB4 Parking (36 slots) and Engineering Parking (27 slots)
-- Outdoor parking facility (floor_number = 1 for all)

-- Remove all existing parking assignments first (they reference old slots)
DELETE FROM parking_assignments;

-- Remove all existing scan logs
DELETE FROM parking_scan_log;

-- Remove all existing parking slots (old A/B/C zones)
DELETE FROM parking_slots;

-- AB4 Parking Area: 36 slots (AB4-01 to AB4-36)
INSERT INTO parking_slots (slot_code, slot_type, floor_number, zone, coordinates_json) VALUES
('AB4-01', 'STANDARD', 1, 'AB4 Parking', '{"x":10,"y":10}'),
('AB4-02', 'STANDARD', 1, 'AB4 Parking', '{"x":10,"y":30}'),
('AB4-03', 'STANDARD', 1, 'AB4 Parking', '{"x":10,"y":50}'),
('AB4-04', 'STANDARD', 1, 'AB4 Parking', '{"x":10,"y":70}'),
('AB4-05', 'STANDARD', 1, 'AB4 Parking', '{"x":10,"y":90}'),
('AB4-06', 'STANDARD', 1, 'AB4 Parking', '{"x":10,"y":110}'),
('AB4-07', 'STANDARD', 1, 'AB4 Parking', '{"x":30,"y":10}'),
('AB4-08', 'STANDARD', 1, 'AB4 Parking', '{"x":30,"y":30}'),
('AB4-09', 'HANDICAPPED', 1, 'AB4 Parking', '{"x":30,"y":50}'),
('AB4-10', 'STANDARD', 1, 'AB4 Parking', '{"x":30,"y":70}'),
('AB4-11', 'STANDARD', 1, 'AB4 Parking', '{"x":30,"y":90}'),
('AB4-12', 'STANDARD', 1, 'AB4 Parking', '{"x":30,"y":110}'),
('AB4-13', 'STANDARD', 1, 'AB4 Parking', '{"x":50,"y":10}'),
('AB4-14', 'STANDARD', 1, 'AB4 Parking', '{"x":50,"y":30}'),
('AB4-15', 'STANDARD', 1, 'AB4 Parking', '{"x":50,"y":50}'),
('AB4-16', 'STANDARD', 1, 'AB4 Parking', '{"x":50,"y":70}'),
('AB4-17', 'COMPACT', 1, 'AB4 Parking', '{"x":50,"y":90}'),
('AB4-18', 'COMPACT', 1, 'AB4 Parking', '{"x":50,"y":110}'),
('AB4-19', 'STANDARD', 1, 'AB4 Parking', '{"x":70,"y":10}'),
('AB4-20', 'STANDARD', 1, 'AB4 Parking', '{"x":70,"y":30}'),
('AB4-21', 'STANDARD', 1, 'AB4 Parking', '{"x":70,"y":50}'),
('AB4-22', 'STANDARD', 1, 'AB4 Parking', '{"x":70,"y":70}'),
('AB4-23', 'STANDARD', 1, 'AB4 Parking', '{"x":70,"y":90}'),
('AB4-24', 'STANDARD', 1, 'AB4 Parking', '{"x":70,"y":110}'),
('AB4-25', 'EV_CHARGING', 1, 'AB4 Parking', '{"x":90,"y":10}'),
('AB4-26', 'STANDARD', 1, 'AB4 Parking', '{"x":90,"y":30}'),
('AB4-27', 'STANDARD', 1, 'AB4 Parking', '{"x":90,"y":50}'),
('AB4-28', 'STANDARD', 1, 'AB4 Parking', '{"x":90,"y":70}'),
('AB4-29', 'STANDARD', 1, 'AB4 Parking', '{"x":90,"y":90}'),
('AB4-30', 'STANDARD', 1, 'AB4 Parking', '{"x":90,"y":110}'),
('AB4-31', 'VIP', 1, 'AB4 Parking', '{"x":110,"y":10}'),
('AB4-32', 'STANDARD', 1, 'AB4 Parking', '{"x":110,"y":30}'),
('AB4-33', 'STANDARD', 1, 'AB4 Parking', '{"x":110,"y":50}'),
('AB4-34', 'HANDICAPPED', 1, 'AB4 Parking', '{"x":110,"y":70}'),
('AB4-35', 'STANDARD', 1, 'AB4 Parking', '{"x":110,"y":90}'),
('AB4-36', 'STANDARD', 1, 'AB4 Parking', '{"x":110,"y":110}');

-- Engineering Parking Area: 27 slots (ENG-01 to ENG-27)
INSERT INTO parking_slots (slot_code, slot_type, floor_number, zone, coordinates_json) VALUES
('ENG-01', 'STANDARD', 1, 'Engineering Parking', '{"x":10,"y":10}'),
('ENG-02', 'STANDARD', 1, 'Engineering Parking', '{"x":10,"y":30}'),
('ENG-03', 'STANDARD', 1, 'Engineering Parking', '{"x":10,"y":50}'),
('ENG-04', 'STANDARD', 1, 'Engineering Parking', '{"x":10,"y":70}'),
('ENG-05', 'STANDARD', 1, 'Engineering Parking', '{"x":10,"y":90}'),
('ENG-06', 'STANDARD', 1, 'Engineering Parking', '{"x":10,"y":110}'),
('ENG-07', 'COMPACT', 1, 'Engineering Parking', '{"x":30,"y":10}'),
('ENG-08', 'COMPACT', 1, 'Engineering Parking', '{"x":30,"y":30}'),
('ENG-09', 'STANDARD', 1, 'Engineering Parking', '{"x":30,"y":50}'),
('ENG-10', 'STANDARD', 1, 'Engineering Parking', '{"x":30,"y":70}'),
('ENG-11', 'HANDICAPPED', 1, 'Engineering Parking', '{"x":30,"y":90}'),
('ENG-12', 'STANDARD', 1, 'Engineering Parking', '{"x":30,"y":110}'),
('ENG-13', 'STANDARD', 1, 'Engineering Parking', '{"x":50,"y":10}'),
('ENG-14', 'STANDARD', 1, 'Engineering Parking', '{"x":50,"y":30}'),
('ENG-15', 'STANDARD', 1, 'Engineering Parking', '{"x":50,"y":50}'),
('ENG-16', 'STANDARD', 1, 'Engineering Parking', '{"x":50,"y":70}'),
('ENG-17', 'STANDARD', 1, 'Engineering Parking', '{"x":50,"y":90}'),
('ENG-18', 'STANDARD', 1, 'Engineering Parking', '{"x":50,"y":110}'),
('ENG-19', 'EV_CHARGING', 1, 'Engineering Parking', '{"x":70,"y":10}'),
('ENG-20', 'STANDARD', 1, 'Engineering Parking', '{"x":70,"y":30}'),
('ENG-21', 'STANDARD', 1, 'Engineering Parking', '{"x":70,"y":50}'),
('ENG-22', 'STANDARD', 1, 'Engineering Parking', '{"x":70,"y":70}'),
('ENG-23', 'STANDARD', 1, 'Engineering Parking', '{"x":70,"y":90}'),
('ENG-24', 'STANDARD', 1, 'Engineering Parking', '{"x":70,"y":110}'),
('ENG-25', 'VIP', 1, 'Engineering Parking', '{"x":90,"y":10}'),
('ENG-26', 'STANDARD', 1, 'Engineering Parking', '{"x":90,"y":30}'),
('ENG-27', 'STANDARD', 1, 'Engineering Parking', '{"x":90,"y":50}');