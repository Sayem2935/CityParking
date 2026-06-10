# Sprint 9: Dual Verification & Access Decision Engine

## Overview

Sprint 9 combines the existing face verification and plate verification systems into a unified **parking access decision engine**. When a vehicle approaches a parking facility, both the driver's face and the vehicle's license plate are verified simultaneously. A decision engine evaluates both results to determine whether to grant access, deny access, or trigger a security alert.

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Gate Camera │────▶│  POST /api/access │────▶│  AccessVerification │
│  (face+plate)│     │     /verify       │     │    Controller       │
└─────────────┘     └──────────────────┘     └─────────┬───────────┘
                                                        │
                              ┌─────────────────────────┼─────────────────────────┐
                              │                         │                         │
                              ▼                         ▼                         ▼
                    ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
                    │  Face           │     │  Plate           │     │  Access Decision    │
                    │  Verification   │     │  Recognition     │     │  Service            │
                    │  Service        │     │  Service         │     │  (Decision Engine)  │
                    └────────┬────────┘     └────────┬─────────┘     └─────────┬───────────┘
                             │                       │                         │
                             ▼                       ▼                         ▼
                    ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
                    │  AI Service     │     │  AI Service      │     │  Database           │
                    │  (Face Match)   │     │  (Plate Detect)  │     │  (Logs + Events)    │
                    └─────────────────┘     └──────────────────┘     └─────────────────────┘
```

---

## Decision Flow

```
START
  │
  ├── Step 1: Verify Face
  │     ├── Face matched to enrolled user? → verified=true, userId=N, confidence=X
  │     └── No match / no face detected?   → verified=false, userId=null, confidence=X
  │
  ├── Step 2: Verify Plate
  │     ├── Plate matches user's registered vehicle? → verified=true, vehicleId=M, confidence=Y
  │     └── No match / no plate detected?            → verified=false, vehicleId=null, confidence=Y
  │
  ├── Step 3: Decision Engine
  │     │
  │     ├── Rule 1: face=true  AND plate=true  → ACCESS_GRANTED
  │     ├── Rule 2: face=false                 → ACCESS_DENIED
  │     ├── Rule 3: plate=false                → ACCESS_DENIED
  │     └── Rule 4: face=true  AND plate=false → SECURITY_ALERT
  │
  ├── Step 4: Generate Security Events (if applicable)
  │     ├── Face mismatch (confidence > 0)   → FACE_MISMATCH (HIGH)
  │     ├── Plate mismatch (confidence > 0)  → PLATE_MISMATCH (HIGH)
  │     ├── Multiple faces detected           → MULTIPLE_FACES (CRITICAL)
  │     └── Multiple plates detected          → MULTIPLE_PLATES (CRITICAL)
  │
  ├── Step 5: Save Access Log + Security Events to Database
  │
  └── Step 6: Return Response
```

---

## Decision Rules Matrix

| Face Verified | Plate Verified | Decision          | Security Events Generated      |
|:-------------:|:--------------:|:-----------------:|:------------------------------:|
| ✅ Yes        | ✅ Yes         | ACCESS_GRANTED    | None                           |
| ❌ No         | ✅ Yes         | ACCESS_DENIED     | FACE_MISMATCH                  |
| ❌ No         | ❌ No          | ACCESS_DENIED     | FACE_MISMATCH, (PLATE_MISMATCH)|
| ✅ Yes        | ❌ No          | SECURITY_ALERT    | PLATE_MISMATCH                 |

---

## API Endpoint

### `POST /api/access/verify`

**Content-Type:** `multipart/form-data`

**Authentication:** Required (JWT Bearer token)

#### Request Parameters

| Parameter   | Type   | Required | Description                          |
|-------------|--------|----------|--------------------------------------|
| faceImage   | File   | Yes      | Face image (JPEG/PNG, max 10MB)      |
| plateImage  | File   | Yes      | License plate image (JPEG/PNG, max 10MB) |

#### Example Request (cURL)

```bash
curl -X POST http://localhost:8080/api/access/verify \
  -H "Authorization: Bearer <jwt-token>" \
  -F "faceImage=@face.jpg" \
  -F "plateImage=@plate.jpg"
