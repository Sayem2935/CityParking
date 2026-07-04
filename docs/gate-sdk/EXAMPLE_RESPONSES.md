# CityParking Gate SDK — Example API Responses

Realistic JSON examples for every scenario the Raspberry Pi gate device
may encounter. All responses use the standard `ApiResponse<T>` wrapper.

---

## Standard Response Wrapper

Every API response follows this structure:

```json
{
  "success": true|false,
  "message": "Human-readable description",
  "data": { ... } | null,
  "timestamp": "2026-07-04T08:30:00"
}
```

---

## 1. Authentication — Success

**POST** `/api/auth/login`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJnYXRlLWRldmljZUBjaXR5cGFya2luZy5lZHVpIiwiaWF0IjoxNzIwMDAwMDAwLCJleHAiOjE3MjAwODY0MDB9.Hs8kF2J3kL9xQ7vN5mR4pT6wY1zA3bC8dE0fG2hI4jK",
    "type": "Bearer",
    "id": 42,
    "email": "gate-device@cityparking.edu",
    "firstName": "Gate",
    "lastName": "Device A",
    "role": "USER"
  },
  "timestamp": "2026-07-04T08:30:00"
}
```

---

## 2. Authentication — Invalid Credentials

**POST** `/api/auth/login`

```json
{
  "success": false,
  "message": "Invalid email or password",
  "data": null,
  "timestamp": "2026-07-04T08:30:00"
}
```

---

## 3. Gate Verification — Access Allowed (Face Matched + Vehicle Found)

**POST** `/api/gate/verify` (or `/api/access-verification/verify`)

```json
{
  "success": true,
  "message": "Access granted: Face verified and vehicle registered",
  "data": {
    "decision": "ALLOW",
    "reason": "VERIFIED",
    "confidence": 0.87,
    "accessLogId": 1042,
    "user": {
      "id": 42,
      "name": "Ahmed Khan",
      "email": "ahmed.khan@university.edu"
    },
    "vehicle": {
      "id": 15,
      "licensePlate": "ABC-1234",
      "type": "SEDAN",
      "make": "Toyota",
      "model": "Camry",
      "color": "White"
    },
    "gate": {
      "action": "OPEN",
      "relayDurationMs": 5000
    }
  },
  "timestamp": "2026-07-04T08:30:00"
}
```

---

## 4. Gate Verification — Face Not Matched

**POST** `/api/gate/verify`

```json
{
  "success": true,
  "message": "Access denied: Face not matched",
  "data": {
    "decision": "DENY",
    "reason": "FACE_NOT_MATCHED",
    "confidence": 0.23,
    "accessLogId": 1043,
    "user": null,
    "vehicle": null,
    "gate": {
      "action": "CLOSED",
      "relayDurationMs": 0
    }
  },
  "timestamp": "2026-07-04T08:30:01"
}
```

---

## 5. Gate Verification — No Face Detected

**POST** `/api/gate/verify`

```json
{
  "success": true,
  "message": "Access denied: No face detected in image",
  "data": {
    "decision": "DENY",
    "reason": "NO_FACE",
    "confidence": 0.0,
    "accessLogId": 1044,
    "user": null,
    "vehicle": null,
    "gate": {
      "action": "CLOSED",
      "relayDurationMs": 0
    }
  },
  "timestamp": "2026-07-04T08:30:02"
}
```

---

## 6. Gate Verification — Multiple Faces Detected

**POST** `/api/gate/verify`

```json
{
  "success": true,
  "message": "Access denied: Multiple faces detected",
  "data": {
    "decision": "DENY",
    "reason": "MULTIPLE_FACES",
    "confidence": 0.0,
    "accessLogId": 1045,
    "user": null,
    "vehicle": null,
    "gate": {
      "action": "CLOSED",
      "relayDurationMs": 0
    }
  },
  "timestamp": "2026-07-04T08:30:03"
}
```

---

## 7. Gate Verification — User Has No Registered Vehicle

**POST** `/api/gate/verify`

```json
{
  "success": true,
  "message": "Access denied: User has no registered vehicle",
  "data": {
    "decision": "DENY",
    "reason": "NO_REGISTERED_VEHICLE",
    "confidence": 0.91,
    "accessLogId": 1046,
    "user": {
      "id": 55,
      "name": "Sara Ali",
      "email": "sara.ali@university.edu"
    },
    "vehicle": null,
    "gate": {
      "action": "CLOSED",
      "relayDurationMs": 0
    }
  },
  "timestamp": "2026-07-04T08:30:04"
}
```

---

## 8. Gate Verification — Unknown User (No Enrollment)

**POST** `/api/gate/verify`

```json
{
  "success": true,
  "message": "Access denied: No enrollment found",
  "data": {
    "decision": "DENY",
    "reason": "NO_ENROLLMENT",
    "confidence": 0.0,
    "accessLogId": 1047,
    "user": null,
    "vehicle": null,
    "gate": {
      "action": "CLOSED",
      "relayDurationMs": 0
    }
  },
  "timestamp": "2026-07-04T08:30:05"
}
```

---

## 9. Gate Verification — Enrollment Pending

**POST** `/api/gate/verify`

```json
{
  "success": true,
  "message": "Access denied: Face enrollment is still being processed",
  "data": {
    "decision": "DENY",
    "reason": "ENROLLMENT_PENDING",
    "confidence": 0.0,
    "accessLogId": 1048,
    "user": null,
    "vehicle": null,
    "gate": {
      "action": "CLOSED",
      "relayDurationMs": 0
    }
  },
  "timestamp": "2026-07-04T08:30:06"
}
```

---

## 10. Unauthorized — Token Expired (401)

**POST** `/api/gate/verify` with expired JWT

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json
```

