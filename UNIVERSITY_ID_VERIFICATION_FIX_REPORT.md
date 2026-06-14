# University ID Verification Bug — Fix Report

**Date:** 2026-06-14  
**Status:** ✅ FIXED — Build passes (0 errors)

---

## Bug Confirmation

**Bug Exists:** YES

**Symptom:** After uploading a University ID and successful document extraction, the Dashboard onboarding task card still shows "Verify University ID — Pending" instead of "✓ Completed".

---

## Root Cause Analysis

### Initial Hypothesis (from audit): Frontend state never refreshed after save

After deep code tracing, the actual root cause was **more nuanced** than a simple missing `fetchUser()` call. The problem was a **data mapping gap** in the frontend services:

### Actual Root Cause: Frontend services strip university ID fields from API responses

The backend `UserResponse` DTO correctly includes all university ID fields:
- `universityIdNumber`
- `universityName`
- `documentExtractionStatus`
- `universityIdVerified`
- `documentType`

However, **both frontend services** that receive user data (`auth.service.ts` and `user.service.ts`) used intermediate `BackendUserResponse` interfaces and `mapUserResponse()`/`mapBackendUser()` mapping functions that **did not include the university ID fields**. This meant:

1. **Login response** → `mapUserResponse()` strips university ID fields → auth store gets user WITHOUT `documentExtractionStatus`
2. **Register response** → `mapUserResponse()` strips university ID fields → auth store gets user WITHOUT `documentExtractionStatus`
3. **Profile refresh** (`fetchUser()`) → `mapUserResponse()` strips university ID fields → even after refresh, `documentExtractionStatus` is `undefined`
4. **User service profile** → `mapBackendUser()` strips university ID fields → same issue

The Dashboard checks `user?.documentExtractionStatus === 'COMPLETED'`. Since `documentExtractionStatus` was always `undefined` (stripped by the mapper), this condition was always `false`.

**Classification:** Root cause **D** — Dashboard checking a field that was never populated in frontend state, combined with a **data mapping mismatch** between backend response and frontend User type.

---

## Files Modified

### 1. `src/services/auth.service.ts`

**Lines 10-31:** Added 5 missing fields to `BackendUserResponse` interface:

```diff
  phoneNumber?: string;
  profileImageUrl?: string;
+ universityIdNumber?: string;
+ universityName?: string;
+ documentExtractionStatus?: string;
+ universityIdVerified?: boolean;
+ documentType?: string;
}
```

**Lines 39-56:** Added 5 field mappings to `mapUserResponse()`:

```diff
  phoneNumber: backendUser.phoneNumber || '',
  profileImageUrl: backendUser.profileImageUrl || '',
+ universityIdNumber: backendUser.universityIdNumber,
+ universityName: backendUser.universityName,
+ documentExtractionStatus: backendUser.documentExtractionStatus || 'NOT_STARTED',
+ universityIdVerified: backendUser.universityIdVerified || false,
+ documentType: backendUser.documentType,
};
```

**Impact:** Login, register, and profile refresh now correctly propagate university ID fields to the auth store.

### 2. `src/services/user.service.ts`

**Lines 10-31:** Added 5 missing fields to `BackendUserResponse` interface (same as auth service).

**Lines 41-58:** Added 5 field mappings to `mapBackendUser()` (same as auth service).

**Impact:** The `useProfile` hook now correctly returns university ID fields.

### 3. `src/pages/ParkingDashboardPage.tsx` (pre-existing build fix)

**Lines 78-79:** Removed unused `recordEntry` and `recordExit` destructured variables that caused TypeScript compilation errors (TS6133). These were pre-existing issues unrelated to the university ID bug.

---

## Data Flow — Before vs After Fix

### BEFORE (Broken)

```
Backend DB: documentExtractionStatus = "COMPLETED" ✅
     ↓
Backend API response: { ..., documentExtractionStatus: "COMPLETED" } ✅
     ↓
Frontend BackendUserResponse: interface missing documentExtractionStatus ❌
     ↓
mapUserResponse(): field not mapped, stripped from result ❌
     ↓
Auth Store: user.documentExtractionStatus = undefined ❌
     ↓
Dashboard: user?.documentExtractionStatus === 'COMPLETED' → false ❌
     ↓
Display: "Verify University ID" (Pending) ❌
```

### AFTER (Fixed)

```
Backend DB: documentExtractionStatus = "COMPLETED" ✅
     ↓
Backend API response: { ..., documentExtractionStatus: "COMPLETED" } ✅
     ↓
Frontend BackendUserResponse: documentExtractionStatus: string ✅
     ↓
mapUserResponse(): documentExtractionStatus mapped ✅
     ↓
Auth Store: user.documentExtractionStatus = "COMPLETED" ✅
     ↓
Dashboard: user?.documentExtractionStatus === 'COMPLETED' → true ✅
     ↓
Display: "✓ Completed" ✅
```

---

## Complete Status Conditions (Reference)

### Dashboard Onboarding Task Check
**File:** `src/pages/DashboardPage.tsx`, **Line 116**
```typescript
completed: user?.documentExtractionStatus === 'COMPLETED',
```

### Status Values

| Display | Condition | Where Set |
|---------|-----------|-----------|
| **Pending** | `documentExtractionStatus` is `undefined` or `"NOT_STARTED"` | Default at registration |
| **✓ Completed** | `documentExtractionStatus === "COMPLETED"` | Backend `MockGeminiDocumentService.saveExtractionResult()` |
| **Approved** | `universityIdVerified === true` | Not yet implemented (admin action) |

---

## Database Fields Reference

| Column | Type | Default | Set By |
|--------|------|---------|--------|
| `document_extraction_status` | `VARCHAR(50)` | `'NOT_STARTED'` | `saveExtractionResult()` → `"COMPLETED"` |
| `university_id_number` | `VARCHAR(100)` | `NULL` | `saveExtractionResult()` → extracted student ID |
| `university_name` | `VARCHAR(255)` | `NULL` | `saveExtractionResult()` → extracted university |
| `university_id_verified` | `BOOLEAN` | `FALSE` | Admin action (not yet implemented) |
| `document_type` | `VARCHAR(50)` | `NULL` | `saveExtractionResult()` → `"UNIVERSITY_ID"` |
| `document_uploaded_at` | `TIMESTAMP` | `NULL` | Not set (minor oversight) |

---

## Build Verification

```
> tsc -b && vite build
✓ 2288 modules transformed.
✓ built in 2.00s
0 errors, 0 warnings
```

---

## Why This Bug Existed Since Implementation

The university ID feature was added in Sprint 12 (migration `V12__add_university_id_fields.sql`). The backend entity, DTO, controller, and service were all correctly implemented. However, the frontend services (`auth.service.ts` and `user.service.ts`) were created earlier (Sprint 1) with their `BackendUserResponse` interfaces and mapping functions. When the university ID fields were added to the backend, the frontend interfaces and mappers were **never updated** to include the new fields. This is a classic **schema drift** issue between frontend and backend.

---

## Defense-in-Depth Recommendations (Not Implemented)

1. **UniversityIdPage.tsx:** Add explicit `fetchUser()` call after successful save (belt-and-suspenders)
2. **DocumentExtractionController.java:** Return updated `UserResponse` from save endpoint (eliminate dependency on separate profile fetch)
3. **DashboardPage.tsx:** Already has `fetchUser()` on mount via `useAuthStore` — no change needed
4. **Type safety:** Consider sharing TypeScript types from backend OpenAPI spec to prevent future field drift