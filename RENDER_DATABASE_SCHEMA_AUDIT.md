# Render Database Schema Verification Audit

**Date:** 2026-06-14  
**Auditor:** Automated Schema Verification  
**Database Host:** `dpg-d8mokdkvikkc73c4kh60-a.virginia-postgres.render.com`  
**Database Name:** `parking_l42e`  
**Database User:** `parking_l42e_user`

---

## 1. Flyway Migration History

All 14 migrations applied successfully. **No failed, missing, or pending migrations.**

| Rank | Version | Description | Script | Status |
|------|---------|-------------|--------|--------|
| 1 | 1 | create tables | V1__create_tables.sql | ✅ SUCCESS |
| 2 | 2 | add face enrollment upload fields | V2__add_face_enrollment_upload_fields.sql | ✅ SUCCESS |
| 3 | 3 | create face embeddings table | V3__create_face_embeddings_table.sql | ✅ SUCCESS |
| 4 | 4 | create plate verification logs | V4__create_plate_verification_logs.sql | ✅ SUCCESS |
| 5 | 5 | create access decision tables | V5__create_access_decision_tables.sql | ✅ SUCCESS |
| 6 | 6 | db reliability sprint | V6__db_reliability_sprint.sql | ✅ SUCCESS |
| 7 | 7 | create parking slot tables | V7__create_parking_slot_tables.sql | ✅ SUCCESS |
| 8 | 8 | create parking prediction tables | V8__create_parking_prediction_tables.sql | ✅ SUCCESS |
| 9 | 9 | create parking optimization tables | V9__create_parking_optimization_tables.sql | ✅ SUCCESS |
| 10 | 10 | add aws rekognition fields | V10__add_aws_rekognition_fields.sql | ✅ SUCCESS |
| 11 | 11 | drop face embeddings table | V11__drop_face_embeddings_table.sql | ✅ SUCCESS |
| 12 | 12 | add university id fields | V12__add_university_id_fields.sql | ✅ SUCCESS |
| 13 | 12.5 | expand parking zone columns | V12.5__expand_parking_zone_columns.sql | ✅ SUCCESS |
| 14 | 13 | university parking customization | V13__university_parking_customization.sql | ✅ SUCCESS |

**Migration Status:** ✅ All 14 migrations applied successfully  
**Failed Migrations:** 0  
**Pending Migrations:** 0

---

## 2. Table Inventory

### 2.1 All Tables in Database

| # | Table Name | Row Count | Expected? |
|---|-----------|-----------|-----------|
| 1 | `users` | 1 | ✅ Yes |
| 2 | `vehicles` | 1 | ✅ Yes |
| 3 | `parking_slots` | 63 | ✅ Yes |
| 4 | `parking_assignments` | 0 | ✅ Yes |
| 5 | `face_enrollments` | 0 | ✅ Yes |
| 6 | `access_logs` | 0 | ✅ Yes |
| 7 | `security_events` | 0 | ✅ Yes |
| 8 | `plate_verification_logs` | 0 | ✅ Yes |
| 9 | `parking_scan_log` | 0 | ✅ Yes |
| 10 | `parking_predictions` | 0 | ✅ Yes |
| 11 | `parking_occupancy_history` | 2,880 | ✅ Yes |
| 12 | `parking_optimization_history` | 500 | ✅ Yes |
| 13 | `parking_rl_decisions` | 500 | ✅ Yes |
| — | `flyway_schema_history` | 14 | (System) |

**Total Application Tables:** 13  
**Missing Tables:** 0

---

## 3. Detailed Schema Inventory

### 3.1 `users` (17 columns)

| Column | Data Type | Notes |
|--------|-----------|-------|
| id | bigint | PRIMARY KEY |
| first_name | varchar | |
| last_name | varchar | |
| email | varchar | UNIQUE |
| password | varchar | |
| phone | varchar | |
| avatar_url | varchar | |
| is_active | boolean | |
| role | varchar | |
| created_at | timestamp | |
| updated_at | timestamp | |
| deleted_at | timestamp | |
| student_name | varchar(200) | V12 migration |
| student_id | varchar(100) | V12 migration |
| university_name | varchar(200) | V12 migration |
| department | varchar(200) | V12 migration |
| session | varchar(50) | V12 migration |

### 3.2 `vehicles`

