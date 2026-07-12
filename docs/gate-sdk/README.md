# DIPS — Raspberry Pi Gate Device SDK

## Version

1.0.0 — July 2026

## Overview

This SDK provides everything needed to build a Raspberry Pi gate controller
for the DIU Intelligent Parking System (DIPS).

The Raspberry Pi captures a face image, sends it to the DIPS backend,
and receives an ALLOW / DENY decision. If ALLOW, the Pi activates a relay
to open the gate barrier.

**The Pi does NOT perform face recognition locally.**
All AI verification runs server-side via InsightFace (buffalo_l model)
generating ArcFace 512-dimensional embeddings.

---

## Architecture

```
┌─────────────┐       HTTPS / JWT       ┌──────────────────┐
│ Raspberry Pi │ ──── POST /api/gate/ ──▶│  Spring Boot     │
│  (Gate Unit) │      /verify            │  Backend         │
└──────┬───────┘                         └──────┬───────────┘
       │                                        │
  USB Camera                             ┌──────▼───────────┐
  GPIO Relay                              │  Face AI Service │
                                          │  (FastAPI +      │
                                          │   InsightFace)   │
                                          └──────┬───────────┘
                                                 │
                                          ┌──────▼───────────┐
                                          │   PostgreSQL     │
                                          │   (Embeddings,   │
                                          │    Users,        │
                                          │    Vehicles)     │
                                          └──────────────────┘
```

### Network Flow

```
1. Pi boots → loads config.json
2. Pi authenticates → POST /api/auth/login → receives JWT
3. Pi waits for vehicle at gate
4. Camera captures face image
5. Pi sends image → POST /api/gate/verify (multipart/form-data)
6. Spring Boot receives image
7. Spring Boot calls FastAPI → extract 512-d ArcFace embedding
8. Spring Boot compares embedding against enrolled users in PostgreSQL
9. If match found → check vehicle registration
10. Spring Boot returns decision to Pi
11. If ALLOW → Pi activates GPIO relay → gate opens
12. After delay → Pi deactivates relay → gate closes
13. Pi returns to ready state
```

---

## Authentication

The Raspberry Pi authenticates using **JWT Bearer tokens**.

### Login

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "gate-device@dips.diu.edu.bd",
  "password": "device-password"
}
```

### Response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "type": "Bearer",
    "id": 15,
    "email": "gate-device@dips.diu.edu.bd",
    "firstName": "Gate",
    "lastName": "Device",
    "role": "USER"
  },
  "timestamp": "2026-07-04T08:00:00"
}
```

### Using the Token

Every subsequent request must include:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

**Token Expiry:** 24 hours (86,400,000 ms). The Pi must re-authenticate
before the token expires. Recommended: re-authenticate every 20 hours.

---

## Image Upload Process

The gate verification endpoint accepts a **multipart/form-data** POST.

### Requirements

| Parameter | Value |
|-----------|-------|
| Field name | `image` |
| Content-Type | `multipart/form-data` |
| Format | JPEG or PNG |
| Recommended resolution | 640×480 (VGA) minimum |
| Maximum file size | 10 MB |
| Face requirement | Exactly one face, front-facing |

### Why 640×480?

- Provides sufficient detail for InsightFace embedding extraction
- Small enough for fast upload over campus WiFi (typically < 200 KB JPEG)
- Compatible with all USB cameras supported by the Pi

---

## Verification Response

The backend returns a structured JSON response:

```json
{
  "success": true,
  "message": "Access granted",
  "data": {
    "decision": "ALLOW",
    "reason": "VERIFIED",
    "confidence": 0.87,
    "timestamp": "2026-07-04T08:30:00",
    "user": {
      "id": 42,
      "name": "Alice Johnson",
      "studentId": "STU20240042",
      "department": "Computer Science",
      "email": "alice@university.edu"
    },
    "vehicle": {
      "registered": true,
      "plate": "ABC-1234",
      "type": "SEDAN",
      "make": "Toyota",
      "model": "Camry"
    },
    "gate": {
      "action": "OPEN",
      "relayDurationMs": 5000
    }
  },
  "timestamp": "2026-07-04T08:30:00"
}
```

### Decision Logic

| Decision | Condition |
|----------|-----------|
| `ALLOW` | Face matched + vehicle registered |
| `DENY` | No face detected |
| `DENY` | Multiple faces detected |
| `DENY` | Low image quality |
| `DENY` | Face not matched |
| `DENY` | User not enrolled |
| `DENY` | No registered vehicle |

