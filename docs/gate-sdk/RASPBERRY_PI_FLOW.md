# CityParking Gate SDK — Raspberry Pi Firmware Flow

This document describes the complete operational flow of the Raspberry Pi
gate controller, from power-on to gate operation.

---

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                    POWER ON / BOOT                       │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│               1. LOAD CONFIGURATION                      │
│    Read config.json → server_url, token, camera, GPIO    │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│               2. INITIALIZE HARDWARE                     │
│    Open USB camera → set resolution (640×480)            │
│    Setup GPIO relay pin (BCM 17, OUTPUT, LOW)            │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│               3. AUTHENTICATE                            │
│    POST /api/auth/login → receive JWT token              │
│    Store token in memory                                 │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│               4. READY STATE                             │
│    Waiting for vehicle at gate                           │
│    Camera capturing frames continuously                  │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│               5. CAPTURE IMAGE                           │
│    Motion detected or button pressed                     │
│    Capture frame → save as JPEG                          │
│    Validate: face present, image quality OK              │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│               6. SEND REQUEST                            │
│    POST /api/gate/verify                                 │
│    Header: Authorization: Bearer <token>                 │
│    Body: multipart/form-data, field "image"              │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│               7. RECEIVE RESPONSE                        │
│    Parse JSON response                                   │
│    Check: success, data.decision, data.reason            │
└──────────────────────────┬──────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
              ┌──────────┐  ┌──────────┐
              │  ALLOW   │  │  DENY    │
              └────┬─────┘  └────┬─────┘
                   │             │
                   ▼             ▼
┌──────────────────────┐  ┌──────────────────────┐
│ 8. OPEN GATE         │  │ 8. DENY ACCESS       │
│ GPIO relay HIGH      │  │ Flash red LED        │
│ Wait 5000ms          │  │ Log denial           │
│ GPIO relay LOW       │  │ Ready for next       │
└──────────┬───────────┘  └──────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│               9. LOG & RESET                             │
│    Log event locally (timestamp, decision, user)         │
│    Return to READY STATE                                 │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Load Configuration

```python
# On boot, read config.json
config = {
    "server_url": "https://cityparking-api.onrender.com/api",
    "bearer_token": "",          # Empty on first run; populated after login
    "device_email": "gate-device@cityparking.edu",
    "device_password": "device-password",
    "camera_index": 0,
    "capture_width": 640,
    "capture_height": 480,
    "relay_gpio_pin": 17,
    "relay_duration_ms": 5000,
    "request_timeout_sec": 30,
    "max_retries": 5,
    "token_refresh_hours": 20
}
```

**If config.json is missing or corrupt:** log error and halt. Do NOT operate
the gate without proper configuration.

---

## Step 2: Initialize Hardware

### Camera

```python
import cv2

camera = cv2.VideoCapture(config["camera_index"])
camera.set(cv2.CAP_PROP_FRAME_WIDTH, config["capture_width"])
camera.set(cv2.CAP_PROP_FRAME_HEIGHT, config["capture_height"])

if not camera.isOpened():
    log_error("Camera failed to open")
    # Enter safe mode: gate stays closed, alert admin
```

### GPIO Relay

```python
import RPi.GPIO as GPIO

RELAY_PIN = config["relay_gpio_pin"]

GPIO.setmode(GPIO.BCM)
GPIO.setup(RELAY_PIN, GPIO.OUT)
GPIO.output(RELAY_PIN, GPIO.LOW)  # Gate starts closed
```

**Relay Wiring:**

```
Raspberry Pi          Relay Module
─────────────         ─────────────
Pin 17 (BCM)  ────▶   IN
5V            ────▶   VCC
GND           ────▶   GND

Relay Module          Gate Barrier
─────────────         ─────────────
COM           ────▶   Barrier trigger (+)
NO            ────▶   Barrier trigger (-)
```

---

## Step 3: Authenticate

```python
import requests

def authenticate():
    response = requests.post(
        f"{config['server_url']}/auth/login",
        json={
            "email": config["device_email"],
            "password": config["device_password"]
        },
        timeout=15
    )

    if response.status_code == 200:
        data = response.json()
        if data["success"]:
            return data["data"]["token"]
        else:
            raise Exception(f"Login failed: {data['message']}")
    else:
        raise Exception(f"Login HTTP error: {response.status_code}")
```

**If authentication fails:**
- Retry 3 times with 5-second delays
- If still failing: log CRITICAL error, enter safe mode
- Gate remains closed until authentication succeeds

---

## Step 4: Ready State

The Pi enters a continuous loop:

```python
while True:
    ret, frame = camera.read()
    if not ret:
        handle_camera_error()
        continue

    # Optional: detect motion or wait for button press
    if should_capture(frame):
        image_path = save_capture(frame)
        process_vehicle(image_path)
```

### Motion Detection (Optional)

Simple frame-difference method:

