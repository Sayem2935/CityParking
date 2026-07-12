# DIPS Gate SDK — Testing Guide

Comprehensive testing procedures for the Raspberry Pi gate controller
before deployment and during maintenance.

---

## 1. Test Environment Setup

### Prerequisites

- Raspberry Pi with gate controller installed (see DEPLOYMENT_GUIDE.md)
- Test user account registered on CityParking platform
- Test user has completed face enrollment (minimum 3 images)
- Test user has at least one vehicle registered
- USB camera connected and verified
- Relay module connected to GPIO

### Test Accounts

| Account | Purpose | Email |
|---------|---------|-------|
| Gate Device | API authentication | gate-entrance-A@cityparking.edu |
| Test Student | Known face | test.student@university.edu |
| Admin | Manual verification | admin@cityparking.edu |

---

## 2. Test Categories

### 2.1 Authentication Tests

| ID | Test | Expected Result |
|----|------|----------------|
| AUTH-01 | Login with valid credentials | 200 OK, JWT token returned |
| AUTH-02 | Login with wrong password | 401 Unauthorized |
| AUTH-03 | Login with nonexistent email | 401 Unauthorized |
| AUTH-04 | Login with empty email | 400 Bad Request |
| AUTH-05 | Login with empty password | 400 Bad Request |
| AUTH-06 | Access gate API without token | 401 Unauthorized |
| AUTH-07 | Access gate API with expired token | 401 Unauthorized |
| AUTH-08 | Access gate API with malformed token | 401 Unauthorized |
| AUTH-09 | Token auto-refresh before expiry | New token obtained seamlessly |

#### Manual Test Commands

```bash
# AUTH-01: Valid login
curl -s -X POST \
  "https://cityparking-api.onrender.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"gate-entrance-A@cityparking.edu","password":"your-password"}' \
  | python3 -m json.tool

# AUTH-02: Wrong password
curl -s -X POST \
  "https://cityparking-api.onrender.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"gate-entrance-A@cityparking.edu","password":"wrong-password"}' \
  | python3 -m json.tool

# AUTH-06: No token
curl -s -X POST \
  "https://cityparking-api.onrender.com/api/gate/verify" \
  -F "image=@test_face.jpg" \
  | python3 -m json.tool

# AUTH-07: Expired token
curl -s -X POST \
  "https://cityparking-api.onrender.com/api/gate/verify" \
  -H "Authorization: Bearer EXPIRED_TOKEN_HERE" \
  -F "image=@test_face.jpg" \
  | python3 -m json.tool
```

---

### 2.2 Face Verification Tests — Known Face

| ID | Test | Expected Result |
|----|------|----------------|
| FACE-01 | Known face, front-facing, good lighting | ALLOW, confidence > 0.7 |
| FACE-02 | Known face, slight angle (±15°) | ALLOW, confidence > 0.6 |
| FACE-03 | Known face, wearing glasses | ALLOW (if enrolled with glasses) |
| FACE-04 | Known face, wearing mask | DENY (face not visible) |
| FACE-05 | Known face, very close to camera | ALLOW or DENY (quality check) |
| FACE-06 | Known face, far from camera | ALLOW or DENY (quality check) |
| FACE-07 | Known face, slightly dark | ALLOW, lower confidence |
| FACE-08 | Known face, bright backlight | DENY (face in shadow) |

#### How to Test

1. Have the enrolled test student stand in front of the camera
2. Run the gate controller: `python3 raspberry_pi_sample.py`
3. Verify the log output shows:
   ```
   Decision: ALLOW | Reason: VERIFIED | Confidence: 0.87
   ACCESS GRANTED — User: Test Student (test.student@university.edu)
   ```
4. Verify the relay activates (green LED, gate opens)
5. Verify the gate closes after the configured duration

---

### 2.3 Face Verification Tests — Unknown Face

| ID | Test | Expected Result |
|----|------|----------------|
| UNK-01 | Unknown person (not enrolled) | DENY, reason: NO_MATCH |
| UNK-02 | Blank image (no face) | DENY, reason: NO_FACE |
| UNK-03 | Image with multiple faces | DENY, reason: MULTIPLE_FACES |
| UNK-04 | Non-face image (object, landscape) | DENY, reason: NO_FACE |
| UNK-05 | Very blurry face | DENY, reason: LOW_QUALITY |

#### How to Test

1. Have a non-enrolled person stand in front of the camera
2. Verify the log output shows:
   ```
   Decision: DENY | Reason: NO_MATCH | Confidence: 0.23
   ACCESS DENIED — Reason: NO_MATCH
   ```
3. Verify red LED flashes
4. Verify relay does NOT activate

---

### 2.4 Camera Tests

