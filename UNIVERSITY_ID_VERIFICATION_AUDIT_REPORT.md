# University ID Verification Status Audit Report

**Date:** 2026-06-14  
**Auditor:** AI Code Auditor  
**Scope:** Full-stack trace of University ID verification flow (frontend → backend → database → frontend)  
**Verdict:** 🐛 **BUG CONFIRMED — YES**

---

## Executive Summary

The bug **exists and is reproducible**. After a user successfully uploads a University ID and the backend correctly saves the extraction data to the database, the Dashboard onboarding task card still displays **"Verify University ID" (Pending)** instead of **"✓ Completed"**.

**Root Cause:** Frontend state synchronization failure. The `UniversityIdPage` never refreshes the user profile in the auth store after document extraction is saved, so the Dashboard renders stale data from login time.

**Classification:** Option **C** — *API correct but frontend state stale*

---

## 1. Complete University ID Flow Trace

### Step 1: User Uploads University ID Image
**File:** `src/pages/UniversityIdPage.tsx` (Line 57-80)

```typescript
const handleUpload = async () => {
  // ...
  const result = await documentService.extractDocument(file);  // Step 2
  setExtractionResult(result);
  // ...
};
```

### Step 2: Frontend Calls Extraction API
**File:** `src/services/document.service.ts` (Line 9-22)

```typescript
async extractDocument(file: File): Promise<DocumentExtractionResult> {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/document-extraction/extract', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
```

**Request:** `POST /api/document-extraction/extract` (multipart/form-data with image file)

### Step 3: Backend Extracts Document Data
**File:** `backend/.../controller/DocumentExtractionController.java` (Line 38-56)

```java
@PostMapping("/extract")
public ResponseEntity<ApiResponse<DocumentExtractionResult>> extractDocument(
        @RequestParam("file") MultipartFile file) {
    DocumentExtractionResult result = documentExtractionService.extractFromImage(file);
    return ResponseEntity.ok(ApiResponse.success("Document extracted successfully", result));
}
```

Calls `MockGeminiDocumentService.extractFromImage()` which returns mock extraction data.

### Step 4: Frontend Saves Extraction Results
**File:** `src/pages/UniversityIdPage.tsx` (Line 82-95)

```typescript
const handleSave = async () => {
  // ...
  await documentService.saveDocumentExtraction(extractionResult);  // Step 5
  setIsSuccess(true);
  setTimeout(() => navigate('/dashboard'), 2000);  // ⚠️ NAVIGATES WITHOUT REFRESHING STATE
};
```

**File:** `src/services/document.service.ts` (Line 24-26)

```typescript
async saveDocumentExtraction(result: DocumentExtractionResult): Promise<ApiResponse<void>> {
  return api.post('/document-extraction/save', result);
}
```

**Request:** `POST /api/document-extraction/save` (JSON body with extraction result)

### Step 5: Backend Saves to Database
**File:** `backend/.../controller/DocumentExtractionController.java` (Line 66-87)

```java
@PostMapping("/save")
public ResponseEntity<ApiResponse<Void>> saveExtraction(@Valid @RequestBody DocumentExtractionResult result) {
    String email = SecurityContextHolder.getContext().getAuthentication().getName();
    User currentUser = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    documentExtractionService.saveExtractionResult(currentUser.getId(), result);
    return ResponseEntity.ok(ApiResponse.success("Document extraction results saved successfully"));
}
```

**File:** `backend/.../service/ai/MockGeminiDocumentService.java` (Line 58-91)

```java
public void saveExtractionResult(Long userId, DocumentExtractionResult result) {
    User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    user.setUniversityIdNumber(result.getStudentId());
    user.setUniversityName(result.getUniversityName());
    user.setDocumentType(result.getDocumentType());
    user.setDocumentExtractionStatus("COMPLETED");  // ✅ SET TO "COMPLETED"
    // NOTE: universityIdVerified is NOT set here (stays null/false)

    userRepository.save(user);  // ✅ DATABASE IS CORRECTLY UPDATED
}
```

