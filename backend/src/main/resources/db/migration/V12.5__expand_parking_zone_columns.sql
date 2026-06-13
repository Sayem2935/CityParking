-- Expand zone columns to accommodate university-specific zone names
-- V13 inserts values like 'AB4 Parking' (11 chars) and 'Engineering Parking' (19 chars)
-- which exceed the VARCHAR(10) limit set in V7/V8/V9.

-- parking_slots.zone: VARCHAR(10) -> VARCHAR(50)
ALTER TABLE parking_slots ALTER COLUMN zone TYPE VARCHAR(50);

-- parking_occupancy_history.zone: VARCHAR(10) -> VARCHAR(50)
ALTER TABLE parking_occupancy_history ALTER COLUMN zone TYPE VARCHAR(50);

-- parking_optimization_history.assigned_zone: VARCHAR(10) -> VARCHAR(50)
ALTER TABLE parking_optimization_history ALTER COLUMN assigned_zone TYPE VARCHAR(50);