| ID | Test | Expected Result |
|----|------|----------------|
| CAM-01 | Camera connected at boot | System starts normally |
| CAM-02 | Camera disconnected at boot | Safe mode entered |
| CAM-03 | Camera disconnected during operation | Error logged, retry next cycle |
| CAM-04 | Camera reconnected after disconnect | Auto-recovery |
| CAM-05 | Camera index wrong (config error) | Error logged, safe mode |
| CAM-06 | Camera resolution too low (< 320px) | Image rejected by backend |
| CAM-07 | Camera resolution 640×480 | Acceptable quality |
| CAM-08 | Camera resolution 1280×720 | Good quality |
| CAM-09 | Camera resolution 1920×1080 | Best quality, larger upload |

#### How to Test Camera Disconnect

```bash
# Start the gate controller
python3 raspberry_pi_sample.py

# While running, unplug the USB camera
# Expected: Error messages in log, safe mode entered

# Replug the camera
# Expected: Auto-recovery, normal operation resumes
```

---

### 2.5 Network Tests

| ID | Test | Expected Result |
|----|------|----------------|
| NET-01 | Normal network connectivity | Requests succeed |
| NET-02 | Server unreachable | Retry with backoff |
| NET-03 | DNS resolution failure | Retry with backoff |
| NET-04 | Network timeout (slow response) | Timeout after 30s, retry |
| NET-05 | Network restored after outage | Auto-recovery |
| NET-06 | WiFi disconnection | Error logged, retry |
| NET-07 | WiFi reconnection | Auto-recovery |

#### How to Test Network Issues

```bash
# Start the gate controller
python3 raspberry_pi_sample.py

# Simulate network outage (on a separate terminal)
sudo iptables -A OUTPUT -d cityparking-api.onrender.com -j DROP

# Expected in logs:
# Connection error (attempt 1/5) — retrying in 2.0s
# Connection error (attempt 2/5) — retrying in 4.0s
# ...
# Entering SAFE MODE — gate stays CLOSED

# Restore network
sudo iptables -D OUTPUT -d cityparking-api.onrender.com -j DROP

# Expected: Reconnect successful — resuming normal operation
```

---

### 2.6 Server-Side Error Tests

| ID | Test | Expected Result |
|----|------|----------------|
| SRV-01 | Backend returns 500 | Retry with backoff |
| SRV-02 | Backend returns 503 (maintenance) | Retry with backoff |
| SRV-03 | AI service (FastAPI) down | Backend returns 500, Pi retries |
| SRV-04 | Database down | Backend returns 500, Pi retries |
| SRV-05 | Rate limit hit (429) | Wait for Retry-After, then retry |
| SRV-06 | Payload too large (413) | Log error, reduce quality |

---

### 2.7 GPIO / Hardware Tests

| ID | Test | Expected Result |
|----|------|----------------|
| HW-01 | Relay activates on ALLOW | Gate opens for configured duration |
| HW-02 | Relay deactivates after timeout | Gate closes |
| HW-03 | Green LED on ALLOW | LED lights up during gate open |
| HW-04 | Red LED flash on DENY | LED flashes for 2 seconds |
| HW-05 | GPIO cleanup on shutdown | All pins reset to LOW |
| HW-06 | Power loss during gate open | Gate closes (relay de-energizes) |
| HW-07 | Relay wired to normally closed | Gate stays closed on power loss |

---

### 2.8 Edge Case Tests

| ID | Test | Expected Result |
|----|------|----------------|
| EDGE-01 | Rapid successive captures | Rate limited, min interval respected |
| EDGE-02 | Very large image (near 10 MB) | Uploaded successfully |
| EDGE-03 | Image over 10 MB | Rejected locally before upload |
| EDGE-04 | Corrupted JPEG bytes | Backend returns 400 |
| EDGE-05 | Empty file (0 bytes) | Backend returns 400 |
| EDGE-06 | Service restart during request | Request interrupted, retry on restart |
| EDGE-07 | SD card full | Write failure logged |
| EDGE-08 | System clock wrong | JWT validation may fail |

---

## 3. Automated Testing Script

Create a test script to verify the API without the Pi hardware:

```bash
#!/bin/bash
# test_gate_api.sh — Run against the DIPS backend

SERVER="https://cityparking-api.onrender.com/api"
EMAIL="gate-entrance-A@cityparking.edu"
PASSWORD="your-password"

echo "=== AUTH-01: Valid Login ==="
TOKEN=$(curl -s -X POST "$SERVER/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)

if [ -n "$TOKEN" ]; then
    echo "PASS: Token obtained (${#TOKEN} chars)"
else
    echo "FAIL: No token returned"
    exit 1
fi

echo ""
echo "=== AUTH-02: Wrong Password ==="
RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SERVER/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"wrong-password\"}")
if [ "$RESULT" = "401" ]; then
    echo "PASS: Got 401 for wrong password"
else
    echo "FAIL: Expected 401, got $RESULT"
fi

echo ""
echo "=== AUTH-06: No Token ==="
RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SERVER/gate/verify" \
  -F "image=@/dev/null")
if [ "$RESULT" = "401" ]; then
    echo "PASS: Got 401 for missing token"
else
    echo "FAIL: Expected 401, got $RESULT"
fi

echo ""
echo "=== FACE-01: Known Face (requires test image) ==="
if [ -f "test_known_face.jpg" ]; then
    RESPONSE=$(curl -s -X POST "$SERVER/gate/verify" \
      -H "Authorization: Bearer $TOKEN" \
      -F "image=@test_known_face.jpg")
    echo "Response: $RESPONSE"
else
    echo "SKIP: test_known_face.jpg not found"
fi

echo ""
echo "=== UNK-02: No Face (blank image) ==="
convert -size 640x480 xc:white /tmp/blank.jpg 2>/dev/null || \
  python3 -c "
from PIL import Image
img = Image.new('RGB', (640, 480), 'white')
img.save('/tmp/blank.jpg')
" 2>/dev/null
if [ -f "/tmp/blank.jpg" ]; then
    RESPONSE=$(curl -s -X POST "$SERVER/gate/verify" \
      -H "Authorization: Bearer $TOKEN" \
      -F "image=@/tmp/blank.jpg")
    echo "Response: $RESPONSE"
else
    echo "SKIP: Could not create blank image"
fi

echo ""
echo "=== Tests Complete ==="
```

---

## 4. Performance Benchmarks

Expected timings for each step:

| Step | Expected Time | Acceptable Max |
|------|--------------|----------------|
| Camera capture | < 200ms | 500ms |
| JPEG encoding | < 100ms | 300ms |
| Network upload (640×480 JPEG) | < 2s | 5s |
| Backend face verification | < 3s | 10s |
| Network download (JSON response) | < 500ms | 1s |
| GPIO relay activation | < 10ms | 50ms |
| **Total end-to-end** | **< 6s** | **15s** |

---

## 5. Regression Test Checklist

Run before every deployment:

- [ ] AUTH-01: Valid login works
- [ ] AUTH-02: Invalid credentials rejected
- [ ] FACE-01: Known face recognized
- [ ] UNK-01: Unknown face rejected
- [ ] UNK-02: No-face image rejected
- [ ] CAM-01: Camera initializes on boot
- [ ] HW-01: Relay activates on ALLOW
- [ ] HW-02: Gate closes after timeout
- [ ] HW-04: Red LED flashes on DENY
- [ ] NET-02: Retry logic works on network error
- [ ] Service starts on boot (systemd)
- [ ] Logs rotate properly
- [ ] Health check script runs

---

## 6. Test Data

### Capturing Test Images

```bash
# Capture a test image from the Pi camera
cd /opt/cityparking-gate
source venv/bin/activate

python3 -c "
import cv2
cam = cv2.VideoCapture(0)
cam.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
import time; time.sleep(1)  # Let camera warm up
ret, frame = cam.read()
if ret:
    cv2.imwrite('test_known_face.jpg', frame)
    print('Saved test_known_face.jpg')
cam.release()
"
```

### Creating Synthetic Test Images

```python
# Generate test images for API testing
import cv2
import numpy as np

# Blank white image (no face)
blank = np.ones((480, 640, 3), dtype=np.uint8) * 255
cv2.imwrite('test_blank.jpg', blank)

# Black image (no face)
black = np.zeros((480, 640, 3), dtype=np.uint8)
cv2.imwrite('test_black.jpg', black)

# Noise image (no face)
noise = np.random.randint(0, 256, (480, 640, 3), dtype=np.uint8)
cv2.imwrite('test_noise.jpg', noise)
```

---

## 7. Troubleshooting Failed Tests

| Test Failure | Likely Cause | Fix |
|-------------|--------------|-----|
| AUTH-01 fails | Wrong credentials | Check config.json |
| AUTH-01 fails | Server down | Check server status |
| FACE-01 fails | Poor lighting | Improve lighting at gate |
| FACE-01 fails | Wrong camera angle | Adjust camera position |
| FACE-01 fails | Low confidence | Re-enroll with better images |
| CAM-01 fails | USB not connected | Check cable |
| CAM-01 fails | Wrong camera_index | Try 1, 2, etc. |
| HW-01 fails | Wrong GPIO pin | Check wiring and config |
| HW-01 fails | Relay module broken | Replace relay |
| NET-02 fails | No retry logic | Check sample code |