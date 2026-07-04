# CityParking Gate SDK — Raspberry Pi Deployment Guide

Step-by-step guide to deploy the CityParking gate controller on a
Raspberry Pi 4 (or 5) running Raspberry Pi OS (Bookworm or later).

---

## 1. Hardware Requirements

| Component | Specification |
|-----------|--------------|
| Board | Raspberry Pi 4 Model B (2GB+) or Pi 5 |
| Storage | 16 GB+ microSD card (Class 10 / A2) |
| Camera | USB webcam (1280×720+, UVC compliant) |
| Relay | 5V single-channel relay module (SRD-05VDC-SL-C) |
| LEDs | 1× red, 1× green (with 220Ω resistors) |
| Power | 5V 3A USB-C power supply |
| Network | Ethernet (recommended) or WiFi |
| Enclosure | Weatherproof, lockable enclosure |

### Recommended Cameras

| Camera | Resolution | Notes |
|--------|-----------|-------|
| Logitech C920 | 1080p | Best quality, reliable |
| Logitech C270 | 720p | Budget option |
| ELP USB Camera | 1080p | Industrial, weatherproof |

### Wiring Diagram

```
Raspberry Pi GPIO
├── BCM 17 (Pin 11) → Relay IN → Gate motor
├── BCM 27 (Pin 13) → 220Ω → Red LED → GND
├── BCM 22 (Pin 15) → 220Ω → Green LED → GND
└── GND (Pin 9) → Relay GND, LED GND
```

---

## 2. Install Raspberry Pi OS

```bash
# Flash Raspberry Pi OS Lite (64-bit) using Raspberry Pi Imager
# https://www.raspberrypi.com/software/

# On first boot, update the system
sudo apt update && sudo apt upgrade -y
```

---

## 3. Install Python and Dependencies

```bash
# Python 3.9+ is required (pre-installed on Bookworm)
python3 --version

# Install pip if not present
sudo apt install -y python3-pip python3-venv

# Install system-level OpenCV dependencies
sudo apt install -y \
    libopencv-dev \
    python3-opencv \
    libhdf5-dev \
    libharfbuzz0b \
    liblapack-dev \
    libatlas-base-dev

# Create project directory
sudo mkdir -p /opt/cityparking-gate
sudo chown pi:pi /opt/cityparking-gate
cd /opt/cityparking-gate

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python packages
pip install --upgrade pip
pip install opencv-python-headless requests RPi.GPIO
```

### Alternative: Install from requirements.txt

```bash
# Copy requirements.txt to the Pi, then:
pip install -r requirements.txt
```

**requirements.txt:**

```
opencv-python-headless>=4.8.0
requests>=2.31.0
RPi.GPIO>=0.7.1
```

---

## 4. Deploy Application Files

```bash
# Copy files to the Pi (from your development machine)
scp docs/gate-sdk/raspberry_pi_sample.py pi@<PI_IP>:/opt/cityparking-gate/
scp docs/gate-sdk/config.example.json pi@<PI_IP>:/opt/cityparking-gate/config.json

# On the Pi, set permissions
cd /opt/cityparking-gate
chmod +x raspberry_pi_sample.py
```

---

## 5. Configure the Device

```bash
# Edit config.json with your actual values
nano /opt/cityparking-gate/config.json
```

**Minimum required changes:**

```json
{
  "server_url": "https://your-backend-url.com/api",
  "device_email": "gate-entrance-A@cityparking.edu",
  "device_password": "your-strong-password-here",
  "camera_index": 0,
  "relay_gpio_pin": 17
}
```

**Secure the config file:**

```bash
sudo chown root:root /opt/cityparking-gate/config.json
sudo chmod 600 /opt/cityparking-gate/config.json
```

---

## 6. Test the Setup

### Test Camera

```bash
cd /opt/cityparking-gate
source venv/bin/activate

python3 -c "
import cv2
cam = cv2.VideoCapture(0)
if cam.isOpened():
    ret, frame = cam.read()
    if ret:
        cv2.imwrite('/tmp/test.jpg', frame)
        print('Camera OK — saved /tmp/test.jpg')
        print(f'Resolution: {frame.shape[1]}x{frame.shape[0]}')
    else:
        print('ERROR: Failed to capture frame')
    cam.release()
else:
    print('ERROR: Camera not found')
"
```

### Test GPIO

```bash
python3 -c "
import RPi.GPIO as GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(17, GPIO.OUT)
GPIO.output(17, GPIO.HIGH)
print('Relay ON')
import time; time.sleep(2)
GPIO.output(17, GPIO.LOW)
print('Relay OFF')
GPIO.cleanup()
print('GPIO test complete')
"
```

### Test API Connection

```bash
curl -s -X POST \
  "https://your-backend-url.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"gate-entrance-A@cityparking.edu","password":"your-password"}' \
  | python3 -m json.tool
```

### Run the Gate Controller

```bash
cd /opt/cityparking-gate
source venv/bin/activate
python3 raspberry_pi_sample.py
```

Expected output:

