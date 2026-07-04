# CityParking Gate API Reference

**Version:** 1.0.0  
**Last Updated:** July 2026  
**Base URL (Production):** `https://cityparking-2.onrender.com`  
**Base URL (Development):** `http://localhost:8080`  
**Content-Type (Auth):** `application/json`  
**Content-Type (Upload):** `multipart/form-data`

---

## Table of Contents

1. [Authentication](#1-authentication)
   - [POST /api/auth/login](#post-apiauthlogin)
2. [Access Verification (Primary Gate Endpoint)](#2-access-verification-primary-gate-endpoint)
   - [POST /api/access/verify](#post-apiaccessverify)
3. [Face Verification (Standalone)](#3-face-verification-standalone)
   - [POST /api/face-verification/verify](#post-apiface-verificationverify)
4. [Plate Verification (Standalone)](#4-plate-verification-standalone)
   - [POST /api/plate-verification/verify](#post-apiplate-verificationverify)
5. [Face Enrollment Status](#5-face-enrollment-status)
   - [GET /api/face-enrollment/status](#get-apiface-enrollmentstatus)
6. [User Profile](#6-user-profile)
   - [GET /api/users/me](#get-apiusersme)
7. [Health Check](#7-health-check)
8. [Common Response Wrapper](#8-common-response-wrapper)
9. [Recommended Future APIs](#9-recommended-future-apis)

---

## Global Headers

All authenticated endpoints require the following header:

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `Authorization` | String | Yes | `Bearer <jwt-token>` |
| `Content-Type` | String | Yes | `application/json` or `multipart/form-data` |

---

## 1. Authentication

### POST /api/auth/login

Authenticate the gate device and obtain a JWT token.

| Property | Value |
|----------|-------|
| **Method** | POST |
| **URL** | `/api/auth/login` |
| **Content-Type** | `application/json` |
| **Authentication** | None (public endpoint) |
| **Rate Limited** | Yes |

#### Request Body

```json
{
  "email": "string (required, valid email)",
  "password": "string (required)"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | String | Yes | Must be valid email format, not blank |
| `password` | String | Yes | Not blank |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJnYXRlQGNpdHlwYXJraW5nLmNvbSIsImlhdCI6MTcxNzQwMDAwMCwiZXhwIjoxMTcxNzQ4NjQwMH0.signature",
    "type": "Bearer",
    "id": 1,
    "email": "gate@cityparking.com",
    "firstName": "Gate",
    "lastName": "Device",
    "role": "USER"
  },
  "timestamp": "2026-07-04T08:00:00"
}
```

| Response Field | Type | Description |
|----------------|------|-------------|
| `data.token` | String | JWT access token |
| `data.type` | String | Always `"Bearer"` |
| `data.id` | Long | User ID |
| `data.email` | String | Authenticated email |
| `data.firstName` | String | User first name |
| `data.lastName` | String | User last name |
| `data.role` | String | User role (`USER`, `ADMIN`) |

#### Failure Response — `401 Unauthorized`

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

#### Failure Response — `400 Bad Request`

```json
{
  "success": false,
  "message": "Email is required",
  "timestamp": "2026-07-04T08:00:00"
}
```

#### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Login successful |
| `400` | Validation error (missing email/password) |
| `401` | Invalid credentials |
| `429` | Rate limit exceeded |
| `500` | Server error |

#### Timeout Recommendation

| Environment | Timeout |
|-------------|---------|
| Development | 10 seconds |
| Production | 15 seconds |

#### Example curl

```bash
curl -X POST https://cityparking-2.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gate@cityparking.com",
    "password": "GateDevice2026!"
  }'
```

---

## 2. Access Verification (Primary Gate Endpoint)

### POST /api/access/verify

**This is the primary endpoint for the gate device.** Performs dual verification (face + license plate), runs the access decision engine, logs the result, and returns the final decision.

| Property | Value |
|----------|-------|
| **Method** | POST |
| **URL** | `/api/access/verify` |
| **Content-Type** | `multipart/form-data` |
| **Authentication** | Required (`Bearer` token) |
| **Rate Limited** | Yes |

#### Multipart Fields

| Field | Type | Required | Max Size | Description |
|-------|------|----------|----------|-------------|
| `faceImage` | File | Yes | 10 MB | JPEG/PNG face image of the driver |
| `plateImage` | File | Yes | 10 MB | JPEG/PNG image of the license plate |

**Validation Rules:**
- Both fields are required and must not be empty
- Content type must start with `image/` (JPEG or PNG)
- Maximum file size: 10 MB per image

#### Success Response — `200 OK` (ACCESS_GRANTED)

```json
{
  "success": true,
  "message": "Verification completed",
  "data": {
    "decision": "ACCESS_GRANTED",
    "userId": 1,
    "vehicleId": 1,
    "faceConfidence": 0.92,
    "plateConfidence": 0.95,
    "faceVerified": true,
    "plateVerified": true,
    "detectedPlate": "DHAKA-METRO-GA-1234",
    "faceMessage": "Face verified successfully",
    "plateMessage": "Plate matched with registered vehicle",
    "message": "Access granted. Both face and vehicle verified successfully.",
    "processingTimeMs": 1250.5,
    "accessLogId": 42,
    "securityEventIds": [],
    "timestamp": "2026-07-04T08:30:00"
  },
  "timestamp": "2026-07-04T08:30:00"
}
```

#### Success Response — `200 OK` (ACCESS_DENIED — Face Mismatch)

```json
{
  "success": true,
  "message": "Verification completed",
  "data": {
    "decision": "ACCESS_DENIED",
    "userId": null,
    "vehicleId": null,
    "faceConfidence": 0.15,
    "plateConfidence": 0.88,
    "faceVerified": false,
    "plateVerified": false,
    "detectedPlate": "DHAKA-METRO-GA-1234",
    "faceMessage": "No matching face found",
    "plateMessage": "Cannot verify plate without face match",
    "message": "Access denied. Verification failed. Please contact security if you believe this is an error.",
    "processingTimeMs": 980.3,
    "accessLogId": 43,
    "securityEventIds": [12],
    "timestamp": "2026-07-04T08:32:00"
  },
  "timestamp": "2026-07-04T08:32:00"
}
```

#### Success Response — `200 OK` (SECURITY_ALERT — Plate Mismatch)

```json
{
  "success": true,
  "message": "Verification completed",
  "data": {
    "decision": "SECURITY_ALERT",
    "userId": 1,
    "vehicleId": null,
    "faceConfidence": 0.89,
    "plateConfidence": 0.72,
    "faceVerified": true,
    "plateVerified": false,
    "detectedPlate": "UNKNOWN-PLATE-9999",
    "faceMessage": "Face verified successfully",
    "plateMessage": "Plate does not match any registered vehicle for this user",
    "message": "Security alert triggered. Face verified but vehicle plate does not match registered vehicles. Security has been notified.",
    "processingTimeMs": 1450.8,
    "accessLogId": 44,
    "securityEventIds": [13, 14],
    "timestamp": "2026-07-04T08:35:00"
  },
  "timestamp": "2026-07-04T08:35:00"
}
```

#### Response Field Reference

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `decision` | String (enum) | No | `ACCESS_GRANTED`, `ACCESS_DENIED`, `SECURITY_ALERT` |
| `userId` | Long | Yes | Matched user ID (null if face not verified) |
| `vehicleId` | Long | Yes | Matched vehicle ID (null if plate not verified) |
| `faceConfidence` | Double | No | Face match confidence score (0.0–1.0) |
| `plateConfidence` | Double | No | Plate match confidence score (0.0–1.0) |
| `faceVerified` | Boolean | No | Whether face was successfully verified |
| `plateVerified` | Boolean | No | Whether plate was successfully verified |
| `detectedPlate` | String | Yes | Detected plate number text |
| `faceMessage` | String | Yes | Face verification status message |
| `plateMessage` | String | Yes | Plate verification status message |
| `message` | String | No | Human-readable decision message |
| `processingTimeMs` | Double | No | Total server processing time in milliseconds |
| `accessLogId` | Long | Yes | Access log record ID for audit trail |
| `securityEventIds` | Array[Long] | No | Security event IDs (populated on alerts) |
| `timestamp` | LocalDateTime | No | Verification timestamp |

#### Decision Engine Logic

| Face Verified | Plate Verified | Decision |
|---------------|----------------|----------|
| ✅ Yes | ✅ Yes (matches user's vehicle) | `ACCESS_GRANTED` |
| ❌ No | Any | `ACCESS_DENIED` |
| ✅ Yes | ❌ No (plate doesn't match) | `SECURITY_ALERT` |
| ✅ Yes | ❌ No (no plate detected) | `SECURITY_ALERT` |

#### Failure Response — `400 Bad Request`

```json
{
  "success": false,
  "message": "faceImage is required and cannot be empty",
  "timestamp": "2026-07-04T08:00:00"
}
```

Possible `400` messages:
- `faceImage is required and cannot be empty`
- `plateImage is required and cannot be empty`
- `faceImage must be an image (JPEG, PNG). Received: application/pdf`
- `plateImage size exceeds maximum allowed size of 10MB`
- `Failed to read face image: <io-error>`

#### Failure Response — `401 Unauthorized`

```json
{
  "success": false,
  "message": "Unauthorized: Authentication required"
}
```

#### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Verification completed (check `data.decision` for result) |
| `400` | Invalid request (missing images, wrong format, file too large) |
| `401` | Unauthorized (missing, expired, or invalid JWT token) |
| `403` | Forbidden (insufficient permissions) |
| `429` | Rate limit exceeded |
| `500` | Internal server error |
| `503` | AI service unavailable |

#### Timeout Recommendation

| Environment | Timeout | Reason |
|-------------|---------|--------|
| Development | 30 seconds | FastAPI cold start can be slow |
| Production | 20 seconds | Includes face embedding + plate detection |
| Minimum | 15 seconds | InsightFace inference takes 1–3 seconds |

#### Example curl

```bash
curl -X POST https://cityparking-2.onrender.com/api/access/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -F "faceImage=@/path/to/face.jpg;type=image/jpeg" \
  -F "plateImage=@/path/to/plate.jpg;type=image/jpeg" \
  --max-time 20
```

---

## 3. Face Verification (Standalone)

### POST /api/face-verification/verify

Performs face-only verification against enrolled faces. Does NOT include plate verification or access decision logic.

| Property | Value |
|----------|-------|
| **Method** | POST |
| **URL** | `/api/face-verification/verify` |
| **Content-Type** | `multipart/form-data` |
| **Authentication** | Required (`Bearer` token) |
| **Rate Limited** | Yes |

#### Multipart Fields

| Field | Type | Required | Max Size | Description |
|-------|------|----------|----------|-------------|
| `image` | File | Yes | 10 MB | JPEG/PNG face image |

#### Success Response — `200 OK` (Face Matched)

```json
{
  "success": true,
  "message": "Face verification completed",
  "data": {
    "verified": true,
    "userId": 1,
    "confidence": 0.92,
    "message": "Face verified successfully",
    "matchedUserName": "John Doe"
  },
  "timestamp": "2026-07-04T08:30:00"
}
```

#### Success Response — `200 OK` (Face Not Matched)

```json
{
  "success": true,
  "message": "Face verification completed",
  "data": {
    "verified": false,
    "userId": null,
    "confidence": 0.15,
    "message": "No matching face found",
    "matchedUserName": null
  },
  "timestamp": "2026-07-04T08:30:00"
}
```

#### Response Field Reference

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `verified` | Boolean | No | Whether a matching face was found |
| `userId` | Long | Yes | Matched user ID (null if no match) |
| `confidence` | Double | No | Match confidence score (0.0–1.0) |
| `message` | String | Yes | Verification status message |
| `matchedUserName` | String | Yes | Name of matched user (null if no match) |

#### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Verification completed |
| `400` | Invalid image (missing, empty, wrong format, too large) |
| `401` | Unauthorized |
| `429` | Rate limited |
| `500` | Server error |

#### Timeout Recommendation

| Environment | Timeout |
|-------------|---------|
| Development | 20 seconds |
| Production | 15 seconds |

#### Example curl

```bash
curl -X POST https://cityparking-2.onrender.com/api/face-verification/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -F "image=@/path/to/face.jpg;type=image/jpeg" \
  --max-time 15
```

---

## 4. Plate Verification (Standalone)

### POST /api/plate-verification/verify

Performs license plate detection and verification against a user's registered vehicles.

| Property | Value |
|----------|-------|
| **Method** | POST |
| **URL** | `/api/plate-verification/verify` |
| **Content-Type** | `multipart/form-data` |
| **Authentication** | Required (`Bearer` token) |
| **Rate Limited** | Yes |

#### Multipart Fields

| Field | Type | Required | Max Size | Description |
|-------|------|----------|----------|-------------|
| `image` | File | Yes | 10 MB | JPEG/PNG license plate image |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Plate verification completed",
  "data": {
    "verified": true,
    "detectedPlate": "DHAKA-METRO-GA-1234",
    "confidence": 0.95,
    "matchedVehicleId": 1,
    "message": "Plate matched with registered vehicle"
  },
  "timestamp": "2026-07-04T08:30:00"
}
```

#### Response Field Reference

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `verified` | Boolean | No | Whether plate matched a registered vehicle |
| `detectedPlate` | String | Yes | Detected plate text |
| `confidence` | Double | No | Detection confidence (0.0–1.0) |
| `matchedVehicleId` | Long | Yes | Matched vehicle ID (null if no match) |
| `message` | String | Yes | Verification status message |

#### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Verification completed |
| `400` | Invalid image |
| `401` | Unauthorized |
| `429` | Rate limited |
| `500` | Server error |

#### Example curl

```bash
curl -X POST https://cityparking-2.onrender.com/api/plate-verification/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -F "image=@/path/to/plate.jpg;type=image/jpeg" \
  --max-time 15
```

---

## 5. Face Enrollment Status

### GET /api/face-enrollment/status

Check whether the authenticated user has completed face enrollment. Useful for the gate device to verify that a user's face is enrolled before attempting verification.

| Property | Value |
|----------|-------|
| **Method** | GET |
| **URL** | `/api/face-enrollment/status` |
| **Content-Type** | N/A |
| **Authentication** | Required (`Bearer` token) |
| **Rate Limited** | Yes |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Enrollment status retrieved",
  "data": {
    "enrolled": true,
    "status": "COMPLETED",
    "imageCount": 5,
    "enrolledAt": "2026-07-01T10:00:00"
  },
  "timestamp": "2026-07-04T08:00:00"
}
```

#### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Status retrieved |
| `401` | Unauthorized |
| `404` | No enrollment record found |

#### Example curl

```bash
curl -X GET https://cityparking-2.onrender.com/api/face-enrollment/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

## 6. User Profile

### GET /api/users/me

Retrieve the authenticated user's profile. Useful for the gate device to display user information or verify user identity.

| Property | Value |
|----------|-------|
| **Method** | GET |
| **URL** | `/api/users/me` |
| **Content-Type** | N/A |
| **Authentication** | Required (`Bearer` token) |
| **Rate Limited** | Yes |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "User profile retrieved",
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@university.edu",
    "role": "USER",
    "universityId": "STU-2026-001",
    "createdAt": "2026-06-01T10:00:00"
  },
  "timestamp": "2026-07-04T08:00:00"
}
```

#### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Profile retrieved |
| `401` | Unauthorized |
| `404` | User not found |

#### Example curl

```bash
curl -X GET https://cityparking-2.onrender.com/api/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

## 7. Health Check

### GET /actuator/health

Check if the backend server is running. This endpoint is only accessible from localhost by default.

| Property | Value |
|----------|-------|
| **Method** | GET |
| **URL** | `/actuator/health` |
| **Authentication** | None (localhost only) |

#### Success Response — `200 OK`

```json
{
  "status": "UP"
}
```

> **Note:** This endpoint is restricted to localhost access by default. For the Raspberry Pi, use a simple GET to any public endpoint (e.g., `GET /api/parking/availability`) to verify connectivity.

#### Example curl (from server)

```bash
curl http://localhost:8080/actuator/health
```

---

## 8. Common Response Wrapper

All API responses are wrapped in the `ApiResponse<T>` format:

```json
{
  "success": true | false,
  "message": "string",
  "data": { ... },
  "timestamp": "2026-07-04T08:30:00"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Whether the request was processed successfully |
| `message` | String | Human-readable status message |
| `data` | Object | Response payload (type varies by endpoint) |
| `timestamp` | String | ISO 8601 timestamp of the response |

**Error responses** may omit `data`:

```json
{
  "success": false,
  "message": "Unauthorized: Authentication required"
}
```

---

## 9. Recommended Future APIs

The following endpoints are **not yet implemented** but are recommended for the gate device:

### POST /api/gate/heartbeat

**Purpose:** Allow the Raspberry Pi to report its health status to the server periodically.

**Recommended Request:**
```json
{
  "deviceId": "gate-pi-001",
  "uptime": 86400,
  "cameraStatus": "OK",
  "relayStatus": "OK",
  "networkLatency": 45,
  "firmwareVersion": "1.0.0"
}
```

**Recommended Response:**
```json
{
  "success": true,
  "data": {
    "serverTime": "2026-07-04T08:30:00",
    "commands": [],
    "configVersion": 1
  }
}
```

### POST /api/gate/alert

**Purpose:** Allow the Raspberry Pi to report hardware issues (camera disconnected, relay failure, etc.)

**Recommended Request:**
```json
{
  "deviceId": "gate-pi-001",
  "alertType": "CAMERA_DISCONNECTED",
  "message": "USB Camera 0 not found",
  "severity": "HIGH"
}
```

### GET /api/gate/config

**Purpose:** Allow the Raspberry Pi to fetch its configuration from the server (remote config management).

**Recommended Response:**
```json
{
  "success": true,
  "data": {
    "gateOpenDurationMs": 5000,
    "captureResolution": "1280x720",
    "captureQuality": 90,
    "maxRetryAttempts": 3,
    "sensorThresholdCm": 150,
    "cooldownSeconds": 10
  }
}
```

### POST /api/gate/access-log

**Purpose:** Allow the Raspberry Pi to report offline-cached access attempts when connectivity is restored.

---

## Appendix: JWT Token Structure

The JWT token issued by the backend uses HS256 signing with the following claims:

```json
{
  "sub": "gate@cityparking.com",
  "iat": 1717400000,
  "exp": 11717486400
}
```

| Claim | Description |
|-------|-------------|
| `sub` | Subject (user email) |
| `iat` | Issued at (Unix timestamp) |
| `exp` | Expiration (Unix timestamp, default 24 hours from `iat`) |