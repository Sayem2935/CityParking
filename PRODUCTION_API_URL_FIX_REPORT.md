# Production API URL Fix Report

**Date:** 2026-06-13
**Frontend URL:** https://cityparking-1.onrender.com
**Backend URL:** https://cityparking-2.onrender.com

---

## Problem Summary

The frontend production build was making API requests to `http://localhost:8080` instead of the deployed backend at `https://cityparking-2.onrender.com`, causing all registration/login/API calls to fail with `ERR_CONNECTION_REFUSED` in production.

## Root Cause

The `API_BASE_URL` constant in `src/services/api.ts` was hardcoded to `"http://localhost:8080/api"` with no environment variable fallback. The face enrollment service also directly imported this constant.

---

## Files Modified

### 1. `src/services/api.ts`
- **Before:** `export const API_BASE_URL = "http://localhost:8080/api";`
- **After:** `export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";`
- **Change:** Added `import.meta.env.VITE_API_BASE_URL` with localhost fallback for local dev

### 2. `src/services/face-enrollment.service.ts`
- **Before:** `const API_BASE_URL = "http://localhost:8080/api";` (duplicate constant)
- **After:** `import { API_BASE_URL } from './api';` (import from centralized config)
- **Change:** Removed duplicate constant, now imports from shared `api.ts`

## Files Created

### 3. `.env.development`
```
VITE_API_BASE_URL=http://localhost:8080/api
```

### 4. `.env.production`
```
VITE_API_BASE_URL=https://cityparking-2.onrender.com/api
```

### 5. `.env.example`
```
# Backend API Base URL
# Development: http://localhost:8080/api
# Production: https://cityparking-2.onrender.com/api
VITE_API_BASE_URL=http://localhost:8080/api
```

---

## Services Verified (All Use Centralized Config)

| Service | File | Uses `api` instance from `api.ts` |
|---------|------|----------------------------------|
| Auth Service | `src/services/auth.service.ts` | ✅ Yes (imported `api`) |
| Vehicle Service | `src/services/vehicle.service.ts` | ✅ Yes (imported `api`) |
| User Service | `src/services/user.service.ts` | ✅ Yes (imported `api`) |
| Document Service | `src/services/document.service.ts` | ✅ Yes (imported `api`) |
| Parking Service | `src/services/parking.service.ts` | ✅ Yes (imported `api`) |
| Face Enrollment | `src/services/face-enrollment.service.ts` | ✅ Yes (now imports `API_BASE_URL`) |

**All 6 services** use the same centralized Axios instance or the shared `API_BASE_URL` constant.

---

## Verification Results

### Source Code Scan
- `grep "localhost:8080" src/` → Only found in `api.ts` fallback value ✅
- No standalone hardcoded localhost URLs in any service file ✅

### Production Build
```
npm run build → ✅ SUCCESS (tsc -b && vite build)
✓ 2288 modules transformed
✓ built in 1.81s
```

### Build Output Verification
- `grep "cityparking-2.onrender.com" dist/` → Found in bundled JS ✅
- `grep "localhost:8080" dist/` → **0 occurrences** ✅

### API Endpoint Coverage
| Endpoint | URL Pattern | Status |
|----------|-------------|--------|
| Register | `POST /api/auth/register` | ✅ Uses centralized config |
| Login | `POST /api/auth/login` | ✅ Uses centralized config |
| Get Current User | `GET /api/auth/me` | ✅ Uses centralized config |
| Get Profile | `GET /api/user/profile` | ✅ Uses centralized config |
| Update Profile | `PUT /api/user/profile` | ✅ Uses centralized config |
| Get Vehicles | `GET /api/vehicles` | ✅ Uses centralized config |
| Add Vehicle | `POST /api/vehicles` | ✅ Uses centralized config |
| Update Vehicle | `PUT /api/vehicles/:id` | ✅ Uses centralized config |
| Delete Vehicle | `DELETE /api/vehicles/:id` | ✅ Uses centralized config |
| Face Enrollment Upload | `POST /api/face-enrollment/upload` | ✅ Uses centralized config |
| Parking Slots | `GET /api/parking/slots` | ✅ Uses centralized config |
| Parking Availability | `GET /api/parking/availability` | ✅ Uses centralized config |
| Parking Statistics | `GET /api/parking/statistics` | ✅ Uses centralized config |

---

## Environment Variable Configuration

The `VITE_API_BASE_URL` environment variable is read at **build time** by Vite:

- **Local Development:** `.env.development` → `http://localhost:8080/api`
- **Production (Render):** `.env.production` → `https://cityparking-2.onrender.com/api`
- **Fallback:** If neither env file is present, defaults to `http://localhost:8080/api`

### Render Deployment Note
Ensure the Render frontend service either:
1. Includes `.env.production` in the repo (it's now committed), OR
2. Sets `VITE_API_BASE_URL=https://cityparking-2.onrender.com/api` as an environment variable in Render dashboard

---

## Summary

| Metric | Value |
|--------|-------|
| Files Modified | 2 (`api.ts`, `face-enrollment.service.ts`) |
| Files Created | 3 (`.env.development`, `.env.production`, `.env.example`) |
| Hardcoded URLs Removed | 1 (face-enrollment.service.ts duplicate) |
| URLs Converted to Env Vars | 1 (api.ts `API_BASE_URL`) |
| Services Using Centralized Config | 6/6 (100%) |
| Production Build | ✅ Passes |
| localhost:8080 in dist/ | 0 occurrences |
| Production URL in dist/ | ✅ `https://cityparking-2.onrender.com/api` |