# CityParking Gate SDK — Security Guide

This document covers the security architecture, best practices, and
hardening recommendations for the Raspberry Pi gate device.

---

## 1. Authentication Architecture

### JWT Bearer Tokens

The CityParking backend uses **JSON Web Tokens (JWT)** with **HS256** signing
for all authenticated API calls.

**How it works:**

1. The Raspberry Pi authenticates via `POST /api/auth/login` with email/password
2. The backend validates credentials against BCrypt password hashes in PostgreSQL
3. On success, the backend returns a signed JWT token
4. The Pi includes this token in all subsequent requests: `Authorization: Bearer <token>`
5. The token expires after **24 hours** (configurable via `JWT_EXPIRATION_MS`)

**Token payload (decoded):**

```json
{
  "sub": "gate-device@cityparking.edu",
  "iat": 1720000000,
  "exp": 1720086400
}
```

**Pi responsibilities:**
- Store token **in memory only** — never write to disk
- Refresh token proactively every 20 hours (before 24h expiry)
- If a 401 response is received, re-authenticate immediately
- Never log the full token (log only last 8 characters for debugging)

### Device Account

Create a dedicated user account for each gate device:

```
Email:    gate-entrance-A@cityparking.edu
Password: <strong-random-password>
Role:     USER
```

**Do NOT share accounts** between devices or use human operator accounts.

---

## 2. Transport Security (HTTPS)

### Requirement

**All API communication MUST use HTTPS.** The backend is deployed on Render
which provides automatic TLS termination.

- URL must start with `https://`
- Certificate validation MUST be enabled (default in Python `requests`)
- Do NOT use `verify=False` in production

### Certificate Pinning (Optional)

For high-security deployments, pin the server certificate:

```python
# Pin the server's public key fingerprint
response = requests.post(
    url,
    files=files,
    headers=headers,
    timeout=30,
    verify="/etc/ssl/certs/ca-certificates.crt"  # System CA bundle
)
```

---

## 3. API Key / Device Token

Currently, the system uses JWT authentication. The device authenticates
as a regular user and receives a JWT token.

**Future enhancement:** Implement a dedicated device API key system:

| Feature | Current | Recommended Future |
|---------|---------|-------------------|
| Authentication | JWT (user login) | Device API Key + JWT |
| Token lifetime | 24 hours | API Key: permanent, JWT: 1 hour |
| Revocation | Change password | Revoke API key in admin panel |
| Rate limiting | Per-user | Per-device |

---

## 4. Replay Attack Prevention

### Current Protections

1. **HTTPS/TLS** — Prevents man-in-the-middle interception
2. **JWT expiry** — Tokens are valid for 24 hours maximum
3. **Server-side logging** — All access attempts are logged in `access_logs`

### Recommended Additional Protections

1. **Timestamp validation:**
   ```python
   # Include timestamp in each request
   headers["X-Request-Timestamp"] = str(int(time.time()))
   ```

2. **Request signing (future):**
   ```python
   import hmac, hashlib

   timestamp = str(int(time.time()))
   message = f"{timestamp}|{image_hash}"
   signature = hmac.new(
       device_secret.encode(),
       message.encode(),
       hashlib.sha256
   ).hexdigest()

   headers["X-Request-Timestamp"] = timestamp
   headers["X-Request-Signature"] = signature
   ```

3. **Nonce tracking (future):**
   - Server tracks recent request nonces
   - Reject duplicate nonces within a time window

---

## 5. Timestamp Validation

Each API response includes a `timestamp` field. The Pi should validate:

```python
from datetime import datetime, timezone

response_time = datetime.fromisoformat(response["timestamp"].replace("Z", "+00:00"))
now = datetime.now(timezone.utc)

# Reject responses with timestamps more than 5 minutes in the past
if (now - response_time).total_seconds() > 300:
    log_warning("Response timestamp is stale — possible clock skew or replay")
```

**Ensure the Pi's system clock is synchronized via NTP:**

```bash
sudo timedatectl set-ntp true
# Verify:
timedatectl status
```

---

## 6. Rate Limiting

### Backend Rate Limiting

The Spring Boot backend includes a `RateLimitingFilter` that uses Bucket4j
to limit requests per client IP. If the Pi sends too many requests:

- HTTP 429 is returned
- `Retry-After` header indicates wait time
- The Pi MUST respect this header

### Pi-Side Rate Limiting

Implement client-side rate limiting to avoid hitting server limits:

