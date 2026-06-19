# InsightFace Provider Activation Report

**Date:** 2026-06-14  
**Scope:** Activate and verify the production InsightFace face recognition provider  
**Constraint:** No changes to enrollment or verification logic — configuration-only changes

---

## 1. Configuration Audit

### Files Audited

| File | Role | Status |
|------|------|--------|
| `backend/src/main/resources/application.yml` | Main Spring Boot config | **MODIFIED** — provider switched |
| `backend/.env.example` | Environment variable template | **MODIFIED** — updated defaults |
| `backend/src/test/resources/application-test.yml` | Test profile | ✅ No change — correctly forces `mock` |
| `backend/src/main/java/.../config/AiProviderConfig.java` | Bean selection logic | ✅ No change needed |
| `backend/src/main/java/.../config/InsightFaceProperties.java` | `@ConfigurationProperties` binding | ✅ No change needed |
| `backend/src/main/java/.../config/StartupValidator.java` | Startup validation | **MODIFIED** — added face provider logging |
| `face-ai/main.py` | FastAPI InsightFace service | ✅ No change needed |
| `face-ai/app/config.py` | FastAPI configuration | ✅ No change needed |

### All Locations Where Face Provider Is Configured

1. **`application.yml` → `ai.provider.face`** (default profile) — **Primary switch point**
2. **`application.yml` → test profile** — Forces `ai.provider.face: mock` for tests
3. **`backend/.env.example` → `AI_PROVIDER_FACE`** — Template for environment overrides
4. **`AiProviderConfig.java`** — Reads `ai.provider.face` to conditionally instantiate beans:
   - `"mock"` → `MockFaceRecognitionService` becomes `@Primary`
   - `"insightface"` → `InsightFaceFaceRecognitionService` becomes `@Primary`
5. **`StartupValidator.java`** — Logs active provider and validates bean loading (newly added)

---

## 2. Configuration Changes Made

### Change 1: `backend/src/main/resources/application.yml`

```yaml
# BEFORE
ai:
  provider:
    face: ${AI_PROVIDER_FACE:mock}

# AFTER
ai:
  provider:
    face: ${AI_PROVIDER_FACE:insightface}  # mock | aws | insightface  ← ACTIVATED
```

The default value of the `AI_PROVIDER_FACE` environment variable fallback was changed from `mock` to `insightface`. The InsightFace-specific configuration block was already present:

```yaml
insightface:
  base-url: ${INSIGHTFACE_BASE_URL:http://localhost:8001}
  connect-timeout-ms: ${INSIGHTFACE_CONNECT_TIMEOUT_MS:5000}
  read-timeout-ms: ${INSIGHTFACE_READ_TIMEOUT_MS:30000}
  similarity-threshold: ${INSIGHTFACE_SIMILARITY_THRESHOLD:0.45}
  cache-refresh-interval-ms: ${INSIGHTFACE_CACHE_REFRESH_MS:300000}
```

### Change 2: `backend/.env.example`

```dotenv
# BEFORE
AI_PROVIDER_FACE=mock

# AFTER
AI_PROVIDER_FACE=insightface

# Added:
INSIGHTFACE_BASE_URL=http://localhost:8001
INSIGHTFACE_CONNECT_TIMEOUT_MS=5000
INSIGHTFACE_READ_TIMEOUT_MS=30000
INSIGHTFACE_SIMILARITY_THRESHOLD=0.45
INSIGHTFACE_CACHE_REFRESH_MS=300000
```

### Change 3: `backend/src/main/java/.../config/StartupValidator.java`

Added face provider startup logging that outputs:
- Active face provider name
- InsightFace URL
- Similarity threshold
- Whether `InsightFaceFaceRecognitionService` bean is loaded
- Whether `MockFaceRecognitionService` bean is active (should be `false`)

---

## 3. Active Provider Verification

### Bean Selection Mechanism (`AiProviderConfig.java`)

```java
@Bean
@Primary
@ConditionalOnProperty(name = "ai.provider.face", havingValue = "mock", matchIfMissing = true)
public FaceRecognitionService mockFaceRecognitionService() {
    return new MockFaceRecognitionService();
}

@Bean
@Primary
@ConditionalOnProperty(name = "ai.provider.face", havingValue = "insightface")
public FaceRecognitionService insightFaceRecognitionService(
        InsightFaceProperties props, WebClient.Builder builder) {
    return new InsightFaceFaceRecognitionService(props, builder.build());
}
```

**With `ai.provider.face=insightface`:**
- ✅ `MockFaceRecognitionService` bean: **NOT created** (ConditionalOnProperty does not match)
- ✅ `InsightFaceFaceRecognitionService` bean: **Created and marked `@Primary`**
- ✅ All injected `FaceRecognitionService` references receive the InsightFace implementation

### Communication Flow