### Step 6: Backend Returns Success Response
**Response:**
```json
{
  "success": true,
  "message": "Document extraction results saved successfully"
  // ⚠️ NO user data in response body
}
```

### Step 7: Frontend Navigates to Dashboard (WITHOUT Refreshing State)
**File:** `src/pages/UniversityIdPage.tsx` (Lines 132-134)

```typescript
setIsSuccess(true);
setTimeout(() => navigate('/dashboard'), 2000);
```

**🔴 BUG TRIGGER POINT:** No call to `useAuthStore.getState().fetchUser()` or any equivalent refresh.

### Step 8: Dashboard Reads Stale State
**File:** `src/pages/DashboardPage.tsx` (Line 63)

```typescript
const { user, isAuthenticated } = useAuthStore();
```

Dashboard reads `user` from the auth store, which still contains the **login-time snapshot** where `documentExtractionStatus` was `"NOT_STARTED"`.

---

## 2. Status Conditions — Actual Code

### Dashboard Onboarding Task Completion Check
**File:** `src/pages/DashboardPage.tsx` (Lines 108-136)

```typescript
const tasks = [
  {
    id: 'university-id',
    title: 'Verify University ID',
    description: 'Upload your university ID for verification',
    icon: <Scan className="w-5 h-5" />,
    path: '/university-id',
    completed: user?.documentExtractionStatus === 'COMPLETED',  // ← THE CHECK
  },
  // ... other tasks
];
```

### Status Rendering Logic
**File:** `src/pages/DashboardPage.tsx` (Lines 299-310)

```typescript
<p className={`text-sm font-semibold ${task.completed ? 'text-green-700' : 'text-gray-900'}`}>
  {task.completed ? '✓ Completed' : task.title}
</p>
```

### Status Values in the System

| Status | Condition | Where Set |
|--------|-----------|-----------|
| **Pending** | `documentExtractionStatus !== 'COMPLETED'` | Default on user creation |
| **Completed** | `documentExtractionStatus === 'COMPLETED'` | Set by `saveExtractionResult()` in MockGeminiDocumentService |
| **Approved** | `universityIdVerified === true` | **Never set by any code** (manual admin action, not implemented) |
| **Verified** | N/A | **Not implemented** |

---

## 3. Database Updates Analysis

### Table Updated
`users` table