```python
import time

last_request_time = 0
MIN_REQUEST_INTERVAL = 2.0  # Minimum 2 seconds between requests

def rate_limit():
    global last_request_time
    elapsed = time.time() - last_request_time
    if elapsed < MIN_REQUEST_INTERVAL:
        time.sleep(MIN_REQUEST_INTERVAL - elapsed)
    last_request_time = time.time()
```

---

## 7. Raspberry Pi Security Hardening

### Operating System

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades

# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon

# Change default password
passwd pi

# Enable firewall
sudo apt install ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw enable
```

### SSH Hardening

```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no          # Use key-based auth only
PubkeyAuthentication yes
MaxAuthTries 3
Protocol 2
```

### File Permissions

```bash
# Config file: read-only, owned by root
sudo chown root:root /opt/cityparking-gate/config.json
sudo chmod 600 /opt/cityparking-gate/config.json

# Log file: writable by service user only
sudo chown gate-service:gate-service /var/log/gate-access.log
sudo chmod 640 /var/log/gate-access.log
```

### Credential Storage

- **Never** store credentials in source code
- **Never** commit `config.json` to version control
- Use environment variables or a secrets manager for production:
  ```bash
  export GATE_EMAIL="gate-device@cityparking.edu"
  export GATE_PASSWORD="secure-password-here"
  ```
- Add `config.json` to `.gitignore`

### Network Isolation

- Place the Raspberry Pi on a dedicated VLAN for IoT/gate devices
- Restrict outbound traffic to only the backend server IP/port
- Block all inbound connections except SSH from admin network

```bash
# Example: Allow only backend server
sudo ufw allow out to <BACKEND_IP> port 443
sudo ufw deny out 443
```

### Disable USB Boot (Optional)

If using an external camera, consider disabling USB boot to prevent
unauthorized boot from USB devices:

```bash
# In /boot/config.txt
program_usb_boot_mode=0
```

---

## 8. Image Security

### Image Handling Best Practices

1. **Temporary storage only** — Save captures to `/tmp/` (RAM-backed tmpfs)
2. **Delete after upload** — Remove the local image file after successful send
3. **No persistent storage** — Never store face images on the SD card
4. **Image validation** — Verify image dimensions and file size before upload

```python
import os

def cleanup_image(path):
    """Securely delete captured image after upload."""
    try:
        if os.path.exists(path):
            os.remove(path)
    except OSError as e:
        log_warning(f"Failed to delete image: {e}")
```

### File Upload Security (Backend)

The backend enforces:
- Maximum file size: 10 MB
- Allowed MIME types: `image/jpeg`, `image/png`
- Content-type validation
- File extension validation

---

## 9. Error Information Disclosure

### Do NOT expose sensitive information in logs

```python
# BAD — logs the full token
log_info(f"Using token: {token}")

# GOOD — logs only a masked version
log_info(f"Using token: ...{token[-8:]}")

# BAD — logs the full password
log_error(f"Login failed for {email} with password {password}")

# GOOD — logs only the email
log_error(f"Login failed for {email}")
```

### Do NOT expose server errors to end users

```python
# On the Pi display (if any), show generic messages:
# "Access Denied" — NOT "Face embedding not found in database for user_id=42"
# "System Error"  — NOT "ConnectionRefused: localhost:8000"
```

---

## 10. Physical Security

| Measure | Description |
|---------|-------------|
| **Enclosure** | Lock the Pi in a weatherproof, tamper-resistant enclosure |
| **SD card** | Use a case that prevents SD card removal |
| **USB ports** | Disable unused USB ports or use epoxy for physical locking |
| **GPIO** | Protect relay wiring from external access |
| **Monitoring** | Add a tamper switch that triggers a security alert |
| **Power** | Use a UPS (battery backup) to prevent power-cut attacks |

---

## 11. Security Checklist

Before deploying the Raspberry Pi gate device:

- [ ] Dedicated device account created (not shared with humans)
- [ ] Strong password set (16+ characters, random)
- [ ] HTTPS enforced (no HTTP fallback)
- [ ] Certificate validation enabled
- [ ] Firewall configured (only SSH + outbound HTTPS)
- [ ] SSH key-based authentication only
- [ ] Default Raspberry Pi password changed
- [ ] System clock synchronized via NTP
- [ ] config.json has restricted file permissions (600)
- [ ] config.json is NOT in version control
- [ ] Log files have restricted permissions
- [ ] Unnecessary services disabled (Bluetooth, Avahi)
- [ ] Physical enclosure is locked
- [ ] Tamper detection in place
- [ ] Auto-updates enabled for security patches
- [ ] Token stored in memory only (not on disk)
- [ ] Images deleted after upload
- [ ] Rate limiting respected
- [ ] Error messages do not expose sensitive data