| Column | Data Type | Notes |
|--------|-----------|-------|
| id | bigint | PRIMARY KEY |
| user_id | bigint | FK → users.id |
| license_plate | varchar | |
| vehicle_type | varchar | |
| make | varchar | |
| model | varchar | |
| color | varchar | |
| is_default | boolean | |
| created_at | timestamp | |
| updated_at | timestamp | |

### 3.3 `parking_slots`

| Column | Data Type | Notes |
|--------|-----------|-------|
| id | bigint | PRIMARY KEY |
| slot_code | varchar | UNIQUE |
| zone | varchar | |
| floor | varchar | |
| status | varchar | |
| slot_type | varchar | |
| created_at | timestamp | |
| updated_at | timestamp | |

### 3.4 `parking_assignments`

| Column | Data Type | Notes |
|--------|-----------|-------|
| id | bigint | PRIMARY KEY |
| user_id | bigint | FK → users.id |
| vehicle_id | bigint | FK → vehicles.id |
| slot_id | bigint | FK → parking_slots.id |
| status | varchar | |
| assigned_at | timestamp | |
| released_at | timestamp | |
| created_at | timestamp | |
| updated_at | timestamp | |

### 3.5 `face_enrollments`

| Column | Data Type | Notes |
|--------|-----------|-------|
| id | bigint | PRIMARY KEY |
| user_id | bigint | FK → users.id |
| enrollment_id | varchar | |
| external_face_id | varchar | |
| collection_id | varchar | |
| provider | varchar | |
| status | varchar | |
| image_url | varchar | |
| face_image_url | varchar | |
| confidence | double precision | |
| created_at | timestamp | |
| updated_at | timestamp | |

### 3.6 `access_logs`

| Column | Data Type | Notes |
|--------|-----------|-------|
| id | bigint | PRIMARY KEY |
| user_id | bigint | FK → users.id |
| vehicle_id | bigint | FK → vehicles.id |
| decision | varchar | |
| reason | varchar | |
| confidence | double precision | |
| detected_plate | varchar | |
| matched | boolean | |
| created_at | timestamp | |
| updated_at | timestamp | |

### 3.7 `security_events`

| Column | Data Type | Notes |
|--------|-----------|-------|
| id | bigint | PRIMARY KEY |
| event_type | varchar | |
| severity | varchar | |
| description | varchar | |
| user_id | bigint | FK → users.id |
| vehicle_id | bigint | FK → vehicles.id |
| access_log_id | bigint | FK → access_logs.id |
| resolved | boolean | |
| resolved_by | bigint | FK → users.id |
| resolved_at | timestamp | |
| created_at | timestamp | |
| updated_at | timestamp | |

### 3.8 `plate_verification_logs`

| Column | Data Type | Notes |
|--------|-----------|-------|
| id | bigint | PRIMARY KEY |
| user_id | bigint | FK → users.id |
| detected_plate | varchar | |
| confidence | double precision | |
| verified | boolean | |
| matched_vehicle_id | bigint | FK → vehicles.id |
| image_url | varchar | |
| created_at | timestamp | |
| updated_at | timestamp | |

### 3.9 `parking_scan_log`

| Column | Data Type | Notes |
|--------|-----------|-------|
| id | bigint | PRIMARY KEY |
| zone | varchar | |
| detected_vehicles | integer | |
| available_spots | integer | |
| scan_image_url | varchar | |
| created_at | timestamp | |

### 3.10 `parking_predictions`

| Column | Data Type | Notes |
|--------|-----------|-------|
| id | bigint | PRIMARY KEY |
| zone | varchar | |
| forecast_for | timestamp | |
| predicted_occupancy | double precision | |
| confidence | double precision | |
| model_version | varchar | |
| created_at | timestamp | |

### 3.11 `parking_occupancy_history`

| Column | Data Type | Notes |
|--------|-----------|-------|
| id | bigint | PRIMARY KEY |
| zone | varchar | |
| floor | varchar | |
| timestamp | timestamp | |
| total_spots | integer | |
| occupied_spots | integer | |
| occupancy_rate | double precision | |
| created_at | timestamp | |

### 3.12 `parking_optimization_history`

| Column | Data Type | Notes |
|--------|-----------|-------|
| id | bigint | PRIMARY KEY |
| zone | varchar | |
| timestamp | timestamp | |
| action | varchar | |
| details | varchar | |
| created_at | timestamp | |

### 3.13 `parking_rl_decisions`

| Column | Data Type | Notes |
|--------|-----------|-------|
| id | bigint | PRIMARY KEY |
| episode | integer | |
| state | varchar | |
| action | varchar | |
| reward | double precision | |
| created_at | timestamp | |

