# DIPS — Production Deployment Guide

**Version:** 1.0  
**Last Updated:** 2026-06-09  
**Audience:** DevOps, Backend Engineers

---

## 1. Prerequisites

| Requirement          | Minimum                          |
|----------------------|----------------------------------|
| Docker               | 24.0+                            |
| Docker Compose       | v2.20+                           |
| RAM                  | 8 GB (16 GB recommended)         |
| CPU                  | 4 cores (8 recommended)          |
| Disk                 | 50 GB SSD                        |
| Network              | Outbound access for AI models    |

---

## 2. Environment Setup

### 2.1 Clone Repository

```bash
git clone https://github.com/Sayem2935/CityParking.git
cd CityParking/backend
```

### 2.2 Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit with production values
vim .env
```

**Critical variables to set:**
- `DB_USERNAME` / `DB_PASSWORD` — Strong credentials (not defaults)
- `JWT_SECRET` — Minimum 64-character random string
- `CORS_ALLOWED_ORIGINS` — Your actual domain(s)
- `SPRING_PROFILES_ACTIVE=prod`

Generate a secure JWT secret:
```bash
openssl rand -base64 64 | tr -d '\n'
```

### 2.3 Startup Validation

The backend includes automatic startup validation. If any required variable is missing or using default insecure values, the application will **refuse to start** with a clear error message.

---

## 3. Build & Deploy

### 3.1 Build Images

```bash
# Build backend
docker build -t cityparking-backend:latest -f Dockerfile ..

# Build AI service
docker build -t cityparking-ai:latest -f ai-service/Dockerfile ai-service/
```

### 3.2 Start Stack

```bash
docker compose up -d
```

This starts:
1. `postgres` — PostgreSQL 16 database
2. `ai-service` — Python AI microservice (face + plate recognition)
3. `cityparking-backend` — Spring Boot API server

### 3.3 Verify Deployment

```bash
# Check all containers are running
docker compose ps

# Check backend health
curl -s http://localhost:8080/actuator/health | jq .

# Check AI service health
curl -s http://localhost:8000/health | jq .

# Check startup validation logs
docker compose logs cityparking-backend | grep -E "(VALIDATION|STARTUP)"
```

Expected healthy response:
```json
{
  "status": "UP",
  "components": {
    "db": { "status": "UP" },
    "aiService": { "status": "UP" },
    "diskSpace": { "status": "UP" }
  }
}
```

---

## 4. Health Check Endpoints

| Service    | Endpoint                          | Purpose                    |
|------------|-----------------------------------|----------------------------|
| Backend    | `GET /actuator/health`            | Full health (DB, AI, disk) |
| Backend    | `GET /actuator/health/liveness`   | Kubernetes liveness probe  |
| Backend    | `GET /actuator/health/readiness`  | Kubernetes readiness probe |
| Backend    | `GET /actuator/info`              | Build info                 |
| Backend    | `GET /actuator/metrics`           | JVM + custom metrics       |
| AI Service | `GET /health`                     | Model status + uptime      |

---

## 5. Structured Logging

### 5.1 Backend Logging

Configured via `logback-spring.xml`:
- **Development:** Human-readable colored output
- **Production (Docker):** Structured JSON to stdout
- **File rotation:** 100MB per file, 30 days retention, 5GB total cap

Log format (JSON):
```json
{
  "timestamp": "2026-06-09T10:30:00.123-04:00",
  "level": "INFO",
  "logger": "com.cityparking.backend.service.AuthService",
  "message": "User login successful",
  "traceId": "abc123",
  "spanId": "def456"
}
```

### 5.2 AI Service Logging

Configured via `LOG_FORMAT` environment variable:
- `LOG_FORMAT=text` — Human-readable (default)
- `LOG_FORMAT=json` — Structured JSON for production

### 5.3 View Logs

```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f cityparking-backend

# Filter errors
docker compose logs cityparking-backend 2>&1 | grep '"level":"ERROR"'

# AI service
docker compose logs -f ai-service
```

---

## 6. Graceful AI Service Failure Handling

The AI service is treated as a **non-critical dependency**. When it is unavailable:

- **Face enrollment/verification** endpoints return `503 Service Unavailable` with message: *"AI service temporarily unavailable. Please try again later."*
- **Plate detection** endpoints return `503 Service Unavailable`
- **All other endpoints** (auth, vehicles, profile) continue working normally
- The `/actuator/health` endpoint reports `status: "DEGRADED"` with `aiService.status: "DOWN"`
- The backend automatically retries AI calls (configurable via `ai-service.retry.max-attempts`)

### 6.1 AI Service Restart

```bash
# Restart without affecting backend
docker compose restart ai-service

# Check model loading
docker compose logs -f ai-service | grep -E "(✓|⚠|Startup)"
```

---

## 7. Docker Health Checks & Restart Policies

All services have:

| Setting               | Value                      |
|-----------------------|----------------------------|
| `restart`             | `unless-stopped`           |
| Health check interval | 30s (DB), 60s (backend/AI)|
| Timeout               | 10s                        |
| Retries               | 3–5                        |
| Start period          | 30–120s                    |

### 7.1 Volume Persistence

| Volume                    | Purpose                     |
|---------------------------|-----------------------------|
| `postgres-data`           | Database files              |
| `cityparking-uploads`     | User file uploads           |
| `cityparking-ai-models`   | AI model cache              |

---

## 8. Monitoring

### 8.1 Key Metrics to Monitor

- Backend response time (p50, p95, p99)
- Database connection pool usage
- AI service response time and availability
- Disk usage (especially uploads volume)
- Container restart count

### 8.2 Monitoring Commands

```bash
# Container resource usage
docker stats --no-stream

# Disk usage
docker system df

# Volume sizes
docker volume ls -q | xargs -I {} docker volume inspect {} --format '{{.Name}}: {{.Mountpoint}}'
```

---

## 9. Scaling Considerations

- **Backend** — Can scale horizontally behind a load balancer (stateless JWT auth)
- **AI Service** — CPU/GPU intensive; scale with replicas if needed
- **PostgreSQL** — Vertical scaling; consider read replicas for read-heavy workloads

---

## 10. TLS / Reverse Proxy (Production)

Deploy behind nginx or Traefik with TLS termination:

```nginx
server {
    listen 443 ssl http2;
    server_name parking.example.com;

    ssl_certificate /etc/ssl/certs/parking.pem;
    ssl_certificate_key /etc/ssl/private/parking.key;

    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ai/ {
        proxy_pass http://localhost:8000/;
        proxy_read_timeout 120s;  # AI processing can be slow
    }
}
```

---

## 11. Troubleshooting

| Symptom | Check | Fix |
|---------|-------|-----|
| Backend won't start | `docker compose logs cityparking-backend \| grep VALIDATION` | Fix `.env` values |
| DB connection refused | `docker compose logs postgres` | Check DB credentials, wait for start |
| AI service degraded | `curl localhost:8000/health` | Check model downloads, restart service |
| High memory usage | `docker stats` | Reduce connection pool, add swap |
| Slow responses | `/actuator/metrics` | Check DB queries, AI service latency |