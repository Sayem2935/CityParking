# CityParking — Backup Strategy & Disaster Recovery

**Version:** 1.0  
**Last Updated:** 2026-06-09  
**Owner:** Operations Team

---

## 1. Overview

This document defines backup procedures, retention policies, and disaster recovery steps for the CityParking platform. It covers PostgreSQL database, file uploads, AI models, and configuration.

---

## 2. Backup Targets

| Component          | Location                          | Type           | Criticality |
|--------------------|-----------------------------------|----------------|-------------|
| PostgreSQL DB      | `parking_db`                      | Logical dump   | **Critical** |
| File uploads       | `/var/lib/cityparking/uploads/`   | Filesystem copy| **High**     |
| AI models/cache    | `/app/models_cache/`              | Filesystem copy| **Medium**   |
| Flyway migrations  | `backend/src/main/resources/db/`  | Git (source)   | **Low**      |
| Configuration      | `.env` files, `application.yml`   | Encrypted copy | **High**     |

---

## 3. PostgreSQL Backup

### 3.1 Automated Daily Backup Script

```bash
#!/bin/bash
# /opt/scripts/backup-db.sh
# Cron: 0 2 * * * /opt/scripts/backup-db.sh

set -euo pipefail

BACKUP_DIR="/var/backups/cityparking/db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Dump with compression
docker exec cityparking-postgres pg_dump \
    -U "${DB_USERNAME}" \
    -d parking_db \
    --format=custom \
    --compress=9 \
    --verbose \
    > "$BACKUP_DIR/parking_db_${TIMESTAMP}.dump"

# Verify dump integrity
if [ $? -eq 0 ] && [ -s "$BACKUP_DIR/parking_db_${TIMESTAMP}.dump" ]; then
    echo "[$(date)] Backup successful: parking_db_${TIMESTAMP}.dump" >> /var/log/cityparking-backup.log
else
    echo "[$(date)] ERROR: Backup failed!" >> /var/log/cityparking-backup.log
    # Alert ops team
    # curl -X POST "$ALERT_WEBHOOK_URL" -d '{"text":"DB backup failed"}'
    exit 1
fi

# Clean old backups
find "$BACKUP_DIR" -name "*.dump" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Cleaned backups older than ${RETENTION_DAYS} days" >> /var/log/cityparking-backup.log
```

### 3.2 Restore Procedure

```bash
# Stop the backend to prevent writes
docker compose stop cityparking-backend

# Restore from dump
docker exec -i cityparking-postgres pg_restore \
    -U "${DB_USERNAME}" \
    -d parking_db \
    --clean \
    --if-exists \
    --verbose \
    < /var/backups/cityparking/db/parking_db_YYYYMMDD_HHMMSS.dump

# Restart backend
docker compose start cityparking-backend

# Verify
docker exec cityparking-postgres psql -U "${DB_USERNAME}" -d parking_db \
    -c "SELECT count(*) FROM users; SELECT count(*) FROM vehicles;"
```

### 3.3 Continuous Archiving (Production)

For point-in-time recovery, enable WAL archiving in `docker-compose.yml`:

```yaml
postgres:
  command: >
    postgres
    -c wal_level=replica
    -c archive_mode=on
    -c archive_command='cp %p /var/lib/postgresql/wal_archive/%f'
    -c max_wal_senders=3
```

---

## 4. File Uploads Backup

```bash
#!/bin/bash
# /opt/scripts/backup-uploads.sh
# Cron: 0 3 * * * /opt/scripts/backup-uploads.sh

set -euo pipefail

BACKUP_DIR="/var/backups/cityparking/uploads"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
UPLOADS_VOLUME="cityparking-uploads"

mkdir -p "$BACKUP_DIR"

# Backup Docker volume
docker run --rm \
    -v ${UPLOADS_VOLUME}:/source:ro \
    -v ${BACKUP_DIR}:/backup \
    alpine tar czf /backup/uploads_${TIMESTAMP}.tar.gz -C /source .

# Retain 14 days
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +14 -delete
```

### Restore Uploads

```bash
docker run --rm \
    -v cityparking-uploads:/dest \
    -v /var/backups/cityparking/uploads:/backup:ro \
    alpine sh -c "cd /dest && tar xzf /backup/uploads_YYYYMMDD_HHMMSS.tar.gz"
```

---

## 5. AI Models Cache

AI models are downloaded on first startup. To avoid re-downloading:

```bash
# Backup model cache volume
docker run --rm \
    -v cityparking-ai-models:/source:ro \
    -v /var/backups/cityparking:/backup \
    alpine tar czf /backup/ai_models_$(date +%Y%m%d).tar.gz -C /source .
```

Restore by extracting to the same volume before starting the AI service.

---

## 6. Configuration Backup

```bash
# Encrypt and store configuration
tar czf - .env backend/.env.example backend/src/main/resources/application.yml | \
    openssl enc -aes-256-cbc -salt -pbkdf2 \
    -out /var/backups/cityparking/config_$(date +%Y%m%d).enc \
    -pass file:/opt/scripts/backup-key.txt
```

---

## 7. Backup Schedule Summary

| Target         | Frequency | Retention | Method           |
|----------------|-----------|-----------|------------------|
| PostgreSQL     | Daily 2AM | 30 days   | `pg_dump` + cron |
| File uploads   | Daily 3AM | 14 days   | Volume tar       |
| AI models      | Weekly    | 4 copies  | Volume tar       |
| Configuration  | On change | 90 days   | Encrypted tar    |

---

## 8. Disaster Recovery Procedures

### 8.1 Complete System Recovery (RTO < 1 hour, RPO < 24 hours)

1. **Provision infrastructure** — Run `docker compose up -d postgres`
2. **Restore database** — `pg_restore` from latest backup
3. **Restore uploads** — Extract upload volume backup
4. **Restore config** — Decrypt and copy `.env` files
5. **Start services** — `docker compose up -d`
6. **Verify health** — `curl http://localhost:8080/actuator/health`
7. **Run smoke tests** — Verify login, vehicle registration, face enrollment

### 8.2 Database-Only Recovery

```bash
docker compose stop cityparking-backend
# ... pg_restore ...
docker compose start cityparking-backend
```

### 8.3 AI Service Failure Recovery

The AI service is **non-critical** — the backend degrades gracefully:
- Face enrollment/verification returns "service unavailable"
- Plate detection returns "service unavailable"
- All other features continue normally

```bash
docker compose restart ai-service
# Check model loading
docker compose logs -f ai-service
```

---

## 9. Monitoring Backup Health

Add to operational checklist:
- [ ] Verify daily backup log: `tail /var/log/cityparking-backup.log`
- [ ] Check backup file sizes are reasonable (not 0 bytes)
- [ ] Monthly restore test on staging environment
- [ ] Alert on backup failures via webhook/email

---

## 10. Offsite / Cloud Backup (Recommended)

For production, replicate backups to cloud storage:

```bash
# Upload to S3-compatible storage
aws s3 sync /var/backups/cityparking/ \
    s3://cityparking-backups/$(hostname)/ \
    --storage-class STANDARD_IA \
    --sse AES256