---

## Gate Open Workflow

```
Response.decision == "ALLOW"
    │
    ▼
Activate GPIO relay (set HIGH)
    │
    ▼
Wait relayDurationMs (default 5000ms)
    │
    ▼
Deactivate GPIO relay (set LOW)
    │
    ▼
Log access event locally
    │
    ▼
Ready for next vehicle
```

---

## Error Handling

### HTTP Errors

| Status | Meaning | Pi Action |
|--------|---------|-----------|
| 200 | Success | Parse `data.decision` |
| 400 | Bad request (no image, wrong format) | Log error, retry |
| 401 | Unauthorized / token expired | Re-authenticate |
| 403 | Forbidden | Log error, alert admin |
| 404 | Endpoint not found | Check config URL |
| 408 | Request timeout | Retry with backoff |
| 429 | Rate limited | Wait, then retry |
| 500 | Server error | Retry with backoff |
| 503 | Service unavailable | Retry with backoff |

### Application-Level Errors

The response body contains `data.decision` and `data.reason`:

| Reason | Meaning |
|--------|---------|
| `NO_FACE` | No face detected in image |
| `MULTIPLE_FACES` | More than one face detected |
| `LOW_QUALITY` | Image too dark, blurry, or angled |
| `FACE_NOT_MATCHED` | Face does not match any enrolled user |
| `USER_NOT_ENROLLED` | User exists but no face enrollment active |
| `NO_REGISTERED_VEHICLE` | User matched but has no vehicle registered |
| `BACKEND_ERROR` | Internal server error |

---

## Retry Logic

```
Attempt 1: Immediate
Attempt 2: Wait 2 seconds
Attempt 3: Wait 5 seconds
Attempt 4: Wait 10 seconds
Attempt 5: Wait 30 seconds (max backoff)

Max retries: 5
Total max wait: ~47 seconds
```

After 5 failures: log error, flash red LED, alert admin.

Only retry on transient errors (timeout, 500, 503).
Do NOT retry on 400, 403, or application-level DENY.

---

## Raspberry Pi Requirements

### Hardware

| Component | Specification |
|-----------|--------------|
| Board | Raspberry Pi 4 Model B (2GB+ RAM) |
| Camera | USB webcam (640×480+), e.g. Logitech C270 |
| Relay module | 5V single-channel relay module |
| Power supply | Official Raspberry Pi 5V/3A USB-C |
| Storage | 16GB+ microSD (Class 10) |
| Network | WiFi (802.11n) or Ethernet |

### Software

| Component | Version |
|-----------|---------|
| OS | Raspberry Pi OS (Bookworm 64-bit) |
| Python | 3.9+ |
| OpenCV | 4.5+ (`pip install opencv-python`) |
| Requests | 2.28+ (`pip install requests`) |
| RPi.GPIO | 0.7+ (`pip install RPi.GPIO`) |

### Network

| Requirement | Value |
|-------------|-------|
| Protocol | HTTPS (TLS 1.2+) |
| Minimum bandwidth | 1 Mbps upload |
| Latency to backend | < 500ms recommended |
| DNS | Must resolve backend hostname |

---

## Quick Start

```bash
# 1. Clone or copy files
scp -r docs/gate-sdk/ pi@gate-pi:~/gate-sdk/

# 2. Install dependencies
pip install opencv-python requests RPi.GPIO

# 3. Configure
cp config.example.json config.json
nano config.json  # Set server_url, bearer_token

# 4. Test
python3 raspberry_pi_sample.py --test-camera

# 5. Run
python3 raspberry_pi_sample.py
```

---

## File Reference

| File | Description |
|------|-------------|
| `README.md` | This file — architecture overview |
| `API_REFERENCE.md` | Full API endpoint documentation |
| `GATE_SEQUENCE_DIAGRAM.md` | Mermaid sequence diagrams |
| `RASPBERRY_PI_FLOW.md` | Pi firmware flow explained |
| `ERROR_CODES.md` | Complete error code reference |
| `SECURITY.md` | Security model and best practices |
| `EXAMPLE_RESPONSES.md` | Realistic JSON response examples |
| `raspberry_pi_sample.py` | Full Python sample client |
| `config.example.json` | Example configuration file |
| `DEPLOYMENT_GUIDE.md` | Step-by-step deployment guide |
| `TESTING_GUIDE.md` | Manual and automated test guide |
| `POSTMAN_COLLECTION.json` | Postman collection for all APIs |