```

#### Response (ACCESS_GRANTED)

```json
{
  "success": true,
  "data": {
    "decision": "ACCESS_GRANTED",
    "userId": 1,
    "vehicleId": 1,
    "faceConfidence": 0.92,
    "plateConfidence": 0.95,
    "faceVerified": true,
    "plateVerified": true,
    "detectedPlate": "DHAKA-METRO-GA-1234",
    "faceMessage": "Face matched with enrolled user",
    "plateMessage": "Plate matched with registered vehicle",
    "message": "Access granted. Both face and vehicle verified successfully.",
    "processingTimeMs": 234.5,
    "accessLogId": 42,
    "securityEventIds": [],
    "timestamp": "2026-06-09T08:30:00"
  }
}
```

#### Response (SECURITY_ALERT)

```json
{
  "success": true,
  "data": {
    "decision": "SECURITY_ALERT",
    "userId": 1,
    "vehicleId": null,
    "faceConfidence": 0.92,
    "plateConfidence": 0.78,
    "faceVerified": true,
    "plateVerified": false,
    "detectedPlate": "UNKNOWN-999",
    "faceMessage": "Face matched with enrolled user",
    "plateMessage": "Plate detected but does not match any registered vehicle",
    "message": "Security alert triggered. Face verified but vehicle plate does not match registered vehicles. Security has been notified.",
    "processingTimeMs": 198.3,
    "accessLogId": 43,
    "securityEventIds": [15],
    "timestamp": "2026-06-09T08:31:00"
  }
}
```

#### Error Response (400)

```json
{
  "success": false,
  "error": {
    "message": "faceImage is required and cannot be empty",
    "status": 400
  }
}
```

---

## Database Schema

### Table: `access_logs`

| Column             | Type          | Description                              |
|--------------------|---------------|------------------------------------------|
| id                 | BIGINT (PK)   | Auto-generated primary key               |
| user_id            | BIGINT (FK)   | References users table (nullable)        |
| vehicle_id         | BIGINT (FK)   | References vehicles table (nullable)     |
| decision           | VARCHAR(20)   | ACCESS_GRANTED, ACCESS_DENIED, SECURITY_ALERT |
| face_verified      | BOOLEAN       | Whether face verification passed         |
| plate_verified     | BOOLEAN       | Whether plate verification passed        |
| face_confidence    | DOUBLE        | Face verification confidence score (0-1) |
| plate_confidence   | DOUBLE        | Plate verification confidence score (0-1)|
| detected_plate     | VARCHAR(20)   | License plate text detected              |
| face_message       | VARCHAR(500)  | Face verification message                |
| plate_message      | VARCHAR(500)  | Plate verification message               |
| processing_time_ms | DOUBLE        | Total processing time in milliseconds    |
| created_at         | TIMESTAMP     | When the access attempt was made         |

### Table: `security_events`

| Column             | Type          | Description                              |
|--------------------|---------------|------------------------------------------|
| id                 | BIGINT (PK)   | Auto-generated primary key               |
| access_log_id      | BIGINT (FK)   | References access_logs table             |
| event_type         | VARCHAR(30)   | FACE_MISMATCH, PLATE_MISMATCH, MULTIPLE_FACES, MULTIPLE_PLATES |
| severity           | VARCHAR(10)   | LOW, MEDIUM, HIGH, CRITICAL              |
| user_id            | BIGINT (FK)   | References users table (nullable)        |
| vehicle_id         | BIGINT (FK)   | References vehicles table (nullable)     |
| description        | VARCHAR(1000) | Human-readable event description         |
| face_confidence    | DOUBLE        | Face confidence at time of event         |
| plate_confidence   | DOUBLE        | Plate confidence at time of event        |
| detected_plate     | VARCHAR(20)   | Detected plate at time of event          |
| created_at         | TIMESTAMP     | When the event was created               |

---

## Security Events

| Event Type       | Severity | Trigger Condition                              |
|------------------|----------|------------------------------------------------|
| FACE_MISMATCH    | HIGH     | Face verification fails with confidence > 0    |
| PLATE_MISMATCH   | HIGH     | Plate verification fails with confidence > 0   |
| MULTIPLE_FACES   | CRITICAL | Message indicates multiple faces detected       |
| MULTIPLE_PLATES  | CRITICAL | Message indicates multiple plates detected      |

---

## Processing Pipeline

### Step 1 — Face Verification
- Extracts face from uploaded image
- Compares against enrolled face embeddings
- Returns: `FaceVerificationResponse { verified, userId, confidence, message }`

### Step 2 — Plate Verification
- If face identified a user → matches plate against that user's registered vehicles
- If face not identified → attempts plate detection for logging purposes
- Returns: `PlateVerificationResponse { verified, detectedPlate, confidence, matchedVehicleId, message }`

### Step 3 — Decision Engine
- Applies the 4 decision rules in priority order
- Rule 4 (SECURITY_ALERT) takes priority over ACCESS_DENIED when face is verified
- Returns: `AccessDecision { ACCESS_GRANTED, ACCESS_DENIED, SECURITY_ALERT }`

### Step 4 — Security Events
- Generates events for any verification failures
- Events are severity-tagged for security team prioritization
- CRITICAL events for multiple faces/plates (potential spoofing)

### Step 5 — Logging
- Saves access log with full verification details
- Links security events to the access log
- Records processing time for performance monitoring

### Step 6 — Response
- Returns unified response with decision, confidence scores, and all metadata
- Includes processing time and database IDs for audit trail

---

## Test Results

### Unit Tests — AccessDecisionService (14 tests)

| # | Test Case                              | Expected Decision   | Status |
|---|----------------------------------------|---------------------|--------|
| 1 | Valid user + Valid vehicle              | ACCESS_GRANTED      | ✅ PASS |
| 2 | Valid user + Invalid vehicle            | SECURITY_ALERT      | ✅ PASS |
| 3 | Invalid user + Valid vehicle            | ACCESS_DENIED       | ✅ PASS |
| 4 | Invalid user + Invalid vehicle          | ACCESS_DENIED       | ✅ PASS |
| 5 | Multiple faces detected                 | ACCESS_DENIED       | ✅ PASS |
| 6 | Multiple plates detected                | SECURITY_ALERT      | ✅ PASS |
| 7 | Face fails with confidence > 0          | FACE_MISMATCH event | ✅ PASS |
| 8 | Plate fails with confidence > 0         | PLATE_MISMATCH event| ✅ PASS |
| 9 | Multiple faces in message               | MULTIPLE_FACES event| ✅ PASS |
| 10| Multiple plates in message              | MULTIPLE_PLATES event| ✅ PASS |
| 11| Null userId handling                    | ACCESS_DENIED       | ✅ PASS |
| 12| Null vehicleId handling                 | ACCESS_DENIED       | ✅ PASS |
| 13| Security events linked to access log    | Linked              | ✅ PASS |
| 14| Face fails but plate verified           | ACCESS_DENIED       | ✅ PASS |

### Integration Tests — AccessVerificationController (10 tests)

| # | Test Case                              | Expected Status     | Status |
|---|----------------------------------------|---------------------|--------|
| 1 | Valid user + Valid vehicle (API)        | 200 ACCESS_GRANTED  | ✅ PASS |
| 2 | Valid user + Invalid vehicle (API)      | 200 SECURITY_ALERT  | ✅ PASS |
| 3 | Invalid user + Valid vehicle (API)      | 200 ACCESS_DENIED   | ✅ PASS |
| 4 | Invalid user + Invalid vehicle (API)    | 200 ACCESS_DENIED   | ✅ PASS |
| 5 | Empty face image                        | 400 Bad Request     | ✅ PASS |
| 6 | Empty plate image                       | 400 Bad Request     | ✅ PASS |
| 7 | Missing face image                      | 400 Bad Request     | ✅ PASS |
| 8 | Unauthorized request (no JWT)           | 401 Unauthorized    | ✅ PASS |
| 9 | Non-image file for face                 | 400 Bad Request     | ✅ PASS |
| 10| Processing time in response             | Included            | ✅ PASS |

---

## Files Created / Modified

### New Files

| File | Description |
|------|-------------|
| `V5__create_access_decision_tables.sql` | Database migration for access_logs and security_events tables |
| `AccessDecision.java` | Enum: ACCESS_GRANTED, ACCESS_DENIED, SECURITY_ALERT |
| `SecurityEventType.java` | Enum: FACE_MISMATCH, PLATE_MISMATCH, MULTIPLE_FACES, MULTIPLE_PLATES |
| `AccessLog.java` | Entity for access_logs table |
| `SecurityEvent.java` | Entity for security_events table |
| `AccessLogRepository.java` | JPA repository for access logs |
| `SecurityEventRepository.java` | JPA repository for security events |
| `AccessVerificationResponse.java` | DTO for API response |
| `AccessDecisionService.java` | Core decision engine service |
| `AccessDecisionResult.java` | Result wrapper for decision engine output |
| `AccessVerificationController.java` | REST controller for POST /api/access/verify |
| `AccessDecisionServiceTest.java` | 14 unit tests for decision engine |
| `AccessVerificationControllerTest.java` | 10 controller integration tests |

---

## Running Tests

```bash
# Run all Sprint 9 tests
cd backend
mvn test -Dtest="AccessDecisionServiceTest,AccessVerificationControllerTest" -pl .

# Run with verbose output
mvn test -Dtest="AccessDecisionServiceTest#*" -pl . -Dsurefire.useFile=false