### Migration
**File:** `backend/.../db/migration/V12__add_university_id_fields.sql`

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS university_id_number VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS university_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_extraction_status VARCHAR(50) DEFAULT 'NOT_STARTED';
ALTER TABLE users ADD COLUMN IF NOT EXISTS university_id_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_type VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_uploaded_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_front_image_path VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_back_image_path VARCHAR(500);
```

### Columns Updated After Successful Extraction

| Column | Value Written | Source |
|--------|--------------|--------|
| `university_id_number` | `result.getStudentId()` | Extracted from document |
| `university_name` | `result.getUniversityName()` | Extracted from document |
| `document_type` | `result.getDocumentType()` | Extracted from document |
| `document_extraction_status` | `"COMPLETED"` | Hardcoded in save logic |
| `university_id_verified` | **NOT UPDATED** (stays `FALSE`) | ⚠️ No code sets this |
| `document_uploaded_at` | **NOT UPDATED** (stays `NULL`) | ⚠️ No code sets this |
| `document_front_image_path` | **NOT UPDATED** | ⚠️ No code sets this |

### Verification: Database State Before vs After

| Field | Before Upload | After Upload |
|-------|--------------|-------------|
| `university_id_number` | `NULL` | `"STU-2024-12345"` |
| `university_name` | `NULL` | `"City University"` |
| `document_extraction_status` | `"NOT_STARTED"` | `"COMPLETED"` ✅ |
| `university_id_verified` | `FALSE` | `FALSE` (unchanged) |
| `document_type` | `NULL` | `"UNIVERSITY_ID"` |

**Conclusion:** Database is **correctly updated**. The `document_extraction_status` is set to `"COMPLETED"`.

---

## 4. Dashboard Logic Audit

### Where User Data Comes From
**File:** `src/pages/DashboardPage.tsx` (Line 63)

```typescript
const { user, isAuthenticated } = useAuthStore();
```

### When Auth Store User Is Refreshed
**File:** `src/store/authStore.ts`

The `user` object in the auth store is ONLY updated when:
1. `login()` succeeds — stores user from login response
2. `register()` succeeds — stores user from register response
3. `fetchUser()` is called — fetches from `GET /api/auth/profile`
4. `updateProfile()` succeeds — stores user from update response

### Dashboard useEffect
**File:** `src/pages/DashboardPage.tsx` (Lines 67-84)

```typescript
useEffect(() => {
  if (!isAuthenticated) {
    navigate('/login');
    return;
  }
  fetchParkingStats();
  fetchRecentAccess();
  fetchNotifications();
  // ⚠️ NO fetchUser() call here
}, [isAuthenticated, navigate]);
```

**🔴 FINDING:** Dashboard does NOT refresh user data on mount. It relies entirely on the auth store's cached value.

### API Endpoint for Profile
**File:** `src/services/auth.service.ts` (Lines 57-59)

```typescript
async getProfile(): Promise<ApiResponse<{ user: User }>> {
  return api.get('/auth/profile');
}
```

**File:** `backend/.../controller/AuthController.java` (Lines 113-121)

```java
@GetMapping("/profile")
public ResponseEntity<ApiResponse<UserResponse>> getProfile() {
    User currentUser = authService.getCurrentUser();
    UserResponse userResponse = authService.toUserResponse(currentUser);
    return ResponseEntity.ok(ApiResponse.success("Profile retrieved successfully", userResponse));
}
```

This endpoint WOULD return the updated `documentExtractionStatus: "COMPLETED"` if called. It just never gets called.

---

## 5. API Response Audit

### Extraction Save Request/Response

**Request:**
```
POST /api/document-extraction/save
Content-Type: application/json
Authorization: Bearer <token>

{
  "studentId": "STU-2024-12345",
  "universityName": "City University",
  "documentType": "UNIVERSITY_ID",
  "confidence": 0.95
}
```

**Response:**
```json
{
  "success": true,
  "message": "Document extraction results saved successfully"
}
```

**🔴 FINDING:** The save response does NOT include updated user data. Even if the frontend wanted to update the store from this response, the response only contains a success message — no user object.

### Profile Request/Response (What SHOULD Be Called)

**Request:**
```
GET /api/auth/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "student@university.edu",
      "documentExtractionStatus": "COMPLETED",
      "universityIdNumber": "STU-2024-12345",
      "universityName": "City University",
      "universityIdVerified": false,
      ...
    }
  }
}
```

This endpoint returns the correct data — it's just never called after extraction.

---

## 6. State Synchronization Audit

### Complete Synchronization Chain

| Step | Component | Status | Evidence |
|------|-----------|--------|----------|
| 1 | Database updated | ✅ CORRECT | `saveExtractionResult()` sets `documentExtractionStatus = "COMPLETED"` and calls `userRepository.save(user)` |
| 2 | Backend API returns updated data | ✅ CORRECT | `GET /api/auth/profile` reads from database, returns fresh data |
| 3 | Frontend refreshes user profile | ❌ **MISSING** | `UniversityIdPage` never calls `fetchUser()` after save |
| 4 | Dashboard reads fresh state | ❌ **STALE** | Dashboard reads from auth store which has login-time snapshot |

### Breakdown

```
Database:    documentExtractionStatus = "COMPLETED"  ✅
                ↓
Backend API: Can return "COMPLETED" via GET /auth/profile  ✅
                ↓
