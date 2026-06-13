# CityParking API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:8080`  
**Backend:** Spring Boot 3.x (Java 17+)  
**Database:** PostgreSQL  
**Authentication:** JWT (JSON Web Tokens)  
**Security:** Spring Security + JWT Filter Chain

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Authentication & Security](#2-authentication--security)
3. [API Endpoints](#3-api-endpoints)
   - [3.1 Auth API](#31-auth-api)
   - [3.2 User API](#32-user-api)
   - [3.3 Vehicle API](#33-vehicle-api)
   - [3.4 Face Enrollment API](#34-face-enrollment-api)
   - [3.5 Face Verification API](#35-face-verification-api)
   - [3.6 Plate Verification API](#36-plate-verification-api)
   - [3.7 Access Verification API](#37-access-verification-api)
   - [3.8 Parking API](#38-parking-api)
   - [3.9 Document Extraction API](#39-document-extraction-api)
4. [API Summary Table](#4-api-summary-table)
5. [Database Schema](#5-database-schema)
6. [Error Handling](#6-error-handling)
7. [File Upload Specifications](#7-file-upload-specifications)
8. [Examples](#8-examples)

---

## 1. Project Architecture

### Request Flow

```
Client (React/Vite) → Spring Security Filter Chain → JwtAuthenticationFilter
→ Controller → Service → Repository → PostgreSQL
```

### Application Layers

| Layer | Description |
|-------|-------------|
| **Controllers** | Handle HTTP requests, validate input, delegate to services |
| **Services** | Business logic layer |
| **Repositories** | Data access layer (Spring Data JPA) |
| **Entities** | JPA entity classes mapping to database tables |
| **DTOs** | Data Transfer Objects for request/response payloads |
| **Security** | JWT authentication, role-based access control |
| **Config** | Application configuration (security, async, file upload, AI providers) |
| **Exception** | Global exception handling |

### Controllers

| Controller | Base Path |
|-----------|-----------|
| AuthController | `/api/auth/**` |
| UserController | `/api/users/**` |
| VehicleController | `/api/vehicles/**` |
| FaceEnrollmentController | `/api/face-enrollment/**` |
| FaceVerificationController | `/api/face-verification/**` |
| PlateVerificationController | `/api/plate-verification/**` |
| AccessVerificationController | `/api/access-verification/**` |
| ParkingController | `/api/parking/**` |
| DocumentExtractionController | `/api/documents/**` |

### Services

- AuthService
- UserService
- VehicleService
- FaceEnrollmentService
- FaceVerificationService
- PlateRecognitionService
- AccessDecisionService
- ParkingSlotService
- ParkingAssignmentService
- FileStorageService / LocalStorageService
- FaceRecognitionService (interface)
- AwsRekognitionService (implementation)
- MockFaceRecognitionService (mock implementation)
- GeminiService / GeminiServiceImpl
- MockGeminiService
- DocumentExtractionService / MockGeminiDocumentService

### Repositories

- UserRepository
- VehicleRepository
- FaceEnrollmentRepository
- AccessLogRepository
- AccessDecisionRepository
- SecurityEventRepository
- PlateVerificationLogRepository
- ParkingSlotRepository
- ParkingAssignmentRepository
- ParkingScanLogRepository
- ParkingOccupancyHistoryRepository

### Entities

- User
- Vehicle
- FaceEnrollment
- AccessLog
- AccessDecision (enum)
- SecurityEvent
- SecurityEventType (enum)
- PlateVerificationLog
- ParkingSlot
- ParkingAssignment
- ParkingScanLog
- ParkingOccupancyHistory

### DTOs

- RegisterRequest, LoginRequest, AuthResponse
- UpdateProfileRequest, UserResponse
- VehicleRequest, VehicleResponse
- FaceEnrollmentRequest, FaceEnrollmentResponse, FaceEnrollmentUploadResponse, FaceEnrollmentStatusResponse
- FaceVerificationResponse
- PlateDetectionResult, PlateVerificationResponse
- AccessVerificationResponse
- ApiResponse\<T\>
- ParkingSlotResponse, ParkingAssignmentResponse, AvailabilityResponse
- ParkingScanRequest, AssignSlotRequest, ScanResultResponse, ParkingStatisticsResponse
- DocumentExtractionResult

---

## 2. Authentication & Security

### Authentication Mechanism

- **JWT (JSON Web Token)** based authentication
- Tokens are generated upon successful login/registration
- Token is passed in the `Authorization` header as: `Bearer <token>`
- `JwtAuthenticationFilter` intercepts requests and validates tokens
- `CustomUserDetailsService` loads user details from database

### Token Structure

- Contains user email as subject
- Signed with a secret key (configured in `application.yml`)
- Has configurable expiration time

### Roles

| Role | Description |
|------|-------------|
| `USER` | Standard user role |
| `ADMIN` | Administrator role |

### Public Endpoints (No Authentication Required)

- `POST /api/auth/register`
- `POST /api/auth/login`

### Protected Endpoints

All other endpoints require a valid JWT token:

```
Authorization: Bearer <JWT_TOKEN>
```

### Security Features

- CSRF disabled (stateless API)
- CORS configured for frontend origin
- Rate limiting filter (`RateLimitingFilter`)
- File upload security (`FileUploadSecurity`)
- Password encryption with BCrypt
- Soft-delete for users (preserves audit trail)

---

## 3. API Endpoints

---

### 3.1 Auth API

---

#### User Registration

| Property | Value |
|----------|-------|
| **Endpoint Name** | User Registration |
| **Description** | Creates a new user account. Returns JWT token and user details upon success. |
| **Controller** | AuthController |
| **Method** | `POST` |
| **Path** | `/api/auth/register` |
| **Authentication** | No (Public) |
| **Role Required** | None |

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "StrongPassword123"
}
```

**Field Details:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| firstName | String | Yes | Must not be blank, Max 100 chars | User's first name |
| lastName | String | Yes | Must not be blank, Max 100 chars | User's last name |
| email | String | Yes | Valid email, not blank, Max 255 chars, Unique | User's email (login identifier) |
| password | String | Yes | Not blank, Min 6 chars | User's password (stored as BCrypt hash) |

**Success Response (200):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "user": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": null,
      "avatarUrl": null,
      "role": "USER",
      "isActive": true,
      "createdAt": "2026-01-15T10:30:00"
    }
  }
}
```

**Error Responses:**

| Status | Condition | Example Response |
|--------|-----------|-----------------|
| 400 | Validation failed | `{ "success": false, "message": "Validation failed", "data": null, "errors": ["firstName: First name is required", "email: Email must be valid"] }` |
| 409 | Duplicate email | `{ "success": false, "message": "Email already registered", "data": null }` |
| 500 | Server error | `{ "success": false, "message": "Internal server error", "data": null }` |

**Database Impact:**
- **Tables:** `users`
- **Operation:** INSERT
- **Entity:** User

---

#### User Login

| Property | Value |
|----------|-------|
| **Endpoint Name** | User Login |
| **Description** | Authenticates a user with email and password. Returns JWT token and user details. |
| **Controller** | AuthController |
| **Method** | `POST` |
| **Path** | `/api/auth/login` |
| **Authentication** | No (Public) |
| **Role Required** | None |

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "john.doe@example.com",
  "password": "StrongPassword123"
}
```

**Field Details:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| email | String | Yes | Valid email, not blank | Registered email address |
| password | String | Yes | Not blank | User's password |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "user": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": null,
      "avatarUrl": null,
      "role": "USER",
      "isActive": true,
      "createdAt": "2026-01-15T10:30:00"
    }
  }
}
```

**Error Responses:**

| Status | Condition | Example Response |
|--------|-----------|-----------------|
| 400 | Validation failed | `{ "success": false, "message": "Validation failed", "data": null, "errors": ["email: Email is required", "password: Password is required"] }` |
| 401 | Invalid credentials | `{ "success": false, "message": "Invalid email or password", "data": null }` |

**Database Impact:**
- **Tables:** `users`
- **Operation:** READ
- **Entity:** User

---

### 3.2 User API

---

#### Get User Profile

| Property | Value |
|----------|-------|
| **Endpoint Name** | Get User Profile |
| **Description** | Retrieves the authenticated user's profile information including university ID fields. |
| **Controller** | UserController |
| **Method** | `GET` |
| **Path** | `/api/users/profile` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Request Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+880123456789",
    "avatarUrl": "https://example.com/avatar.jpg",
    "role": "USER",
    "isActive": true,
    "studentName": "John Doe",
    "studentId": "STU-2026-001",
    "universityName": "City University",
    "department": "Computer Science",
    "session": "2025-2026",
    "createdAt": "2026-01-15T10:30:00",
    "updatedAt": "2026-01-20T14:00:00"
  }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 401 | Unauthorized |
| 404 | User not found |

**Database Impact:**
- **Tables:** `users`
- **Operation:** READ
- **Entity:** User

---

#### Update User Profile

| Property | Value |
|----------|-------|
| **Endpoint Name** | Update User Profile |
| **Description** | Updates the authenticated user's profile information. Partial updates supported. |
| **Controller** | UserController |
| **Method** | `PUT` |
| **Path** | `/api/users/profile` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Request Headers:**

```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe Updated",
  "phone": "+880987654321",
  "avatarUrl": "https://example.com/new-avatar.jpg",
  "studentName": "John Doe",
  "studentId": "STU-2026-001",
  "universityName": "City University",
  "department": "Computer Science",
  "session": "2025-2026"
}
```

**Field Details:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| firstName | String | Optional | Max 100 chars | Updated first name |
| lastName | String | Optional | Max 100 chars | Updated last name |
| phone | String | Optional | Max 20 chars | Updated phone number |
| avatarUrl | String | Optional | Max 500 chars | URL to user's avatar image |
| studentName | String | Optional | Max 200 chars | Student name from university ID |
| studentId | String | Optional | Max 100 chars | University student ID number |
| universityName | String | Optional | Max 200 chars | Name of the university |
| department | String | Optional | Max 200 chars | Academic department |
| session | String | Optional | Max 50 chars | Academic session (e.g., "2025-2026") |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe Updated",
    "email": "john.doe@example.com",
    "phone": "+880987654321",
    "avatarUrl": "https://example.com/new-avatar.jpg",
    "role": "USER",
    "isActive": true,
    "studentName": "John Doe",
    "studentId": "STU-2026-001",
    "universityName": "City University",
    "department": "Computer Science",
    "session": "2025-2026",
    "createdAt": "2026-01-15T10:30:00",
    "updatedAt": "2026-01-20T15:00:00"
  }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Validation failed |
| 401 | Unauthorized |
| 404 | User not found |

**Database Impact:**
- **Tables:** `users`
- **Operation:** UPDATE
- **Entity:** User

---

### 3.3 Vehicle API

---

#### Get All User Vehicles

| Property | Value |
|----------|-------|
| **Endpoint Name** | Get All User Vehicles |
| **Description** | Retrieves all vehicles belonging to the authenticated user. |
| **Controller** | VehicleController |
| **Method** | `GET` |
| **Path** | `/api/vehicles` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Request Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Vehicles retrieved successfully",
  "data": [
    {
      "id": 1,
      "licensePlate": "ABC-1234",
      "make": "Toyota",
      "model": "Camry",
      "year": 2024,
      "color": "White",
      "vehicleType": "Sedan",
      "isDefault": true,
      "createdAt": "2026-01-15T10:30:00",
      "updatedAt": "2026-01-15T10:30:00"
    }
  ]
}
```

**Database Impact:**
- **Tables:** `vehicles`
- **Operation:** READ
- **Entity:** Vehicle

---

#### Get Vehicle by ID

| Property | Value |
|----------|-------|
| **Endpoint Name** | Get Vehicle by ID |
| **Description** | Retrieves a specific vehicle by its ID. Only returns vehicles belonging to the authenticated user. |
| **Controller** | VehicleController |
| **Method** | `GET` |
| **Path** | `/api/vehicles/{id}` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | Long | Yes | Vehicle ID |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Vehicle retrieved successfully",
  "data": {
    "id": 1,
    "licensePlate": "ABC-1234",
    "make": "Toyota",
    "model": "Camry",
    "year": 2024,
    "color": "White",
    "vehicleType": "Sedan",
    "isDefault": true,
    "createdAt": "2026-01-15T10:30:00",
    "updatedAt": "2026-01-15T10:30:00"
  }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 401 | Unauthorized |
| 404 | Vehicle not found |

**Database Impact:**
- **Tables:** `vehicles`
- **Operation:** READ
- **Entity:** Vehicle

---

#### Create Vehicle

| Property | Value |
|----------|-------|
| **Endpoint Name** | Create Vehicle |
| **Description** | Registers a new vehicle for the authenticated user. |
| **Controller** | VehicleController |
| **Method** | `POST` |
| **Path** | `/api/vehicles` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Request Headers:**

```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "licensePlate": "ABC-1234",
  "make": "Toyota",
  "model": "Camry",
  "year": 2024,
  "color": "White",
  "vehicleType": "Sedan",
  "isDefault": true
}
```

**Field Details:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| licensePlate | String | Yes | Not blank, Max 20 chars, Unique per user | Vehicle license plate number |
| make | String | Yes | Not blank, Max 100 chars | Vehicle manufacturer |
| model | String | Yes | Not blank, Max 100 chars | Vehicle model |
| year | Integer | Yes | Not null, Min 1900, Max 2100 | Vehicle manufacturing year |
| color | String | Optional | Max 50 chars | Vehicle color |
| vehicleType | String | Optional | Max 50 chars | Type of vehicle |
| isDefault | Boolean | Optional | Defaults to false | Whether this is the default vehicle |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Vehicle created successfully",
  "data": {
    "id": 1,
    "licensePlate": "ABC-1234",
    "make": "Toyota",
    "model": "Camry",
    "year": 2024,
    "color": "White",
    "vehicleType": "Sedan",
    "isDefault": true,
    "createdAt": "2026-01-15T10:30:00",
    "updatedAt": "2026-01-15T10:30:00"
  }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Validation failed |
| 401 | Unauthorized |
| 409 | Duplicate license plate for this user |

**Database Impact:**
- **Tables:** `vehicles`
- **Operation:** INSERT
- **Entity:** Vehicle

---

#### Update Vehicle

| Property | Value |
|----------|-------|
| **Endpoint Name** | Update Vehicle |
| **Description** | Updates an existing vehicle belonging to the authenticated user. |
| **Controller** | VehicleController |
| **Method** | `PUT` |
| **Path** | `/api/vehicles/{id}` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | Long | Yes | Vehicle ID |

**Request Body:** (Same fields as Create Vehicle)

**Success Response (200):**

```json
{
  "success": true,
  "message": "Vehicle updated successfully",
  "data": {
    "id": 1,
    "licensePlate": "XYZ-5678",
    "make": "Honda",
    "model": "Civic",
    "year": 2025,
    "color": "Black",
    "vehicleType": "Sedan",
    "isDefault": false,
    "createdAt": "2026-01-15T10:30:00",
    "updatedAt": "2026-01-16T09:00:00"
  }
}
```

**Database Impact:**
- **Tables:** `vehicles`
- **Operation:** UPDATE
- **Entity:** Vehicle

---

#### Delete Vehicle

| Property | Value |
|----------|-------|
| **Endpoint Name** | Delete Vehicle |
| **Description** | Deletes a vehicle belonging to the authenticated user. |
| **Controller** | VehicleController |
| **Method** | `DELETE` |
| **Path** | `/api/vehicles/{id}` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | Long | Yes | Vehicle ID |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Vehicle deleted successfully",
  "data": null
}
```

**Database Impact:**
- **Tables:** `vehicles`
- **Operation:** DELETE
- **Entity:** Vehicle

---

### 3.4 Face Enrollment API

---

#### Upload Face Enrollment Video

| Property | Value |
|----------|-------|
| **Endpoint Name** | Upload Face Enrollment Video |
| **Description** | Uploads a video file for face enrollment. The system extracts frames and processes face data for enrollment with the configured face recognition provider (AWS Rekognition or mock). |
| **Controller** | FaceEnrollmentController |
| **Method** | `POST` |
| **Path** | `/api/face-enrollment/upload` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Request Headers:**

```
Content-Type: multipart/form-data
Authorization: Bearer <JWT_TOKEN>
```

**Request Body (multipart/form-data):**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| video | File | Yes | Max 100MB | Video recording of user's face |
| notes | String | Optional | Max 1000 chars | Optional enrollment notes |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Face enrollment video uploaded successfully",
  "data": {
    "enrollmentId": 1,
    "videoUrl": "https://storage.example.com/videos/face_enrollment_1.mp4",
    "status": "PENDING",
    "message": "Video uploaded and queued for processing",
    "uploadedAt": "2026-01-15T10:30:00"
  }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | No video file provided |
| 401 | Unauthorized |
| 413 | File size exceeds maximum |

**Database Impact:**
- **Tables:** `face_enrollments`
- **Operation:** INSERT
- **Entity:** FaceEnrollment

---

#### Get Face Enrollment Status

| Property | Value |
|----------|-------|
| **Endpoint Name** | Get Face Enrollment Status |
| **Description** | Retrieves the status of a face enrollment by its ID. |
| **Controller** | FaceEnrollmentController |
| **Method** | `GET` |
| **Path** | `/api/face-enrollment/{id}/status` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | Long | Yes | Face enrollment ID |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Enrollment status retrieved",
  "data": {
    "enrollmentId": 1,
    "status": "ENROLLED",
    "videoUrl": "https://storage.example.com/videos/face_enrollment_1.mp4",
    "imagePath": "/storage/images/face_1.jpg",
    "externalFaceId": "rekognition-face-id-123",
    "collectionId": "cityparking-faces",
    "provider": "AWS_REKOGNITION",
    "confidence": 99.5,
    "processingAttempts": 1,
    "errorMessage": null,
    "enrolledAt": "2026-01-15T10:35:00",
    "createdAt": "2026-01-15T10:30:00",
    "updatedAt": "2026-01-15T10:35:00"
  }
}
```

**Database Impact:**
- **Tables:** `face_enrollments`
- **Operation:** READ
- **Entity:** FaceEnrollment

---

#### Get All Face Enrollments

| Property | Value |
|----------|-------|
| **Endpoint Name** | Get All Face Enrollments |
| **Description** | Retrieves all face enrollment records for the authenticated user. |
| **Controller** | FaceEnrollmentController |
| **Method** | `GET` |
| **Path** | `/api/face-enrollment` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Enrollments retrieved",
  "data": [
    {
      "enrollmentId": 1,
      "status": "ENROLLED",
      "videoUrl": "https://storage.example.com/videos/face_enrollment_1.mp4",
      "imagePath": "/storage/images/face_1.jpg",
      "externalFaceId": "rekognition-face-id-123",
      "collectionId": "cityparking-faces",
      "provider": "AWS_REKOGNITION",
      "confidence": 99.5,
      "processingAttempts": 1,
      "errorMessage": null,
      "enrolledAt": "2026-01-15T10:35:00",
      "createdAt": "2026-01-15T10:30:00",
      "updatedAt": "2026-01-15T10:35:00"
    }
  ]
}
```

**Database Impact:**
- **Tables:** `face_enrollments`
- **Operation:** READ
- **Entity:** FaceEnrollment

---

### 3.5 Face Verification API

---

#### Verify Face

| Property | Value |
|----------|-------|
| **Endpoint Name** | Verify Face |
| **Description** | Verifies a face image against the enrolled face data for the authenticated user using the configured face recognition provider. |
| **Controller** | FaceVerificationController |
| **Method** | `POST` |
| **Path** | `/api/face-verification/verify` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Request Headers:**

```
Content-Type: multipart/form-data
Authorization: Bearer <JWT_TOKEN>
```

**Request Body (multipart/form-data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| image | File | Yes | Image file containing the face to verify |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Face verification completed",
  "data": {
    "verified": true,
    "confidence": 98.5,
    "externalFaceId": "rekognition-face-id-123",
    "provider": "AWS_REKOGNITION",
    "message": "Face verified successfully"
  }
}
```

**Database Impact:**
- **Tables:** `face_enrollments`
- **Operation:** READ
- **Entity:** FaceEnrollment

---

### 3.6 Plate Verification API

---

#### Verify License Plate

| Property | Value |
|----------|-------|
| **Endpoint Name** | Verify License Plate |
| **Description** | Verifies a license plate image by detecting the plate number using AI and matching it against the user's registered vehicles. |
| **Controller** | PlateVerificationController |
| **Method** | `POST` |
| **Path** | `/api/plate-verification/verify` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Request Headers:**

```
Content-Type: multipart/form-data
Authorization: Bearer <JWT_TOKEN>
```

**Request Body (multipart/form-data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| image | File | Yes | Image file containing the license plate to verify |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Plate verification completed",
  "data": {
    "detectedPlate": "ABC-1234",
    "confidence": 95.2,
    "matched": true,
    "matchedVehicle": {
      "id": 1,
      "licensePlate": "ABC-1234",
      "make": "Toyota",
      "model": "Camry",
      "year": 2024
    },
    "message": "Plate matched to registered vehicle"
  }
}
```

**Database Impact:**
- **Tables:** `plate_verification_logs`, `vehicles`
- **Operation:** READ (vehicles), INSERT (plate_verification_logs)
- **Entity:** PlateVerificationLog, Vehicle

---

### 3.7 Access Verification API

---

#### Verify Access

| Property | Value |
|----------|-------|
| **Endpoint Name** | Verify Access |
| **Description** | Performs combined access verification including both face verification and plate verification. Returns an access decision based on the combined results. This is the primary entry point for parking gate access control. |
| **Controller** | AccessVerificationController |
| **Method** | `POST` |
| **Path** | `/api/access-verification/verify` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Request Headers:**

```
Content-Type: multipart/form-data
Authorization: Bearer <JWT_TOKEN>
```

**Request Body (multipart/form-data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| faceImage | File | Yes | Image file containing the face for verification |
| plateImage | File | Yes | Image file containing the license plate for verification |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Access verification completed",
  "data": {
    "decision": "ACCESS_GRANTED",
    "faceVerified": true,
    "plateVerified": true,
    "faceConfidence": 98.5,
    "plateConfidence": 95.2,
    "detectedPlate": "ABC-1234",
    "faceMessage": "Face verified successfully",
    "plateMessage": "Plate matched to registered vehicle",
    "processingTimeMs": 1250.5
  }
}
```

**Possible Decisions:**

| Decision | Description |
|----------|-------------|
| ACCESS_GRANTED | Both face and plate verified successfully |
| ACCESS_DENIED | One or both verifications failed |
| SECURITY_ALERT | Suspicious activity detected |

**Database Impact:**
- **Tables:** `access_logs`, `security_events`
- **Operation:** INSERT
- **Entity:** AccessLog, SecurityEvent

---

### 3.8 Parking API

---

#### Get Parking Slots

| Property | Value |
|----------|-------|
| **Endpoint Name** | Get Parking Slots |
| **Description** | Retrieves all parking slots with their current status. |
| **Controller** | ParkingController |
| **Method** | `GET` |
| **Path** | `/api/parking/slots` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Parking slots retrieved",
  "data": [
    {
      "id": 1,
      "slotNumber": "A-001",
      "zone": "Zone A",
      "status": "AVAILABLE",
      "slotType": "REGULAR",
      "floor": 1,
      "section": "A"
    }
  ]
}
```

**Database Impact:**
- **Tables:** `parking_slots`
- **Operation:** READ
- **Entity:** ParkingSlot

---

#### Get Parking Availability

| Property | Value |
|----------|-------|
| **Endpoint Name** | Get Parking Availability |
| **Description** | Retrieves current parking availability statistics. |
| **Controller** | ParkingController |
| **Method** | `GET` |
| **Path** | `/api/parking/availability` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Availability retrieved",
  "data": {
    "totalSlots": 100,
    "availableSlots": 45,
    "occupiedSlots": 50,
    "reservedSlots": 5,
    "occupancyPercentage": 50.0
  }
}
```

**Database Impact:**
- **Tables:** `parking_slots`
- **Operation:** READ
- **Entity:** ParkingSlot

---

#### Scan Parking Area

| Property | Value |
|----------|-------|
| **Endpoint Name** | Scan Parking Area |
| **Description** | Scans a parking area image to detect occupied and available slots using AI-based detection. |
| **Controller** | ParkingController |
| **Method** | `POST` |
| **Path** | `/api/parking/scan` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Request Headers:**

```
Content-Type: multipart/form-data
Authorization: Bearer <JWT_TOKEN>
```

**Request Body (multipart/form-data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| image | File | Yes | Image of the parking area to scan |
| zone | String | Yes | Parking zone identifier (e.g., "Zone A") |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Parking scan completed",
  "data": {
    "scanId": 1,
    "zone": "Zone A",
    "totalSlotsDetected": 20,
    "occupiedSlots": 12,
    "availableSlots": 8,
    "confidence": 92.5,
    "scannedAt": "2026-01-15T10:30:00"
  }
}
```

**Database Impact:**
- **Tables:** `parking_scan_logs`, `parking_slots`, `parking_occupancy_history`
- **Operation:** READ, INSERT
- **Entity:** ParkingScanLog, ParkingSlot, ParkingOccupancyHistory

---

#### Assign Parking Slot

| Property | Value |
|----------|-------|
| **Endpoint Name** | Assign Parking Slot |
| **Description** | Assigns a specific parking slot to the authenticated user's vehicle. |
| **Controller** | ParkingController |
| **Method** | `POST` |
| **Path** | `/api/parking/assign` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Request Headers:**

```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "slotId": 1,
  "vehicleId": 1
}
```

**Field Details:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| slotId | Long | Yes | ID of the parking slot to assign |
| vehicleId | Long | Yes | ID of the vehicle to assign to the slot |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Parking slot assigned successfully",
  "data": {
    "assignmentId": 1,
    "slotId": 1,
    "slotNumber": "A-001",
    "vehicleId": 1,
    "licensePlate": "ABC-1234",
    "assignedAt": "2026-01-15T10:30:00",
    "status": "ACTIVE"
  }
}
```

**Database Impact:**
- **Tables:** `parking_assignments`, `parking_slots`
- **Operation:** INSERT, UPDATE
- **Entity:** ParkingAssignment, ParkingSlot

---

#### Get Parking Statistics

| Property | Value |
|----------|-------|
| **Endpoint Name** | Get Parking Statistics |
| **Description** | Retrieves parking usage statistics and analytics. |
| **Controller** | ParkingController |
| **Method** | `GET` |
| **Path** | `/api/parking/statistics` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Statistics retrieved",
  "data": {
    "totalScans": 150,
    "averageOccupancy": 65.5,
    "peakOccupancy": 95.0,
    "peakTime": "09:00",
    "totalAssignments": 300
  }
}
```

**Database Impact:**
- **Tables:** `parking_scan_logs`, `parking_assignments`, `parking_occupancy_history`
- **Operation:** READ
- **Entity:** ParkingScanLog, ParkingAssignment, ParkingOccupancyHistory

---

### 3.9 Document Extraction API

---

#### Extract Document Information

| Property | Value |
|----------|-------|
| **Endpoint Name** | Extract Document Information |
| **Description** | Extracts text and structured data from a university ID document image using AI-based OCR. The extracted information is saved to the user's profile. |
| **Controller** | DocumentExtractionController |
| **Method** | `POST` |
| **Path** | `/api/documents/extract` |
| **Authentication** | Yes (JWT Bearer Token) |
| **Role Required** | USER or ADMIN |

**Request Headers:**

```
Content-Type: multipart/form-data
Authorization: Bearer <JWT_TOKEN>
```

**Request Body (multipart/form-data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| document | File | Yes | Image of the university ID document |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Document extracted successfully",
  "data": {
    "studentName": "John Doe",
    "studentId": "STU-2026-001",
    "universityName": "City University",
    "department": "Computer Science",
    "session": "2025-2026",
    "confidence": 94.5,
    "rawText": "University ID Card\nStudent Name: John Doe\n..."
  }
}
```

**Database Impact:**
- **Tables:** `users`
- **Operation:** UPDATE
- **Entity:** User

---

## 4. API Summary Table

| # | Method | Endpoint | Auth | Role | Description |
|---|--------|----------|------|------|-------------|
| 1 | POST | `/api/auth/register` | No | - | User registration |
| 2 | POST | `/api/auth/login` | No | - | User login |
| 3 | GET | `/api/users/profile` | Yes | USER/ADMIN | Get user profile |
| 4 | PUT | `/api/users/profile` | Yes | USER/ADMIN | Update user profile |
| 5 | GET | `/api/vehicles` | Yes | USER/ADMIN | List user vehicles |
| 6 | GET | `/api/vehicles/{id}` | Yes | USER/ADMIN | Get vehicle by ID |
| 7 | POST | `/api/vehicles` | Yes | USER/ADMIN | Create vehicle |
| 8 | PUT | `/api/vehicles/{id}` | Yes | USER/ADMIN | Update vehicle |
| 9 | DELETE | `/api/vehicles/{id}` | Yes | USER/ADMIN | Delete vehicle |
| 10 | POST | `/api/face-enrollment/upload` | Yes | USER/ADMIN | Upload face enrollment video |
| 11 | GET | `/api/face-enrollment/{id}/status` | Yes | USER/ADMIN | Get enrollment status |
| 12 | GET | `/api/face-enrollment` | Yes | USER/ADMIN | List all enrollments |
| 13 | POST | `/api/face-verification/verify` | Yes | USER/ADMIN | Verify face image |
| 14 | POST | `/api/plate-verification/verify` | Yes | USER/ADMIN | Verify license plate |
| 15 | POST | `/api/access-verification/verify` | Yes | USER/ADMIN | Combined access verification |
| 16 | GET | `/api/parking/slots` | Yes | USER/ADMIN | Get all parking slots |
| 17 | GET | `/api/parking/availability` | Yes | USER/ADMIN | Get parking availability |
| 18 | POST | `/api/parking/scan` | Yes | USER/ADMIN | Scan parking area |
| 19 | POST | `/api/parking/assign` | Yes | USER/ADMIN | Assign parking slot |
| 20 | GET | `/api/parking/statistics` | Yes | USER/ADMIN | Get parking statistics |
| 21 | POST | `/api/documents/extract` | Yes | USER/ADMIN | Extract university ID document |

---

## 5. Database Schema

### Tables

#### users (V1, V6, V12)

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| password | VARCHAR(255) | NOT NULL |
| phone | VARCHAR(20) | |
| avatar_url | VARCHAR(500) | |
| is_active | BOOLEAN | NOT NULL, DEFAULT true |
| role | VARCHAR(20) | NOT NULL, DEFAULT 'USER' |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMP | |
| deleted_at | TIMESTAMP | (soft delete, V6) |
| student_name | VARCHAR(200) | (V12) |
| student_id | VARCHAR(100) | (V12) |
| university_name | VARCHAR(200) | (V12) |
| department | VARCHAR(200) | (V12) |
| session | VARCHAR(50) | (V12) |

#### vehicles (V1)

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| license_plate | VARCHAR(20) | NOT NULL |
| make | VARCHAR(100) | NOT NULL |
| model | VARCHAR(100) | NOT NULL |
| year | INTEGER | NOT NULL |
| color | VARCHAR(50) | |
| vehicle_type | VARCHAR(50) | |
| is_default | BOOLEAN | NOT NULL, DEFAULT false |
| user_id | BIGINT | NOT NULL, REFERENCES users(id) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMP | |
| | | UNIQUE(user_id, license_plate) |

#### face_enrollments (V1, V2, V10)

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| user_id | BIGINT | NOT NULL, REFERENCES users(id) |
| video_url | VARCHAR(500) | |
| video_path | VARCHAR(500) | |
| video_size | BIGINT | |
| duration_seconds | INTEGER | |
| uploaded_at | TIMESTAMP | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'PENDING' |
| notes | VARCHAR(1000) | |
| enrolled_at | TIMESTAMP | |
| external_face_id | VARCHAR(200) | (V10) |
| collection_id | VARCHAR(200) | (V10) |
| provider | VARCHAR(50) | (V10) |
| confidence | DOUBLE | (V10) |
| processing_attempts | INTEGER | DEFAULT 0 (V10) |
| error_message | VARCHAR(1000) | (V10) |
| image_path | VARCHAR(500) | (V10) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMP | |

#### plate_verification_logs (V4)

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| user_id | BIGINT | REFERENCES users(id) |
| detected_plate | VARCHAR(50) | |
| matched | BOOLEAN | |
| confidence | DOUBLE | |
| vehicle_id | BIGINT | REFERENCES vehicles(id) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() |

#### access_logs (V5)

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| user_id | BIGINT | REFERENCES users(id) |
| vehicle_id | BIGINT | REFERENCES vehicles(id) |
| decision | VARCHAR(30) | NOT NULL |
| face_verified | BOOLEAN | NOT NULL |
| plate_verified | BOOLEAN | NOT NULL |
| face_confidence | DOUBLE | |
| plate_confidence | DOUBLE | |
| detected_plate | VARCHAR(50) | |
| face_message | VARCHAR(500) | |
| plate_message | VARCHAR(500) | |
| processing_time_ms | DOUBLE | |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() |

#### security_events (V5)

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| user_id | BIGINT | REFERENCES users(id) |
| event_type | VARCHAR(50) | NOT NULL |
| description | VARCHAR(1000) | |
| severity | VARCHAR(20) | |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() |

#### parking_slots (V7, V12.5, V13)

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| slot_number | VARCHAR(20) | NOT NULL |
| zone | VARCHAR(50) | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'AVAILABLE' |
| slot_type | VARCHAR(20) | DEFAULT 'REGULAR' |
| floor | INTEGER | |
| section | VARCHAR(10) | |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMP | |

#### parking_assignments (V7)

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| slot_id | BIGINT | NOT NULL, REFERENCES parking_slots(id) |
| vehicle_id | BIGINT | NOT NULL, REFERENCES vehicles(id) |
| user_id | BIGINT | NOT NULL, REFERENCES users(id) |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'ACTIVE' |
| assigned_at | TIMESTAMP | NOT NULL, DEFAULT now() |
| released_at | TIMESTAMP | |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMP | |

#### parking_scan_logs (V7)

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| zone | VARCHAR(50) | |
| image_path | VARCHAR(500) | |
| total_slots_detected | INTEGER | |
| occupied_count | INTEGER | |
| available_count | INTEGER | |
| confidence | DOUBLE | |
| scanned_at | TIMESTAMP | NOT NULL, DEFAULT now() |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() |

#### parking_occupancy_history (V8)

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| zone | VARCHAR(50) | |
| total_slots | INTEGER | |
| occupied_slots | INTEGER | |
| available_slots | INTEGER | |
| occupancy_percentage | DOUBLE | |
| recorded_at | TIMESTAMP | NOT NULL, DEFAULT now() |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() |

### Entity Enums

| Enum | Values |
|------|--------|
| User.Role | `USER`, `ADMIN` |
| FaceEnrollment.EnrollmentStatus | `PENDING`, `PROCESSING`, `ENROLLED`, `FAILED`, `COMPLETED` |
| AccessDecision | `ACCESS_GRANTED`, `ACCESS_DENIED`, `SECURITY_ALERT` |

---

## 6. Error Handling

**Global Exception Handler:** `GlobalExceptionHandler`

### Standard Error Response

```json
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

### Validation Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": [
    "field: validation message"
  ]
}
```

### Exception Types

| Exception | HTTP Status | Description |
|-----------|-------------|-------------|
| ResourceNotFoundException | 404 | Resource not found |
| BadRequestException | 400 | Bad request |
| DuplicateResourceException | 409 | Duplicate resource |
| MethodArgumentNotValidException | 400 | Validation errors |
| AccessDeniedException | 403 | Forbidden |
| AuthenticationException | 401 | Unauthorized |
| MaxUploadSizeExceededException | 413 | File too large |
| Generic Exception | 500 | Internal server error |

---

## 7. File Upload Specifications

### Configuration

- **Maximum file size:** 100MB (for video uploads)
- **Spring servlet max file size:** 100MB
- **Spring servlet max request size:** 100MB

### Endpoints Accepting File Uploads

| Endpoint | Content-Type | Fields | Supported Files |
|----------|-------------|--------|-----------------|
| `POST /api/face-enrollment/upload` | multipart/form-data | video (file), notes (string) | Video files |
| `POST /api/face-verification/verify` | multipart/form-data | image (file) | Image files |
| `POST /api/plate-verification/verify` | multipart/form-data | image (file) | Image files |
| `POST /api/access-verification/verify` | multipart/form-data | faceImage (file), plateImage (file) | Image files |
| `POST /api/parking/scan` | multipart/form-data | image (file), zone (string) | Image files |
| `POST /api/documents/extract` | multipart/form-data | document (file) | Image files |

---

## 8. Examples

### cURL Examples

```bash
# 1. Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "StrongPassword123"
  }'

# 2. Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "StrongPassword123"
  }'

# 3. Get Profile
curl -X GET http://localhost:8080/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 4. Update Profile
curl -X PUT http://localhost:8080/api/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "firstName": "John",
    "lastName": "Doe Updated",
    "phone": "+880987654321"
  }'

# 5. Create Vehicle
curl -X POST http://localhost:8080/api/vehicles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "licensePlate": "ABC-1234",
    "make": "Toyota",
    "model": "Camry",
    "year": 2024,
    "color": "White",
    "vehicleType": "Sedan",
    "isDefault": true
  }'

# 6. List Vehicles
curl -X GET http://localhost:8080/api/vehicles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 7. Delete Vehicle
curl -X DELETE http://localhost:8080/api/vehicles/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 8. Upload Face Enrollment
curl -X POST http://localhost:8080/api/face-enrollment/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "video=@/path/to/video.mp4" \
  -F "notes=Face enrollment video"

# 9. Verify Face
curl -X POST http://localhost:8080/api/face-verification/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@/path/to/face.jpg"

# 10. Combined Access Verification
curl -X POST http://localhost:8080/api/access-verification/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "faceImage=@/path/to/face.jpg" \
  -F "plateImage=@/path/to/plate.jpg"

# 11. Assign Parking Slot
curl -X POST http://localhost:8080/api/parking/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{ "slotId": 1, "vehicleId": 1 }'

# 12. Extract Document
curl -X POST http://localhost:8080/api/documents/extract \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "document=@/path/to/university_id.jpg"
```

### JavaScript Fetch Examples

```javascript
// Register
const registerResponse = await fetch('http://localhost:8080/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'StrongPassword123'
  })
});
const registerData = await registerResponse.json();