---

## 4. Foreign Keys (13 total)

| Table | Column | References |
|-------|--------|------------|
| access_logs | user_id | users.id |
| access_logs | vehicle_id | vehicles.id |
| face_enrollments | user_id | users.id |
| parking_assignments | user_id | users.id |
| parking_assignments | vehicle_id | vehicles.id |
| parking_assignments | slot_id | parking_slots.id |
| plate_verification_logs | matched_vehicle_id | vehicles.id |
| plate_verification_logs | user_id | users.id |
| security_events | vehicle_id | vehicles.id |
| security_events | user_id | users.id |
| security_events | access_log_id | access_logs.id |
| security_events | resolved_by | users.id |
| vehicles | user_id | users.id |

---

## 5. Indexes (66 total)

Key indexes per table:

| Table | Index Count | Notable Indexes |
|-------|-------------|-----------------|
| users | 4 | PK, email (unique), deleted_at |
| vehicles | 4 | PK, license_plate, user_id, user+plate |
| parking_slots | 6 | PK, slot_code (unique), zone, floor, status |
| parking_assignments | 6 | PK, user_id, vehicle_id, slot_id, status, assigned_at |
| face_enrollments | 7 | PK, user_id, status, provider, collection_id, external_face_id, user_active |
| access_logs | 7 | PK, user_id, vehicle_id, created_at, decision, user+created, decision+created |
| security_events | 7 | PK, user_id, event_type, severity, resolved, unresolved, user+created |
| plate_verification_logs | 6 | PK, user_id, detected_plate, verified, created_at, user+created |
| parking_scan_log | 2 | PK, created_at |
| parking_predictions | 3 | PK, timestamp, forecast_for |
| parking_occupancy_history | 4 | PK, zone, floor, timestamp |
| parking_optimization_history | 3 | PK, zone, timestamp |
| parking_rl_decisions | 3 | PK, episode, created_at |

---

## 6. Row Counts

```sql
SELECT COUNT(*) FROM users;                    -- 1
SELECT COUNT(*) FROM vehicles;                 -- 1
SELECT COUNT(*) FROM parking_slots;            -- 63
SELECT COUNT(*) FROM parking_assignments;      -- 0
SELECT COUNT(*) FROM face_enrollments;         -- 0
SELECT COUNT(*) FROM access_logs;              -- 0
SELECT COUNT(*) FROM security_events;          -- 0
SELECT COUNT(*) FROM plate_verification_logs;  -- 0
SELECT COUNT(*) FROM parking_scan_log;         -- 0
SELECT COUNT(*) FROM parking_predictions;      -- 0
SELECT COUNT(*) FROM parking_occupancy_history;-- 2,880
SELECT COUNT(*) FROM parking_optimization_history;-- 500
SELECT COUNT(*) FROM parking_rl_decisions;     -- 500
```

---

## 7. Parking Seed Data Verification

### Zone Presence

| Zone | Slot Count | Status |
|------|-----------|--------|
| **AB4 Parking** | 36 | ✅ Confirmed |
| **Engineering Parking** | 27 | ✅ Confirmed |

**Total Slots:** 63

### Sample Slot Codes

| Slot Code | Zone | Status |
|-----------|------|--------|
| AB4-01 | AB4 Parking | FREE |
| AB4-02 | AB4 Parking | FREE |
| AB4-03 | AB4 Parking | FREE |
| ... | ... | ... |
| AB4-36 | AB4 Parking | FREE |
| ENG-01 | Engineering Parking | FREE |
| ... | ... | ... |
| ENG-27 | Engineering Parking | FREE |

---

## 8. University ID Columns Verification

### V12 Migration Added Columns (Codebase Definition)

| Column | Present in DB? | Data Type |
|--------|---------------|-----------|
| `student_name` | ✅ YES | varchar(200) |
| `student_id` | ✅ YES | varchar(100) |
| `university_name` | ✅ YES | varchar(200) |
| `department` | ✅ YES | varchar(200) |
| `session` | ✅ YES | varchar(50) |

### Task-Expected Columns (Alternative Naming)

| Column | Present in DB? | Actual Equivalent |
|--------|---------------|-------------------|
| `university_id_number` | ❌ NO | `student_id` (functionally equivalent) |
| `university_name` | ✅ YES | `university_name` |
| `document_extraction_status` | ❌ NO | Not implemented in migrations |
| `university_id_verified` | ❌ NO | Not implemented in migrations |
| `document_type` | ❌ NO | Not implemented in migrations |