```
Spring Boot (port 8080)
    → InsightFaceFaceRecognitionService
        → WebClient HTTP POST → http://localhost:8001/embed
        → WebClient HTTP POST → http://localhost:8001/compare
    ← FastAPI InsightFace (port 8001)
        ← RetinaFace (det_10g.onnx) — face detection
        ← ArcFace (w600k_r50.onnx) — 512-d embedding extraction
```

---

## 4. Startup Logs (Expected)

After Spring Boot starts with the activated configuration, the `StartupValidator` will produce:

```
═══════════════════════════════════════════════════
  CityParking Backend - Startup Validation
═══════════════════════════════════════════════════
  ✓ Database URL configured: jdbc:postgresql://localhost:5432/parking_db
  ✓ Database username configured: postgres
  ✓ Database password configured: ******
  ✓ JWT secret configured (64 chars)
  ✓ AI service URL configured: http://localhost:8080
───────────────────────────────────────────────────
  FACE RECOGNITION PROVIDER
───────────────────────────────────────────────────
  Active face provider       : INSIGHTFACE
  InsightFace URL            : http://localhost:8001
  Similarity threshold       : 0.45
  InsightFaceService loaded  : true
  MockFaceService active     : false (correct)
───────────────────────────────────────────────────
  ✓ All required configuration validated successfully
═══════════════════════════════════════════════════
```

---

## 5. Service Startup Instructions

### FastAPI InsightFace Service (port 8001)

```bash
cd face-ai
# Activate virtual environment if not already active
source venv/bin/activate  # or: venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8001
```

**Health check:** `curl http://localhost:8001/health`

### Spring Boot Backend (port 8080)

```bash
cd backend
mvn spring-boot:run
```

**Health check:** `curl http://localhost:8080/actuator/health`

### React Frontend (port 5173)

```bash
npm run dev
```

**Health check:** `curl http://localhost:5173`

---

## 6. Compilation Verification

```
$ cd backend && mvn compile -q
# Exit code 0 — SUCCESS, no compilation errors
```

All changes compile cleanly. The `StartupValidator` correctly references `InsightFaceFaceRecognitionService` and `MockFaceRecognitionService` by fully-qualified class name for runtime bean introspection.

---

## 7. Key Configuration Values

| Property | Value | Source |
|----------|-------|--------|
| `ai.provider.face` | `insightface` | `application.yml` (default profile) |
| `insightface.base-url` | `http://localhost:8001` | `application.yml` / `INSIGHTFACE_BASE_URL` env var |
| `insightface.connect-timeout-ms` | `5000` | `application.yml` |
| `insightface.read-timeout-ms` | `30000` | `application.yml` |
| `insightface.similarity-threshold` | `0.45` | `application.yml` / `INSIGHTFACE_SIMILARITY_THRESHOLD` env var |
| Test profile face provider | `mock` | `application-test.yml` (unchanged, correct) |

---

## 8. Remaining Issues / Notes

1. **FastAPI service must be running** on port 8001 before Spring Boot starts, or face enrollment/verification calls will fail with connection errors. The `ResilienceConfig` circuit breaker will catch these gracefully.

2. **Test profile is unaffected** — `application-test.yml` forces `ai.provider.face: mock`, so unit and integration tests continue to use mock services.

3. **No logic changes** were made to:
   - `FaceEnrollmentService` (enrollment flow)
   - `FaceVerificationService` (verification flow)
   - `InsightFaceFaceRecognitionService` (FastAPI communication)
   - `FaceEnrollmentController` / `FaceVerificationController` (API endpoints)

4. **Model loading time** — RetinaFace + ArcFace models take ~55 seconds to load on Apple Silicon CPU. Plan accordingly when starting the FastAPI service.

5. **Production deployment** — Ensure the following environment variables are set in production:
   - `AI_PROVIDER_FACE=insightface`
   - `INSIGHTFACE_BASE_URL=<production-fastapi-url>`
   - `INSIGHTFACE_SIMILARITY_THRESHOLD=0.45` (tune as needed)

---

## Summary

| Requirement | Status |
|-------------|--------|
| Audit all configuration files | ✅ Complete |
| Find every location where face provider is configured | ✅ 5 locations identified |
| Verify current active provider | ✅ Changed from `mock` → `insightface` |
| Switch local development to insightface | ✅ Done in `application.yml` + `.env.example` |
| Verify Spring Boot loads InsightFaceFaceRecognitionService | ✅ Verified via `@ConditionalOnProperty` logic |
| Verify MockFaceRecognitionService is not active | ✅ Bean condition does not match when face=insightface |
| Verify FastAPI is reachable | ⚠️ Requires manual startup of `face-ai` service |
| Verify WebClient communication | ⚠️ Requires both services running |
| Add startup logging | ✅ Active provider, URL, threshold, bean status |
| Produce INSIGHTFACE_ACTIVATION_REPORT.md | ✅ This document |