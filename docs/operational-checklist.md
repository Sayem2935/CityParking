# DIPS — Operational Checklist

**Version:** 1.0  
**Last Updated:** 2026-06-09

---

## Pre-Deployment Checklist

### Environment & Configuration
- [ ] `.env` file created from `.env.example` with all production values
- [ ] `DB_USERNAME` is NOT the default `postgres` (or default is acceptable for dev only)
- [ ] `DB_PASSWORD` is a strong password (16+ characters)
- [ ] `JWT_SECRET` is a cryptographically random string (64+ characters)
- [ ] `SPRING_PROFILES_ACTIVE=prod` is set
- [ ] `CORS_ALLOWED_ORIGINS` points to actual frontend domain(s)
- [ ] `AI_SERVICE_URL` is correct for the deployment environment
- [ ] `FILE_STORAGE_LOCATION` points to a persistent volume path

### Docker
- [ ] All three services defined in `docker-compose.yml`
- [ ] Health checks configured for all services
- [ ] Restart policy `unless-stopped` on all services
- [ ] Named volumes for data persistence (postgres, uploads, AI models)
- [ ] Resource limits configured for production workloads
- [ ] No hardcoded secrets in `docker-compose.yml` (all via `.env`)

### Database
- [ ] PostgreSQL data directory mounted to named volume
- [ ] Flyway migrations run automatically on startup
- [ ] Backup cron job configured (see `docs/backup-strategy.md`)
- [ ] Connection pool size appropriate for workload

---

## Post-Deployment Verification

### Health Checks
- [ ] `curl http://localhost:8080/actuator/health` returns `{"status":"UP"}`
- [ ] `curl http://localhost:8000/health` returns `{"status":"healthy"}`
- [ ] Database health: `db.status: "UP"` in backend health response
- [ ] AI service health: `aiService.status: "UP"` in backend health response
- [ ] Disk space: `diskSpace.status: "UP"` in backend health response

### Startup Validation
- [ ] Backend logs show `STARTUP VALIDATION: ALL CHECKS PASSED`
- [ ] No `VALIDATION FAILURE` errors in startup logs
- [ ] AI service logs show model loading success messages

### Functional Smoke Tests
- [ ] User registration works
- [ ] User login returns JWT token
- [ ] Vehicle CRUD operations work
- [ ] Face enrollment endpoint responds (may require actual image)
- [ ] Plate detection endpoint responds (may require actual image)
- [ ] Protected endpoints reject unauthenticated requests

### Logging
- [ ] Backend producing structured JSON logs (in Docker/production profile)
- [ ] AI service logs include timestamps and log levels
- [ ] Log files rotating properly (if file logging enabled)

---

## Daily Operations

### Morning Health Check
- [ ] Run: `docker compose ps` — all containers healthy
- [ ] Run: `curl -s localhost:8080/actuator/health | jq .status` — returns "UP"
- [ ] Check: `docker compose logs --since 24h cityparking-backend 2>&1 | grep -c ERROR` — review count
- [ ] Check: `tail /var/log/cityparking-backup.log` — last backup successful

### Monitoring
- [ ] `docker stats --no-stream` — no containers at >90% memory
- [ ] `docker system df` — disk usage <80%
- [ ] No container restart loops: `docker compose ps` shows consistent uptime

---

## Weekly Operations

- [ ] Review error logs for patterns: `docker compose logs --since 7d | grep ERROR | sort | uniq -c | sort -rn`
- [ ] Check Docker image security updates
- [ ] Verify backup integrity: check backup file sizes are reasonable
- [ ] Review AI service model status in health endpoint
- [ ] Check disk growth trend

---

## Monthly Operations

- [ ] Test database restore from backup on staging environment
- [ ] Rotate JWT secret (coordinate with frontend re-authentication)
- [ ] Review and update `.env` credentials
- [ ] Update Docker base images for security patches
- [ ] Run Flyway migration verification against production schema
- [ ] Review `docs/backup-strategy.md` for any needed updates

---

## Incident Response

### Backend Down
1. `docker compose ps` — check container status
2. `docker compose logs cityparking-backend --tail 200` — check crash reason
3. If OOM: increase memory limits in compose
4. If DB connection: check postgres health
5. `docker compose restart cityparking-backend`

### AI Service Down
1. Non-critical — other features continue working
2. `docker compose logs ai-service --tail 200`
3. Common: model download failed → restart with internet access
4. `docker compose restart ai-service`
5. If persistent: check `/actuator/health` for degraded status

### Database Issues
1. `docker compose logs postgres --tail 200`
2. Check disk space: `df -h` on the volume mount
3. Connection pool exhaustion: restart backend
4. Data corruption: restore from backup (see `docs/backup-strategy.md`)

### Full System Recovery
1. Stop all: `docker compose down`
2. Restore database from backup
3. Restore upload volumes from backup
4. Start all: `docker compose up -d`
5. Verify all health checks pass
6. Run smoke tests