**Note:** The task expected columns `university_id_number`, `document_extraction_status`, `university_id_verified`, and `document_type`. The actual codebase migration V12 instead adds `student_name`, `student_id`, `university_name`, `department`, and `session`. The database matches the codebase migrations exactly. The expected columns in the task appear to reference an alternative design that was not implemented in the migration files.

---

## 9. JPA Entity vs Database Comparison

### 9.1 User Entity (`@Table(name = "users")`)

| Entity Field | DB Column | DB Exists? | Match? |
|-------------|-----------|-----------|--------|
| id | id | ✅ | ✅ |
| firstName | first_name | ✅ | ✅ |
| lastName | last_name | ✅ | ✅ |
| email | email | ✅ | ✅ |
| password | password | ✅ | ✅ |
| phone | phone | ✅ | ✅ |
| avatarUrl | avatar_url | ✅ | ✅ |
| isActive | is_active | ✅ | ✅ |
| role | role | ✅ | ✅ |
| createdAt | created_at | ✅ | ✅ |
| updatedAt | updated_at | ✅ | ✅ |
| deletedAt | deleted_at | ✅ | ✅ |
| studentName | student_name | ✅ | ✅ |
| studentId | student_id | ✅ | ✅ |
| universityName | university_name | ✅ | ✅ |
| department | department | ✅ | ✅ |
| session | session | ✅ | ✅ |

### 9.2 Vehicle Entity (`@Table(name = "vehicles")`)

| Entity Field | DB Column | DB Exists? | Match? |
|-------------|-----------|-----------|--------|
| id | id | ✅ | ✅ |
| userId | user_id (FK) | ✅ | ✅ |
| licensePlate | license_plate | ✅ | ✅ |
| vehicleType | vehicle_type | ✅ | ✅ |
| make | make | ✅ | ✅ |
| model | model | ✅ | ✅ |
| color | color | ✅ | ✅ |
| isDefault | is_default | ✅ | ✅ |
| createdAt | created_at | ✅ | ✅ |
| updatedAt | updated_at | ✅ | ✅ |

### 9.3 ParkingSlot Entity (`@Table(name = "parking_slots")`)

| Entity Field | DB Column | DB Exists? | Match? |
|-------------|-----------|-----------|--------|
| id | id | ✅ | ✅ |
| slotCode | slot_code | ✅ | ✅ |
| zone | zone | ✅ | ✅ |
| floor | floor | ✅ | ✅ |
| status | status | ✅ | ✅ |
| slotType | slot_type | ✅ | ✅ |
| createdAt | created_at | ✅ | ✅ |
| updatedAt | updated_at | ✅ | ✅ |

### 9.4 ParkingAssignment Entity (`@Table(name = "parking_assignments")`)

| Entity Field | DB Column | DB Exists? | Match? |
|-------------|-----------|-----------|--------|
| id | id | ✅ | ✅ |
| userId | user_id (FK) | ✅ | ✅ |
| vehicleId | vehicle_id (FK) | ✅ | ✅ |
| slotId | slot_id (FK) | ✅ | ✅ |
| status | status | ✅ | ✅ |
| assignedAt | assigned_at | ✅ | ✅ |
| releasedAt | released_at | ✅ | ✅ |
| createdAt | created_at | ✅ | ✅ |
| updatedAt | updated_at | ✅ | ✅ |

### 9.5 FaceEnrollment Entity (`@Table(name = "face_enrollments")`)

| Entity Field | DB Column | DB Exists? | Match? |
|-------------|-----------|-----------|--------|
| id | id | ✅ | ✅ |
| userId | user_id (FK) | ✅ | ✅ |
| enrollmentId | enrollment_id | ✅ | ✅ |
| externalFaceId | external_face_id | ✅ | ✅ |
| collectionId | collection_id | ✅ | ✅ |
| provider | provider | ✅ | ✅ |
| status | status | ✅ | ✅ |
| imageUrl | image_url | ✅ | ✅ |
| faceImageUrl | face_image_url | ✅ | ✅ |
| confidence | confidence | ✅ | ✅ |
| createdAt | created_at | ✅ | ✅ |
| updatedAt | updated_at | ✅ | ✅ |

### 9.6 AccessLog Entity (`@Table(name = "access_logs")`)

