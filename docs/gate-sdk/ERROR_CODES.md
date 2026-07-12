# DIPS Gate SDK — Error Codes Reference

Complete reference of all error codes the Raspberry Pi gate device may encounter.

---

## HTTP Status Codes

| Code | Name | Description | Pi Action |
|------|------|-------------|-----------|
| `200` | OK | Request processed successfully | Parse `data.decision` |
| `400` | Bad Request | Missing or invalid image file | Log warning, retry with new capture |
| `401` | Unauthorized | JWT token missing, expired, or invalid | Re-authenticate, then retry |
| `403` | Forbidden | Authenticated but insufficient permissions | Log CRITICAL, check device account role |
| `404` | Not Found | Endpoint does not exist | Log CRITICAL, check server URL in config |
| `408` | Request Timeout | Server-side timeout processing request | Retry with backoff |
| `413` | Payload Too Large | Image file exceeds 10 MB limit | Reduce image resolution or JPEG quality |
| `415` | Unsupported Media Type | File is not JPEG or PNG | Ensure camera outputs JPEG |
| `429` | Too Many Requests | Rate limit exceeded | Wait for `Retry-After` header seconds |
| `500` | Internal Server Error | Backend processing failure | Retry with backoff |
| `502` | Bad Gateway | Reverse proxy error (Render/nginx) | Retry with backoff |
| `503` | Service Unavailable | Backend or AI service is down | Retry with exponential backoff |
| `504` | Gateway Timeout | Upstream service timeout | Retry with backoff |

---

## Application-Level Decision Reasons

These are returned in `data.reason` when `data.decision` is `"DENY"`:

| Reason Code | Description | Confidence | Pi Action |
|-------------|-------------|------------|-----------|
| `VERIFIED` | Face matched and vehicle registered | 0.45–1.00 | Open gate (decision=ALLOW) |
| `FACE_NOT_MATCHED` | No enrolled user matches the captured face | 0.00–0.44 | Deny, flash red LED |
| `NO_FACE` | No face detected in the image | 0.00 | Deny, prompt user to face camera |
| `MULTIPLE_FACES` | More than one face detected in the image | 0.00 | Deny, prompt single person only |
| `FACE_LOW_QUALITY` | Face image too blurry, dark, or angled | <0.30 | Deny, prompt better positioning |
| `NO_REGISTERED_VEHICLE` | User is verified but has no vehicle registered | 0.45–1.00 | Deny, user needs to register vehicle |
| `NO_ENROLLMENT` | No face enrollment exists in the system | 0.00 | Deny, user needs face enrollment |
| `ENROLLMENT_PENDING` | Face enrollment is still being processed | 0.00 | Deny, ask user to wait |
| `ACCESS_REVOKED` | User's access has been administratively revoked | N/A | Deny, log security event |
| `AI_SERVICE_ERROR` | FastAPI/InsightFace service returned an error | N/A | Retry, then enter safe mode |
| `INTERNAL_ERROR` | Unexpected server-side error | N/A | Retry with backoff |

---

## Pi-Side Error Codes

These are local errors detected by the Raspberry Pi firmware:

| Error | Category | Description | Action |
|-------|----------|-------------|--------|
| `CAM_INIT_FAILED` | Hardware | Camera failed to initialize on boot | Retry 3×, then safe mode |
| `CAM_DISCONNECTED` | Hardware | Camera USB disconnected during operation | Retry 3×, then safe mode |
| `CAM_CAPTURE_FAILED` | Hardware | Camera returned empty frame | Retry capture |
| `CAM_LOW_LIGHT` | Hardware | Image too dark for face detection | Warn, capture anyway |
| `RELAY_STUCK` | Hardware | Relay state did not change as expected | Log CRITICAL, alert admin |
| `GPIO_INIT_FAILED` | Hardware | GPIO pin setup failed | Log CRITICAL, halt |
| `NET_TIMEOUT` | Network | Request exceeded 30s timeout | Retry with backoff |
| `NET_CONN_REFUSED` | Network | Server refused TCP connection | Retry 5×, then safe mode |
| `NET_DNS_FAIL` | Network | DNS resolution failed | Check network, retry |
| `NET_UNREACHABLE` | Network | No network connectivity | Check cable/WiFi, safe mode |
| `AUTH_FAILED` | Auth | Login credentials rejected | Log CRITICAL, check config |
| `AUTH_EXPIRED` | Auth | JWT token expired (24h) | Re-authenticate automatically |
| `AUTH_REFRESH_FAILED` | Auth | Token refresh attempt failed | Retry, then safe mode |
| `CONFIG_MISSING` | Config | config.json not found | Halt, require config file |
| `CONFIG_INVALID` | Config | config.json has invalid JSON | Halt, fix config file |
| `CONFIG_FIELD_MISSING` | Config | Required field missing from config | Halt, add missing field |
| `IMG_TOO_LARGE` | Image | Capture exceeds 10 MB server limit | Reduce resolution/quality |
| `IMG_SAVE_FAILED` | Image | Failed to write image to /tmp | Check disk space |
| `LOG_WRITE_FAILED` | Logging | Failed to write to log file | Log to stderr instead |

