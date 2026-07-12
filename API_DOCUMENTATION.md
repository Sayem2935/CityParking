# DIU Intelligent Parking System (DIPS) — API Documentation

**Version:** 1.0.0
**Base URL:** `http://localhost:8080`
**Last Updated:** 2026-06-14

---

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Vehicles](#vehicles)
4. [Face Enrollment](#face-enrollment)
5. [Face Verification](#face-verification)
6. [Access Verification](#access-verification)
7. [Plate Verification](#plate-verification)
8. [Document Extraction](#document-extraction)
9. [Parking](#parking)

---

## Authentication

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "password": "string",
  "universityId": "string"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "jwt-token",
    "user": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  }
}
```

### POST /api/auth/login

Authenticate an existing user.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt-token",
    "user": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  }
}
```

---

## Users

### GET /api/users/profile

Get the authenticated user's profile. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "universityId": "UNI123",
    "faceEnrolled": true,
    "universityIdExtracted": true
  }
}
```

### PUT /api/users/profile

Update the authenticated user's profile. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }
}
```

---

## Vehicles

### GET /api/vehicles

Get all vehicles for the authenticated user. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "plateNumber": "ABC123",
      "vehicleType": "CAR",
      "make": "Toyota",
      "model": "Camry",
      "color": "Blue"
    }
  ]
}
```

### GET /api/vehicles/{id}

Get a specific vehicle by ID. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (Long) — Vehicle ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "plateNumber": "ABC123",
    "vehicleType": "CAR",
    "make": "Toyota",
    "model": "Camry",
    "color": "Blue"
  }
}
```

### POST /api/vehicles

Create a new vehicle. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "plateNumber": "ABC123",
  "vehicleType": "CAR",
  "make": "Toyota",
  "model": "Camry",
  "color": "Blue"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Vehicle created successfully",
  "data": {
    "id": 1,
    "plateNumber": "ABC123",
    "vehicleType": "CAR",
    "make": "Toyota",
    "model": "Camry",
    "color": "Blue"
  }
}
```

### PUT /api/vehicles/{id}

Update an existing vehicle. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (Long) — Vehicle ID

**Request Body:**
```json
{
  "plateNumber": "ABC123",
  "vehicleType": "CAR",
  "make": "Toyota",
  "model": "Camry",
  "color": "Red"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Vehicle updated successfully",
  "data": {
    "id": 1,
    "plateNumber": "ABC123",
    "vehicleType": "CAR",
    "make": "Toyota",
    "model": "Camry",
    "color": "Red"
  }
}
```

### DELETE /api/vehicles/{id}

Delete a vehicle. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (Long) — Vehicle ID

**Response (200):**
```json
{
  "success": true,
  "message": "Vehicle deleted successfully"
}
```

---

## Face Enrollment

### POST /api/face-enrollment

Enroll a face using a captured image. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** `multipart/form-data`
- `image` (file) — Face image

**Response (200):**
```json
{
  "success": true,
  "message": "Face enrolled successfully",
  "data": {
    "enrolled": true,
    "confidence": 0.95
  }
}
```

### POST /api/face-enrollment/upload

Upload a video for face enrollment processing. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** `multipart/form-data`
- `video` (file) — Face video recording

**Response (200):**
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "uploadId": "uuid",
    "status": "PROCESSING"
  }
}
```

### GET /api/face-enrollment/status

Get the current face enrollment status for the authenticated user. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "enrolled": true,
    "enrolledAt": "2026-01-01T00:00:00Z",
    "confidence": 0.95
  }
}
```

---

## Face Verification

### POST /api/face-verification/verify

Verify a face against the enrolled face data. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** `multipart/form-data`
- `image` (file) — Face image to verify

**Response (200):**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "confidence": 0.92,
    "userId": 1
  }
}
```

---

## Access Verification

### POST /api/access-verification/verify

Verify access using face image and plate number. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** `multipart/form-data`
- `faceImage` (file) — Face image for verification
- `plateNumber` (string) — License plate number
- `zone` (string) — Parking zone

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessGranted": true,
    "faceVerified": true,
    "plateVerified": true,
    "assignedSlot": "A-01",
    "zone": "AB4",
    "reason": "Access granted"
  }
}
```

---

## Plate Verification

### POST /api/plate-verification/verify

Verify a license plate using image detection. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** `multipart/form-data`
- `image` (file) — Vehicle image with visible plate
- `plateNumber` (string) — Expected plate number to verify against

**Response (200):**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "detectedPlate": "ABC123",
    "expectedPlate": "ABC123",
    "confidence": 0.98
  }
}
```

---

## Document Extraction

### POST /api/documents/extract

Extract university ID information from an uploaded document image. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** `multipart/form-data`
- `file` (file) — University ID document image

**Response (200):**
```json
{
  "success": true,
  "data": {
    "extractedId": "UNI123",
    "studentName": "John Doe",
    "university": "City University",
    "confidence": 0.95
  }
}
```

---

## Parking

### GET /api/parking/availability

Get parking availability, optionally filtered by zone. **No authentication required.**

**Query Parameters:**
- `zone` (string, optional) — Filter by parking zone (e.g., "AB4", "ENGINEERING")

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "zone": "AB4",
      "totalSlots": 50,
      "availableSlots": 35,
      "occupiedSlots": 15
    }
  ]
}
```

### POST /api/parking/assign

Assign a parking slot to a vehicle. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "vehicleId": 1,
  "zone": "AB4"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Parking slot assigned successfully",
  "data": {
    "assignmentId": 1,
    "slotNumber": "A-01",
    "zone": "AB4",
    "vehiclePlate": "ABC123",
    "assignedAt": "2026-01-01T00:00:00Z"
  }
}
```

### POST /api/parking/release

Release a parking slot. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "assignmentId": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Parking slot released successfully"
}
```

### GET /api/parking/statistics

Get parking statistics, optionally filtered by zone. **Requires JWT token.**

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `zone` (string, optional) — Filter by parking zone

**Response (200):**
```json
{
  "success": true,
  "data": {
    "zone": "AB4",
    "totalSlots": 50,
    "availableSlots": 35,
    "occupiedSlots": 15,
    "utilizationRate": 0.30,
    "todayEntries": 45,
    "todayExits": 30
  }
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Resource already exists"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt-token>
```

Tokens are obtained via the `/api/auth/login` or `/api/auth/register` endpoints.

---

## Parking Zones

The university parking system supports the following zones:

| Zone | Description |
|------|-------------|
| `AB4` | AB4 Parking Area |
| `ENGINEERING` | Engineering Parking Area |

---

*Total Active Endpoints: 20*