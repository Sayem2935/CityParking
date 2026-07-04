# CityParking Gate SDK — Sequence Diagrams

All diagrams use [Mermaid](https://mermaid.js.org/) syntax.

---

## 1. Device Authentication

```mermaid
sequenceDiagram
    participant Pi as Raspberry Pi
    participant Backend as Spring Boot Backend
    participant DB as PostgreSQL

    Pi->>Backend: POST /api/auth/login<br/>{email, password}
    Backend->>DB: Find user by email
    DB-->>Backend: User record
    Backend->>Backend: Verify BCrypt password hash
    Backend->>Backend: Generate JWT (HS256, 24h expiry)
    Backend-->>Pi: 200 OK<br/>{token, type:"Bearer", id, email, role}
    Pi->>Pi: Store token in memory
```

## 2. Gate Verification — Access Granted

```mermaid
sequenceDiagram
    participant Camera as USB Camera
    participant Pi as Raspberry Pi
    participant Backend as Spring Boot Backend
    participant AI as FastAPI / InsightFace
    participant DB as PostgreSQL

    Camera->>Pi: Capture frame (640x480 JPEG)
    Pi->>Backend: POST /api/gate/verify<br/>Authorization: Bearer token<br/>Field: image
    Backend->>Backend: Validate JWT token
    Backend->>AI: POST /extract-embedding (forward image)
    AI->>AI: InsightFace buffalo_l detect + extract 512-d ArcFace
    AI-->>Backend: Embedding vector
    Backend->>DB: Query face_embeddings compare cosine similarity
    DB-->>Backend: Best match user_id=42 similarity=0.87
    Backend->>DB: Query vehicles WHERE user_id=42
    DB-->>Backend: Vehicle ABC-1234 SEDAN Toyota Camry
    Backend->>DB: INSERT INTO access_logs (ALLOW VERIFIED)
    Backend-->>Pi: 200 OK {decision:ALLOW, reason:VERIFIED, confidence:0.87, user:{...}, vehicle:{...}, gate:{action:OPEN, relayDurationMs:5000}}
    Pi->>Pi: GPIO relay ON pin 17 HIGH
    Pi->>Pi: Wait 5000ms
    Pi->>Pi: GPIO relay OFF pin 17 LOW
    Pi->>Pi: Ready for next vehicle
```

## 3. Gate Verification — Face Not Matched

```mermaid
sequenceDiagram
    participant Camera as USB Camera
    participant Pi as Raspberry Pi
    participant Backend as Spring Boot Backend
    participant AI as FastAPI / InsightFace
    participant DB as PostgreSQL

    Camera->>Pi: Capture frame
    Pi->>Backend: POST /api/gate/verify (face image)
    Backend->>AI: Extract embedding
    AI-->>Backend: Embedding vector
    Backend->>DB: Compare all enrolled embeddings
    DB-->>Backend: Best match similarity=0.23
    Backend->>DB: INSERT INTO access_logs (DENIED FACE_NOT_MATCHED)
    Backend-->>Pi: 200 OK {decision:DENY, reason:FACE_NOT_MATCHED, confidence:0.23}
    Pi->>Pi: Gate stays closed
```

## 4. No Face Detected

```mermaid
sequenceDiagram
    participant Pi as Raspberry Pi
    participant Backend as Spring Boot Backend
    participant AI as FastAPI / InsightFace

    Pi->>Backend: POST /api/gate/verify (empty image)
    Backend->>AI: Extract embedding
    AI-->>Backend: Error: No face detected
    Backend-->>Pi: 200 OK {decision:DENY, reason:NO_FACE}
    Pi->>Pi: Gate stays closed
```

## 5. Multiple Faces Detected

```mermaid
sequenceDiagram
    participant Pi as Raspberry Pi
    participant Backend as Spring Boot Backend
    participant AI as FastAPI / InsightFace

    Pi->>Backend: POST /api/gate/verify (image with 3 faces)
    Backend->>AI: Extract embedding
    AI-->>Backend: Error: Multiple faces detected (count=3)
    Backend-->>Pi: 200 OK {decision:DENY, reason:MULTIPLE_FACES}
    Pi->>Pi: Gate stays closed
```

## 6. User Has No Vehicle

```mermaid
sequenceDiagram
    participant Pi as Raspberry Pi
    participant Backend as Spring Boot Backend
    participant AI as FastAPI / InsightFace
    participant DB as PostgreSQL

    Pi->>Backend: POST /api/gate/verify (face image)
    Backend->>AI: Extract embedding
    AI-->>Backend: Embedding vector
    Backend->>DB: Match user_id=55 similarity=0.91
    Backend->>DB: Query vehicles WHERE user_id=55
    DB-->>Backend: No vehicles found
    Backend->>DB: INSERT INTO access_logs (DENIED NO_REGISTERED_VEHICLE)
    Backend-->>Pi: 200 OK {decision:DENY, reason:NO_REGISTERED_VEHICLE, user:{id:55}}
    Pi->>Pi: Gate stays closed
```

## 7. Token Expired — Re-authentication

```mermaid
sequenceDiagram
    participant Pi as Raspberry Pi
    participant Backend as Spring Boot Backend

    Pi->>Backend: POST /api/gate/verify (expired token)
    Backend-->>Pi: 401 Unauthorized
    Pi->>Pi: Detect 401, re-authenticate
    Pi->>Backend: POST /api/auth/login {email, password}
    Backend-->>Pi: 200 OK {token: new_jwt}
    Pi->>Pi: Update stored token
    Pi->>Backend: POST /api/gate/verify (new token)
    Backend-->>Pi: 200 OK {decision: ALLOW}
    Pi->>Pi: Open gate
```

## 8. Network Timeout — Retry Logic

```mermaid
sequenceDiagram
    participant Pi as Raspberry Pi
    participant Backend as Spring Boot Backend

    Pi->>Backend: POST /api/gate/verify (Attempt 1)
    Note over Pi,Backend: Timeout after 30s
    Pi->>Pi: Wait 2s
    Pi->>Backend: POST /api/gate/verify (Attempt 2)
    Note over Pi,Backend: Timeout after 30s
    Pi->>Pi: Wait 5s
    Pi->>Backend: POST /api/gate/verify (Attempt 3)
    Backend-->>Pi: 200 OK {decision: ALLOW}
    Pi->>Pi: Open gate
```

## 9. Backend Unavailable — Max Retries

```mermaid
sequenceDiagram
    participant Pi as Raspberry Pi
    participant Backend as Spring Boot Backend

    Pi->>Backend: Attempt 1: Connection refused
    Pi->>Pi: Wait 2s
    Pi->>Backend: Attempt 2: Connection refused
    Pi->>Pi: Wait 5s
    Pi->>Backend: Attempt 3: Connection refused
    Pi->>Pi: Wait 10s
    Pi->>Backend: Attempt 4: Connection refused
    Pi->>Pi: Wait 30s
    Pi->>Backend: Attempt 5: Connection refused
    Note over Pi: Max retries exhausted
    Pi->>Pi: Log CRITICAL error, flash red LED, safe mode
```

## 10. Rate Limited (429)

```mermaid
sequenceDiagram
    participant Pi as Raspberry Pi
    participant Backend as Spring Boot Backend

    Pi->>Backend: POST /api/gate/verify
    Backend-->>Pi: 429 Too Many Requests (Retry-After: 10)
    Pi->>Pi: Wait 10s
    Pi->>Backend: POST /api/gate/verify
    Backend-->>Pi: 200 OK {decision: ALLOW}
```

## 11. Full System Startup

```mermaid
sequenceDiagram
    participant Pi as Raspberry Pi
    participant Camera as USB Camera
    participant GPIO as GPIO Relay
    participant Backend as Spring Boot Backend

    Pi->>Pi: Load config.json
    Pi->>Camera: Open camera (index from config)
    Camera-->>Pi: Camera ready
    Pi->>GPIO: Setup relay pin (BCM 17 OUTPUT)
    GPIO-->>Pi: Pin configured
    Pi->>Backend: POST /api/auth/login
    Backend-->>Pi: JWT token

    loop Main Loop
        Pi->>Camera: Capture frame
        Camera-->>Pi: JPEG image
        Pi->>Backend: POST /api/gate/verify
        Backend-->>Pi: Decision response
        alt ALLOW
            Pi->>GPIO: Relay ON
            Pi->>Pi: Wait relayDurationMs
            Pi->>GPIO: Relay OFF
        else DENY
            Pi->>Pi: Stay ready
        end
    end