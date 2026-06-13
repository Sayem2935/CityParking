-- V12: Add university ID document extraction fields to users table
-- These fields store data extracted from a university ID image via DocumentExtractionService.

ALTER TABLE users ADD COLUMN IF NOT EXISTS student_name VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS university_name VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS session VARCHAR(50);