---

## Error Response Format

All API errors return the standard `ApiResponse` wrapper:

```json
{
  "success": false,
  "message": "Human-readable error description",
  "data": null,
  "timestamp": "2026-07-04T08:30:00"
}
```

### Specific Error Examples

#### 401 — Token Expired

```json
{
  "success": false,
  "message": "Unauthorized: Authentication required",
  "data": null,
  "timestamp": "2026-07-04T08:30:00"
}
```

**HTTP Headers:**
```
WWW-Authenticate: Bearer realm="cityparking", error="invalid_token"
```

#### 400 — No Image Provided

```json
{
  "success": false,
  "message": "Image is required",
  "data": null,
  "timestamp": "2026-07-04T08:30:00"
}
```

#### 400 — Invalid Image Format

```json
{
  "success": false,
  "message": "Invalid image format. Accepted: JPEG, PNG",
  "data": null,
  "timestamp": "2026-07-04T08:30:00"
}
```

#### 413 — Image Too Large

```json
{
  "success": false,
  "message": "File size exceeds maximum allowed size of 10MB",
  "data": null,
  "timestamp": "2026-07-04T08:30:00"
}
```

#### 429 — Rate Limited

```
HTTP/1.1 429 Too Many Requests
Retry-After: 10
```

```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "data": null,
  "timestamp": "2026-07-04T08:30:00"
}
```

#### 500 — AI Service Error

```json
{
  "success": false,
  "message": "Access verification failed: Connection refused to AI service",
  "data": null,
  "timestamp": "2026-07-04T08:30:00"
}
```

#### 500 — No Face Detected (Server-Side)

```json
{
  "success": false,
  "message": "Face verification failed: No face detected in image",
  "data": null,
  "timestamp": "2026-07-04T08:30:00"
}
```

#### 503 — Service Unavailable

```json
{
  "success": false,
  "message": "Service temporarily unavailable. Please try again.",
  "data": null,
  "timestamp": "2026-07-04T08:30:00"
}
```

---

## Error Severity Levels

| Level | Description | Example | Pi Behavior |
|-------|-------------|---------|-------------|
| `INFO` | Normal operation | Face not matched → DENY | Log and continue |
| `WARNING` | Recoverable issue | Network timeout → retry | Log, retry, continue |
| `ERROR` | Operation failed after retries | 3 timeouts in a row | Log, alert, continue |
| `CRITICAL` | System cannot operate safely | Camera disconnected | Log, safe mode, alert |

---

## Recommended Retry Strategy

| HTTP Code | Retry? | Initial Delay | Max Delay | Max Attempts |
|-----------|--------|---------------|-----------|--------------|
| 200 | No | — | — | — |
| 400 | No | — | — | — |
| 401 | Yes (re-auth first) | 0s | 0s | 1 |
| 403 | No | — | — | — |
| 408 | Yes | 2s | 30s | 5 |
| 429 | Yes (use Retry-After) | Retry-After | Retry-After | 3 |
| 500 | Yes | 2s | 30s | 5 |
| 502 | Yes | 5s | 60s | 5 |
| 503 | Yes | 5s | 60s | 5 |
| 504 | Yes | 5s | 60s | 5 |
| Timeout | Yes | 2s | 30s | 5 |
| Connection refused | Yes | 2s | 60s | 5 |
| DNS failure | Yes | 10s | 60s | 3 |

### Exponential Backoff Formula

```python
delay = min(initial_delay * (2 ** attempt), max_delay)
# Add jitter: delay += random.uniform(0, delay * 0.1)
```

---

## Logging Format

Each Pi error should be logged with:

```json
{
  "timestamp": "2026-07-04T08:30:00Z",
  "level": "ERROR",
  "code": "NET_TIMEOUT",
  "message": "Request to /api/gate/verify timed out after 30s",
  "attempt": 2,
  "max_attempts": 5,
  "next_retry_in_sec": 10,
  "http_status": null,
  "server_message": null
}