// Login
const loginResponse = await fetch('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john.doe@example.com',
    password: 'StrongPassword123'
  })
});
const loginData = await loginResponse.json();
const token = loginData.data.token;

// Get Profile
const profileResponse = await fetch('http://localhost:8080/api/users/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Create Vehicle
const vehicleResponse = await fetch('http://localhost:8080/api/vehicles', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    licensePlate: 'ABC-1234',
    make: 'Toyota',
    model: 'Camry',
    year: 2024,
    color: 'White',
    vehicleType: 'Sedan',
    isDefault: true
  })
});

// Upload Face Enrollment (multipart)
const formData = new FormData();
formData.append('video', videoFile);
formData.append('notes', 'Face enrollment');
const enrollResponse = await fetch('http://localhost:8080/api/face-enrollment/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### Axios Examples

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080'
});

// Register
const { data: registerResult } = await api.post('/api/auth/register', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  password: 'StrongPassword123'
});

// Login
const { data: loginResult } = await api.post('/api/auth/login', {
  email: 'john.doe@example.com',
  password: 'StrongPassword123'
});
const token = loginResult.data.token;

// Set default auth header
api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Get Profile
const { data: profile } = await api.get('/api/users/profile');

// Create Vehicle
const { data: vehicle } = await api.post('/api/vehicles', {
  licensePlate: 'ABC-1234',
  make: 'Toyota',
  model: 'Camry',
  year: 2024
});

// Upload Face Enrollment
const formData = new FormData();
formData.append('video', videoFile);
const { data: enrollment } = await api.post('/api/face-enrollment/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// Get Parking Availability
const { data: availability } = await api.get('/api/parking/availability');