```python
prev_frame = None

def should_capture(frame):
    global prev_frame
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (21, 21), 0)

    if prev_frame is None:
        prev_frame = gray
        return False

    delta = cv2.absdiff(prev_frame, gray)
    thresh = cv2.threshold(delta, 25, 255, cv2.THRESH_BINARY)[1]
    motion_pixels = cv2.countNonZero(thresh)

    prev_frame = gray
    return motion_pixels > 5000  # Threshold for motion
```

---

## Step 5: Capture Image

```python
def save_capture(frame):
    path = "/tmp/capture.jpg"
    cv2.imwrite(path, frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return path
```

**Quality settings:**
- JPEG quality 85 (good balance of size vs. clarity)
- Typical file size: 50–150 KB at 640×480
- Ensure adequate lighting for face detection

---

## Step 6: Send Request

```python
def verify_access(image_path):
    with open(image_path, "rb") as f:
        response = requests.post(
            f"{config['server_url']}/gate/verify",
            headers={"Authorization": f"Bearer {token}"},
            files={"image": ("capture.jpg", f, "image/jpeg")},
            timeout=config["request_timeout_sec"]
        )
    return response
```

**Request details:**
- Method: POST
- Content-Type: multipart/form-data
- Field name: `image`
- File name: `capture.jpg`
- MIME type: `image/jpeg`

---

## Step 7: Receive Response

```python
def process_response(response):
    if response.status_code == 401:
        # Token expired — re-authenticate
        refresh_token()
        return "RETRY"

    if response.status_code != 200:
        log_error(f"HTTP {response.status_code}: {response.text}")
        return "ERROR"

    data = response.json()

    if not data.get("success"):
        log_error(f"API error: {data.get('message')}")
        return "ERROR"

    decision = data["data"]["decision"]
    reason = data["data"]["reason"]

    if decision == "ALLOW":
        return "OPEN"
    else:
        log_info(f"Denied: {reason}")
        return "DENY"
```

---

## Step 8a: Open Gate (ALLOW)

```python
def open_gate(relay_duration_ms=5000):
    # Activate relay
    GPIO.output(RELAY_PIN, GPIO.HIGH)
    log_info("Gate OPENING — relay activated")

    # Wait for gate to fully open
    time.sleep(relay_duration_ms / 1000.0)

    # Deactivate relay
    GPIO.output(RELAY_PIN, GPIO.LOW)
    log_info("Gate CLOSED — relay deactivated")
```

**Timing:**
- `relay_duration_ms` is returned by the server (default 5000ms)
- The relay stays energized for this duration
- After the duration, the relay deactivates and the gate barrier closes
- Adjust based on actual gate barrier speed

---

## Step 8b: Deny Access (DENY)

```python
def deny_access(reason):
    log_warning(f"Access DENIED: {reason}")

    # Optional: flash red LED for 2 seconds
    flash_led("red", duration=2)

    # Gate stays closed — no GPIO action
    # Return to ready state immediately
```

---

## Step 9: Log and Reset

```python
def log_event(timestamp, decision, reason, user=None):
    entry = {
        "timestamp": timestamp,
        "decision": decision,
        "reason": reason,
        "user_id": user.get("id") if user else None,
        "user_name": user.get("name") if user else None
    }

    # Append to local log file
    with open("/var/log/gate-access.log", "a") as f:
        f.write(json.dumps(entry) + "\n")
```

After logging, return to Step 4 (Ready State).

---

## Token Refresh

The JWT token expires after 24 hours. Refresh proactively:

```python
import time

token_acquired_at = time.time()
TOKEN_REFRESH_SEC = config["token_refresh_hours"] * 3600  # 20 hours

def check_token_refresh():
    if time.time() - token_acquired_at > TOKEN_REFRESH_SEC:
        log_info("Refreshing JWT token")
        authenticate()
```

Check before each verification request.

---

## Error Recovery

| Error | Action |
|-------|--------|
| Camera read fails | Retry 3 times, then reinitialize camera |
| Camera disconnected | Log CRITICAL, enter safe mode, alert admin |
| Network timeout | Retry with exponential backoff (2s, 5s, 10s, 30s) |
| Connection refused | Retry 5 times, then enter safe mode |
| 401 Unauthorized | Re-authenticate, retry request |
| 429 Rate limited | Wait `Retry-After` seconds, then retry |
| 500 Server error | Retry with backoff |
| 503 Unavailable | Retry with backoff |
| Invalid JSON response | Log error, retry |

---

## Safe Mode

When the Pi cannot communicate with the backend after max retries:

```
┌──────────────────────────────────┐
│           SAFE MODE              │
│                                  │
│  • Gate stays CLOSED (GPIO LOW)  │
│  • Red LED solid ON              │
│  • Attempt reconnect every 60s   │
│  • Log all attempts locally      │
│  • When backend returns:         │
│    → Resume normal operation     │
└──────────────────────────────────┘
```

---

## Graceful Shutdown

```python
import signal

def shutdown(signum, frame):
    log_info("Shutting down gracefully")
    GPIO.output(RELAY_PIN, GPIO.LOW)  # Ensure gate closed
    GPIO.cleanup()
    camera.release()
    sys.exit(0)

signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)
```

Always ensure the relay is deactivated and GPIO is cleaned up on exit.