| Entity Field | DB Column | DB Exists? | Match? |
|-------------|-----------|-----------|--------|
| id | id | ✅ | ✅ |
| userId | user_id (FK) | ✅ | ✅ |
| vehicleId | vehicle_id (FK) | ✅ | ✅ |
| decision | decision | ✅ | ✅ |
| reason | reason | ✅ | ✅ |
| confidence | confidence | ✅ | ✅ |
| detectedPlate | detected_plate | ✅ | ✅ |
| matched | matched | ✅ | ✅ |
| createdAt | created_at | ✅ | ✅ |
| updatedAt | updated_at | ✅ | ✅ |

### 9.7 SecurityEvent Entity (`@Table(name = "security_events")`)

| Entity Field | DB Column | DB Exists? | Match? |
|-------------|-----------|-----------|--------|
| id | id | ✅ | ✅ |
| eventType | event_type | ✅ | ✅ |
| severity | severity | ✅ | ✅ |
| description | description | ✅ | ✅ |
| userId | user_id (FK) | ✅ | ✅ |
| vehicleId | vehicle_id (FK) | ✅ | ✅ |
| accessLogId | access_log_id (FK) | ✅ | ✅ |
| resolved | resolved | ✅ | ✅ |
| resolvedBy | resolved_by (FK) | ✅ | ✅ |
| resolvedAt | resolved_at | ✅ | ✅ |
| createdAt | created_at | ✅ | ✅ |
| updatedAt | updated_at | ✅ | ✅ |

### 9.8 PlateVerificationLog Entity (`@Table(name = "plate_verification_logs")`)

| Entity Field | DB Column | DB Exists? | Match? |
|-------------|-----------|-----------|--------|
| id | id | ✅ | ✅ |
| userId | user_id (FK) | ✅ | ✅ |
| detectedPlate | detected_plate | ✅ | ✅ |
| confidence | confidence | ✅ | ✅ |
| verified | verified | ✅ | ✅ |
| matchedVehicleId | matched_vehicle_id (FK) | ✅ | ✅ |
| imageUrl | image_url | ✅ | ✅ |
| createdAt | created_at | ✅ | ✅ |
| updatedAt | updated_at | ✅ | ✅ |

---

## 10. Entity Mismatch Summary

| Entity | DB Table Exists? | Missing Columns? | Extra Columns? | Type Mismatches? |
|--------|-----------------|-------------------|----------------|-------------------|
| User | ✅ YES | None | None | None |
| Vehicle | ✅ YES | None | None | None |
| ParkingSlot | ✅ YES | None | None | None |
| ParkingAssignment | ✅ YES | None | None | None |
| FaceEnrollment | ✅ YES | None | None | None |
| AccessLog | ✅ YES | None | None | None |
| SecurityEvent | ✅ YES | None | None | None |
| PlateVerificationLog | ✅ YES | None | None | None |

---

## 11. Final Verdict

### ✅ Database Matches Code

**Summary:**

- ✅ All 14 Flyway migrations (V1 through V13) applied successfully with no failures
- ✅ All 13 expected application tables exist in the database
- ✅ All JPA entity fields map correctly to existing database columns
- ✅ No missing tables, no missing columns, no extra columns, no type mismatches
- ✅ All foreign keys properly established (13 foreign key constraints)
- ✅ 66 indexes in place for performance
- ✅ Parking seed data confirmed: AB4 Parking (36 slots) + Engineering Parking (27 slots)
- ✅ University ID fields present: `student_name`, `student_id`, `university_name`, `department`, `session`

**Notes:**

1. **University ID column naming:** The task expected `university_id_number`, `document_extraction_status`, `university_id_verified`, and `document_type`. The actual codebase migration V12 uses different column names: `student_name`, `student_id`, `university_name`, `department`, `session`. The database matches the codebase migrations — the discrepancy is between the task specification and the actual codebase design, not between the database and codebase.

2. **Historical data present:** `parking_occupancy_history` (2,880 rows), `parking_optimization_history` (500 rows), and `parking_rl_decisions` (500 rows) contain seed/runtime data from AI/ML features.

3. **Low application data:** Core tables (`users`, `vehicles`, `parking_assignments`, `face_enrollments`, `access_logs`, `security_events`, `plate_verification_logs`, `parking_scan_log`) have 0-1 rows, indicating the database is in a fresh/staging state with minimal production data.

---

*Audit generated on 2026-06-14 at 05:10 AM EST*