```
2026-07-04 08:00:00 [INFO] Configuration loaded from config.json
2026-07-04 08:00:00 [INFO] Camera 0 initialized at 640x480
2026-07-04 08:00:01 [INFO] GPIO initialized — relay pin BCM 17
2026-07-04 08:00:02 [INFO] Authentication successful (token: ...aBcD1234)
2026-07-04 08:00:02 [INFO] System ready — waiting for vehicles
```

---

## 7. Create systemd Service

Create a service file so the gate controller starts automatically on boot
and restarts on failure.

```bash
sudo nano /etc/systemd/system/cityparking-gate.service
```

**Service file content:**

```ini
[Unit]
Description=CityParking Gate Controller
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/opt/cityparking-gate
ExecStart=/opt/cityparking-gate/venv/bin/python3 /opt/cityparking-gate/raspberry_pi_sample.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cityparking-gate

# Environment
Environment=GATE_CONFIG=/opt/cityparking-gate/config.json

# Security hardening
NoNewPrivileges=false
ProtectSystem=full
ReadWritePaths=/var/log /tmp

# Resource limits
MemoryMax=256M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
```

### Enable and Start

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable on boot
sudo systemctl enable cityparking-gate.service

# Start now
sudo systemctl start cityparking-gate.service

# Check status
sudo systemctl status cityparking-gate.service
```

### Useful Commands

```bash
# View live logs
sudo journalctl -u cityparking-gate.service -f

# View recent logs
sudo journalctl -u cityparking-gate.service --since "1 hour ago"

# Restart the service
sudo systemctl restart cityparking-gate.service

# Stop the service
sudo systemctl stop cityparking-gate.service

# Disable on boot
sudo systemctl disable cityparking-gate.service
```

---

## 8. Log Rotation

Prevent log files from filling the SD card:

```bash
sudo nano /etc/logrotate.d/cityparking-gate
```

```
/var/log/gate-access.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 640 root adm
}
```

---

## 9. Health Checks

### Automated Health Check Script

```bash
sudo nano /opt/cityparking-gate/healthcheck.sh
```

```bash
#!/bin/bash
# CityParking Gate Controller Health Check

SERVICE="cityparking-gate"
LOG_FILE="/var/log/gate-health.log"

check_service() {
    if systemctl is-active --quiet $SERVICE; then
        echo "$(date): $SERVICE is running" >> $LOG_FILE
        return 0
    else
        echo "$(date): $SERVICE is NOT running — restarting" >> $LOG_FILE
        sudo systemctl restart $SERVICE
        return 1
    fi
}

check_camera() {
    python3 -c "
import cv2
cam = cv2.VideoCapture(0)
if cam.isOpened():
    cam.release()
    exit(0)
exit(1)
" 2>/dev/null
    return $?
}

check_network() {
    curl -sf --max-time 10 "https://cityparking-api.onrender.com/api/auth/login" > /dev/null 2>&1
    return $?
}

# Run checks
check_service
check_camera || echo "$(date): Camera check FAILED" >> $LOG_FILE
check_network || echo "$(date): Network check FAILED" >> $LOG_FILE
```

```bash
chmod +x /opt/cityparking-gate/healthcheck.sh

# Run every 5 minutes via cron
crontab -e
# Add: */5 * * * * /opt/cityparking-gate/healthcheck.sh
```

---

## 10. Remote Access (SSH)

```bash
# Enable SSH (if not already enabled)
sudo raspi-config nonint do_ssh 0

# Set static IP (optional)
sudo nano /etc/dhcpcd.conf
```

```
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 8.8.4.4
```

---

## 11. OTA Updates

To update the gate controller software remotely:

```bash
# From your development machine
scp raspberry_pi_sample.py pi@192.168.1.100:/opt/cityparking-gate/

# On the Pi (or via SSH)
ssh pi@192.168.1.100
sudo systemctl restart cityparking-gate.service
```

---

## 12. Troubleshooting

| Problem | Solution |
|---------|----------|
| Camera not found | Check USB connection, try `camera_index: 1` or `2` |
| GPIO permission denied | Run service as root, or add user to `gpio` group |
| Connection refused | Check network, verify `server_url` in config |
| 401 Unauthorized | Check `device_email` and `device_password` |
| 429 Rate Limited | Increase `min_request_interval_sec` |
| Service won't start | Check `journalctl -u cityparking-gate -e` |
| High CPU usage | Reduce capture frequency, increase sleep interval |
| SD card full | Check logs, enable log rotation |

---

## 13. Pre-Deployment Checklist

- [ ] Raspberry Pi OS installed and updated
- [ ] Python 3.9+ installed
- [ ] Virtual environment created and packages installed
- [ ] Camera connected and tested
- [ ] Relay wired and tested
- [ ] config.json filled with correct values
- [ ] config.json permissions set to 600
- [ ] API connection tested (curl)
- [ ] Gate controller runs manually
- [ ] systemd service created and enabled
- [ ] Health check cron job configured
- [ ] Log rotation configured
- [ ] SSH access enabled
- [ ] Static IP configured (if applicable)
- [ ] Physical enclosure secured