Auth Store:  documentExtractionStatus = "NOT_STARTED"  ❌ (STALE - never refreshed)
                ↓
Dashboard:   task.completed = false  ❌ (reads stale value)
                ↓
UI Display:  "Verify University ID" (Pending)  ❌ (should be "✓ Completed")
```

---

## 7. Root Cause Confirmation

### Bug Classification: **Option C — API correct but frontend state stale**

The bug exists because of **two compounding issues**:

### Primary Issue: Missing State Refresh After Save
**File:** `src/pages/UniversityIdPage.tsx` (Lines 124-134)

```typescript
const handleSave = async () => {
  try {
    setIsSaving(true);
    await documentService.saveDocumentExtraction(extractionResult);
    setIsSuccess(true);
    setTimeout(() => navigate('/dashboard'), 2000);
    // 🔴 MISSING: useAuthStore.getState().fetchUser()
  } catch (err: any) {
    // ...
  }
};
```

After `saveDocumentExtraction()` succeeds, the code should call `fetchUser()` to refresh the auth store with the latest user data (including `documentExtractionStatus: "COMPLETED"`). It does not.

### Secondary Issue: Save Endpoint Returns No User Data
**File:** `backend/.../controller/DocumentExtractionController.java` (Lines 66-87)

The save endpoint returns `ApiResponse<Void>` — a success message only. It could return the updated `UserResponse` so the frontend could update its store directly from the save response without needing a separate API call.

### Tertiary Issue: Dashboard Has No Auto-Refresh
**File:** `src/pages/DashboardPage.tsx` (Lines 67-84)

The Dashboard's `useEffect` does not call `fetchUser()` on mount. It relies entirely on whatever is in the auth store. While this is acceptable if the auth store is always kept up-to-date, it means any missed refresh elsewhere will cause stale data to be displayed.

---

## 8. Findings Summary

### Files Involved

| File | Role | Issue |
|------|------|-------|
| `src/pages/UniversityIdPage.tsx` (Lines 130-134) | Upload & save flow | **PRIMARY BUG** — Does not refresh user state after save |
| `src/store/authStore.ts` (Lines 84-94) | User state management | Has `fetchUser()` but it's never called post-extraction |
| `src/pages/DashboardPage.tsx` (Lines 63, 108-136, 67-84) | Dashboard rendering | Reads stale user data; no auto-refresh on mount |
| `backend/.../controller/DocumentExtractionController.java` (Lines 66-87) | Save endpoint | Returns `ApiResponse<Void>` instead of updated user |
| `backend/.../service/ai/MockGeminiDocumentService.java` (Lines 58-91) | Database update | ✅ Correctly updates database |
| `backend/.../entity/User.java` (Lines 125-156) | Entity fields | ✅ Has all required fields |
| `backend/.../dto/user/UserResponse.java` | DTO | ✅ Maps all fields correctly |
| `src/services/document.service.ts` (Lines 24-26) | Save API call | Returns `ApiResponse<void>` — ignores response data |
| `backend/.../db/migration/V12__add_university_id_fields.sql` | Schema | ✅ Correct schema |

### Key Line Numbers

| File | Line(s) | Issue |
|------|---------|-------|
| `src/pages/UniversityIdPage.tsx` | 130-134 | `handleSave()` doesn't call `fetchUser()` after successful save |
| `src/pages/DashboardPage.tsx` | 63 | `const { user } = useAuthStore()` reads potentially stale data |
| `src/pages/DashboardPage.tsx` | 116 | `completed: user?.documentExtractionStatus === 'COMPLETED'` — condition is correct, but `user` is stale |
| `src/pages/DashboardPage.tsx` | 67-84 | `useEffect` doesn't refresh user profile on mount |
| `backend/.../controller/DocumentExtractionController.java` | 85 | Returns only success message, not updated user |

### Database Fields

| Field | Type | Default | Set by Extraction |
|-------|------|---------|-------------------|
| `document_extraction_status` | `VARCHAR(50)` | `'NOT_STARTED'` | ✅ Set to `'COMPLETED'` |
| `university_id_number` | `VARCHAR(100)` | `NULL` | ✅ Set from extraction |
| `university_name` | `VARCHAR(255)` | `NULL` | ✅ Set from extraction |
| `document_type` | `VARCHAR(50)` | `NULL` | ✅ Set from extraction |
| `university_id_verified` | `BOOLEAN` | `FALSE` | ❌ Not set (by design — needs admin approval) |
| `document_uploaded_at` | `TIMESTAMP` | `NULL` | ❌ Not set (oversight) |

### API Fields

| Endpoint | Method | Response Contains User? | Used After Save? |
|----------|--------|------------------------|-------------------|
| `/api/document-extraction/extract` | POST | No (returns extraction result) | N/A |
| `/api/document-extraction/save` | POST | **No** (returns void) | N/A |
| `/api/auth/profile` | GET | **Yes** (returns full user) | **No** — never called post-save |

### Frontend Fields

| Store/Hook | Field | Value After Login | Value After DB Update | Actual Value in Store |
|------------|-------|-------------------|----------------------|----------------------|
| `authStore` | `user.documentExtractionStatus` | `"NOT_STARTED"` | `"COMPLETED"` (in DB) | `"NOT_STARTED"` (stale) |
| `authStore` | `user.universityIdNumber` | `null` | `"STU-2024-12345"` (in DB) | `null` (stale) |
| `authStore` | `user.universityName` | `null` | `"City University"` (in DB) | `null` (stale) |

---

## 9. Recommended Fix

### Minimum Viable Fix (1 line change)
**File:** `src/pages/UniversityIdPage.tsx`

In the `handleSave()` function (after line 130), add a call to refresh the user profile:

```typescript
const handleSave = async () => {
  try {
    setIsSaving(true);
    await documentService.saveDocumentExtraction(extractionResult);
    
    // ADD: Refresh user data in auth store
    await useAuthStore.getState().fetchUser();
    
    setIsSuccess(true);
    setTimeout(() => navigate('/dashboard'), 2000);
  } catch (err: any) {
    // ...
  }
};
```

### Recommended Robust Fix (defense in depth)

1. **UniversityIdPage.tsx:** Call `fetchUser()` after successful save (primary fix)
2. **DocumentExtractionController.java:** Return updated `UserResponse` from save endpoint (eliminate need for extra API call)
3. **DashboardPage.tsx:** Add `fetchUser()` to the `useEffect` on mount as a safety net
4. **MockGeminiDocumentService.java:** Also set `documentUploadedAt` to `LocalDateTime.now()` when saving

---

## 10. Simulation Trace

### New User Flow: Upload → Save → Dashboard

| Step | `documentExtractionStatus` in DB | `documentExtractionStatus` in Auth Store | Dashboard Display |
|------|----------------------------------|----------------------------------------|-------------------|
| User registers | `"NOT_STARTED"` | `"NOT_STARTED"` | "Verify University ID" (Pending) |
| User logs in | `"NOT_STARTED"` | `"NOT_STARTED"` | "Verify University ID" (Pending) |
| Upload & extract succeeds | `"NOT_STARTED"` | `"NOT_STARTED"` | "Verify University ID" (Pending) |
| Save extraction succeeds | `"COMPLETED"` ✅ | `"NOT_STARTED"` ❌ **STALE** | "Verify University ID" (Pending) ❌ |
| Navigate to dashboard | `"COMPLETED"` | `"NOT_STARTED"` ❌ **STALE** | "Verify University ID" (Pending) ❌ |
| **After fix (fetchUser called)** | `"COMPLETED"` | `"COMPLETED"` ✅ | "✓ Completed" ✅ |

---

*End of Audit Report*