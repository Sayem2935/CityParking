-- V14: Expand license_plate column to support Bangla Unicode license plates
-- Bangladesh plates can include Bangla script (UTF-8 multi-byte characters)
-- e.g., "ঢাকা মেট্রো-গ ১২-৩৪৫৬" requires more characters than ASCII-only plates.

-- Expand VARCHAR(20) -> VARCHAR(50) for license_plate
ALTER TABLE vehicles ALTER COLUMN license_plate TYPE VARCHAR(50);

-- Expand detected_plate in plate_verification_logs for consistency
ALTER TABLE plate_verification_logs ALTER COLUMN detected_plate TYPE VARCHAR(50);

-- Ensure database encoding is UTF-8 (this is informational; modern PostgreSQL defaults to UTF-8)
-- If your database was created with a non-UTF-8 encoding, you would need to recreate it.
-- This comment serves as documentation that the system expects UTF-8 encoding.
COMMENT ON COLUMN vehicles.license_plate IS 'Vehicle license plate. Supports Bangla Unicode (\u0980-\u09FF), English letters, numbers, spaces, and hyphens. Max 50 chars.';