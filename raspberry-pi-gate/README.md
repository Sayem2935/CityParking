# DIPS Raspberry Pi Gate Device

Production-ready Raspberry Pi client for the CityParking gate access control system.

## Architecture

```
Raspberry Pi                    Spring Boot Backend           FastAPI InsightFace
┌─────────────┐                ┌──────────────────┐         ┌─────────────────┐
│  Camera      │──capture──▶   │                  │         │                 │
│  main.py     │──POST/jpeg──▶ │  /api/gate/verify │──▶     │  Face Match     │
│  relay.py    │◀──JSON──────  │  GateVerification │◀──     │  Service        │
│  GPIO        │──open gate    │  Service          │         │                 │
└─────────────┘                └──────────────────┘         └─────────────────┘
```

**The Pi NEVER performs local face recognition.** All AI runs on the server.

## Backend Endpoint

The Pi calls the existing endpoint:

```
POST /api/gate/verify
```

This endpoint (already in `GateVerificationController.java`) accepts a JPEG image via multipart upload, runs face verification through the server-side InsightFace service, and returns a decision:

```json
{
  "decision": "ALLOW",
  "confidence": 0.82,
  "studentName": "John Doe",
  "studentId": "221-15-1234",
  "message": "Face verified successfully"
}
```

Authentication uses JWT. The Pi authenticates via `POST /api/auth/login` and includes the Bearer token in all requests.

## Files

| File | Purpose |
|------|---------|
| `main.py` | Entry point. Orchestrates capture → verify → gate loop |
| `camera.py` | Camera capture with USB webcam and Pi Camera support |
| `api_client.py` | HTTP client with JWT auth, retries, and exponential backoff |
| `relay.py` | GPIO relay control for gate actuation |
| `config.py` | Configuration loader with validation |
| `config.json` | Runtime configuration (backend URL, credentials, GPIO pin, etc.) |
| `logger.py` | Structured logging with file rotation |
| `health.py` | Background health checks for camera, backend, internet, relay |
| `requirements.txt` | Python dependencies |

## Quick Start

### 1. Install Dependencies

```bash
cd raspberry-pi-gate
pip install -r requirements.txt

# On Raspberry Pi, also install:
pip install RPi.GPIO
pip install picamera2  # Only if using Pi Camera module
```

### 2. Configure

Edit `config.json`:

```json
{
  "backend_url": "https://your-backend-url.com",
  "username": "gate-device",
  "password": "your-password",
  "camera_index": 0,
  "relay_pin": 17,
  "capture_width": 1280,
  "capture_height": 720,
  "gate_open_seconds": 3.0,
  "timeout": 15,
  "retry_count": 3
}
```

### 3. Run

```bash
python main.py

# With CLI overrides:
python main.py --backend http://192.168.1.100:8080 --camera 1
python main.py --config /path/to/custom-config.json
```

### 4. Run as Systemd Service (Recommended)

Create `/etc/systemd/system/cityparking-gate.service`:

```ini
[Unit]
Description=CityParking Gate Device
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/raspberry-pi-gate
ExecStart=/usr/bin/python3 /home/pi/raspberry-pi-gate/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable cityparking-gate
sudo systemctl start cityparking-gate
sudo journalctl -u cityparking-gate -f  # View logs
```

## Camera Support

| Camera Type | Status | Notes |
|-------------|--------|-------|
| USB Webcam | ✅ Default | Works on any system with OpenCV |
| Pi Camera (picamera2) | ✅ Supported | Auto-detected if `picamera2` is installed |

Set `camera_index` in `config.json` to select which USB camera to use (0 = default).

## GPIO Relay

The relay is controlled via Raspberry Pi GPIO (BCM numbering). The default pin is `GPIO 17`.

- **Active-high relay**: Set `relay_active_high: true` (default)
- **Active-low relay**: Set `relay_active_high: false`
- **Pulse duration**: `gate_open_seconds` controls how long the relay stays active

When running on non-Pi systems (e.g., development laptop), GPIO is automatically disabled and operations run in **dry-run mode** with console logging.

## Health Checks

A background thread checks every 60 seconds:

- **Camera**: Can it capture a frame?
- **Backend**: Is the `/api/gate/verify` endpoint responding?
- **Internet**: Can we reach the backend host?
- **Relay**: Is GPIO functional?

Status changes are logged immediately.

## Error Recovery

The device automatically recovers from:

| Failure | Recovery |
|---------|----------|
| Camera disconnect | Retries capture with backoff |
| Backend offline | Waits and retries with exponential backoff |
| JWT token expired | Automatic re-login and token refresh |
| Network unavailable | Retries with increasing intervals |
| Timeout | Retries up to `retry_count` times |
| Unexpected exception | Logged and loop continues |

**The device never crashes.** All exceptions are caught and logged.

## Logs

Logs are written to:

- **Console**: Real-time output
- **File**: `logs/gate_device.log` (rotated, 10MB max, 5 backups)

Log entries include:

- Timestamp (ISO 8601)
- Component name (camera, api, relay, health, main)
- Log level
- Request/response details
- Verification decisions with confidence scores
- Gate open/deny events
- Errors and retries

## Configuration Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `backend_url` | string | `http://localhost:8080` | Backend server URL |
| `username` | string | `gate-device` | Login username |
| `password` | string | `gate123` | Login password |
| `camera_index` | int | `0` | Camera device index |
| `capture_width` | int | `1280` | Capture width in pixels |
| `capture_height` | int | `720` | Capture height in pixels |
| `jpeg_quality` | int | `85` | JPEG compression quality (1-100) |
| `capture_interval` | float | `1.0` | Seconds between captures |
| `relay_pin` | int | `17` | GPIO BCM pin for relay |
| `relay_active_high` | bool | `true` | Relay trigger polarity |
| `gate_open_seconds` | float | `3.0` | How long gate stays open |
| `timeout` | int | `15` | HTTP request timeout (seconds) |
| `retry_count` | int | `3` | Max retries per request |
| `retry_backoff_factor` | float | `2.0` | Exponential backoff multiplier |
| `health_check_interval` | int | `60` | Health check interval (seconds) |
| `log_level` | string | `INFO` | Logging level |
| `log_file` | string | `logs/gate_device.log` | Log file path |