```json
{
  "success": false,
  "message": "Unauthorized: Authentication required",
  "data": null,
  "timestamp": "2026-07-04T08:30:07"
}
```

---

## 11. Unauthorized — Invalid Token (401)

**POST** `/api/gate/verify` with malformed JWT

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json
```

```json
{
  "success": false,
  "message": "Unauthorized: Invalid token",
  "data": null,
  "timestamp": "2026-07-04T08:30:08"
}
```

---

## 12. Bad Request — No Image (400)

**POST** `/api/gate/verify` without image field

```
HTTP/1.1 400 Bad Request
Content-Type: application/json
```

```json
{
  "success": false,
  "message": "Image is required",
  "data": null,
  "timestamp": "2026-07-04T08:30:09"
}
```

---

## 13. Bad Request — Invalid Image Format (400)

**POST** `/api/gate/verify` with .txt file

```
HTTP/1.1 400 Bad Request
Content-Type: application/json
```

```json
{
  "success": false,
  "message": "Invalid image format. Accepted: JPEG, PNG",
  "data": null,
  "timestamp": "2026-07-04T08:30:10"
}
```

---

## 14. Payload Too Large (413)

**POST** `/api/gate/verify` with 15 MB image

```
HTTP/1.1 413 Payload Too Large
Content-Type: application/json
```

```json
{
  "success": false,
  "message": "File size exceeds maximum allowed size of 10MB",
  "data": null,
  "timestamp": "2026-07-04T08:30:11"
}
```

---

## 15. Rate Limited (429)

**POST** `/api/gate/verify` when rate limit exceeded

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 10
```

```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "data": null,
  "timestamp": "2026-07-04T08:30:12"
}
```

---

## 16. Internal Server Error — AI Service Down (500)

**POST** `/api/gate/verify` when FastAPI is unreachable

```
HTTP/1.1 500 Internal Server Error
Content-Type: application/json
```

```json
{
  "success": false,
  "message": "Access verification failed: Connection refused to AI service",
  "data": null,
  "timestamp": "2026-07-04T08:30:13"
}
```

---

## 17. Service Unavailable (503)

**POST** `/api/gate/verify` during backend maintenance

```
HTTP/1.1 503 Service Unavailable
Content-Type: application/json
Retry-After: 60
```

```json
{
  "success": false,
  "message": "Service temporarily unavailable. Please try again.",
  "data": null,
  "timestamp": "2026-07-04T08:30:14"
}
```

---

## 18. Forbidden (403)

**POST** `/api/gate/verify` with user lacking permissions

```
HTTP/1.1 403 Forbidden
Content-Type: application/json
```

```json
{
  "success": false,
  "message": "Forbidden: Insufficient permissions",
  "data": null,
  "timestamp": "2026-07-04T08:30:15"
}
```

---

## 19. Face Verification Endpoint — Standalone

**POST** `/api/face-verification/verify`

### Match Found

```json
{
  "success": true,
  "message": "Face verified successfully",
  "data": {
    "faceMatched": true,
    "confidence": 0.89,
    "message": "Face matched with enrolled user",
    "matchedUserId": 42,
    "matchedUserName": "Ahmed Khan"
  },
  "timestamp": "2026-07-04T08:30:00"
}
```

### No Match

```json
{
  "success": true,
  "message": "No matching face found",
  "data": {
    "faceMatched": false,
    "confidence": 0.23,
    "message": "No enrolled face matched",
    "matchedUserId": null,
    "matchedUserName": null
  },
  "timestamp": "2026-07-04T08:30:00"
}
```

---

## 20. Face Enrollment Status

**GET** `/api/face-enrollment/status`

### Enrolled

```json
{
  "success": true,
  "message": "Enrollment status retrieved",
  "data": {
    "enrolled": true,
    "status": "COMPLETED",
    "imageCount": 5,
    "enrolledAt": "2026-07-01T10:15:00"
  },
  "timestamp": "2026-07-04T08:30:00"
}
```

### Not Enrolled

```json
{
  "success": true,
  "message": "Enrollment status retrieved",
  "data": {
    "enrolled": false,
    "status": "NOT_STARTED",
    "imageCount": 0,
    "enrolledAt": null
  },
  "timestamp": "2026-07-04T08:30:00"
}
```

---

## 21. Network Timeout (Pi-Side)

No JSON response — the connection times out after 30 seconds.

```
requests.exceptions.ReadTimeout: HTTPSConnectionPool(host='cityparking-api.onrender.com', port=443): Read timed out. (read timeout=30)
```

**Pi should treat this as a retryable error.**

---

## 22. Connection Refused (Pi-Side)

No JSON response — the server is unreachable.

```
requests.exceptions.ConnectionError: HTTPSConnectionPool(host='cityparking-api.onrender.com', port=443): Max retries exceeded: Connection refused
```

**Pi should enter safe mode after max retries.**