# Face Enrollment Status Bug — Root Cause Report

## Executive Summary

Face verification fails for enrolled users because the Java service code sets enrollment status to `COMPLETED`, but the database CHECK constraint only allows `PENDING`, `PROCESSING`, `ENROLLED`, `FAILED`. The INSERT/UPDATE with `status='COMPLETED'` is rejected by PostgreSQL, so the enrollment record either remains in `PROCESSING` state or gets set to `FAILED`, making it permanently non-verifiable.

---

## 1. Migration File

**File:** `backend/src/main/resources/db/migration/V6__db_reliability_sprint.sql`

**Lines 137–139 — Constraint definition:**
```sql
ALTER TABLE face_enrollments
    ADD CONSTRAINT chk_enrollment_status
    CHECK (status IN ('PENDING', 'PROCESSING', 'ENROLLED', 'FAILED'));
```

**Lines 83–85 — Unique partial index:**
```sql
CREATE UNIQUE INDEX idx_face_enrollments_user_active
    ON face_enrollments(user_id)
    WHERE status = 'ENROLLED';
```

---

## 2. Constraint: Allowed Status Values

| Status       | Allowed | Used by Java |
|-------------|---------|-------------|
| `PENDING`    | ✅      | ✅ (createEnrollment) |
| `PROCESSING` | ✅      | ✅ (processEnrollment) |
| `ENROLLED`   | ✅      | ❌ **Never used** |
| `FAILED`     | ✅      | ✅ (catch blocks) |
| `COMPLETED`  | ❌      | ✅ **Used but REJECTED by DB** |

---

## 3. Entity Enum

**File:** `backend/src/main/java/com/cityparking/backend/entity/FaceEnrollment.java`

The `EnrollmentStatus` enum includes `COMPLETED` as a value, but when Hibernate serializes this to a string for the `status` column, it writes `'COMPLETED'` which violates the constraint.

---

## 4. Service Code — Where COMPLETED Is Set

**File:** `backend/src/main/java/com/cityparking/backend/service/FaceEnrollmentService.java`

### Location 1 — `processEnrollment()` line 114:
```java
enrollment.setStatus(FaceEnrollment.EnrollmentStatus.COMPLETED);  // ← BUG
```
This runs after successful face enrollment via `faceRecognitionService.enrollFace()`. The DB rejects this INSERT, causing:
- The `@Async` method's transaction rolls back
- The enrollment stays in `PROCESSING` status (set on line 86)
- OR if a subsequent save with `FAILED` is triggered by the caught exception, it records a failure with the constraint violation message

### Location 2 — `updateEnrollment()` line 249:
```java
enrollment.setStatus(FaceEnrollment.EnrollmentStatus.COMPLETED);  // ← BUG
```
Same issue during re-enrollment flow.

### Location 3 — `deleteEnrollment()` line 190:
```java
if (enrollment.getStatus() == FaceEnrollment.EnrollmentStatus.COMPLETED) {  // ← Dead code
```
This check is used to decide whether to delete the face from the provider. Since status is never actually `COMPLETED` in the DB, this condition is always `false`, meaning provider-side cleanup is skipped on deletion.

---

## 5. Verification Service — How Status Is Checked

**File:** `backend/src/main/java/com/cityparking/backend/service/FaceVerificationService.java`

### Line 101–102:
```java
if (optionalEnrollment.isEmpty() ||
        optionalEnrollment.get().getStatus() != FaceEnrollment.EnrollmentStatus.COMPLETED) {
    log.warn("User {} found but enrollment is not active", userId);
```
Even if the status check were correct, the DB never stores `COMPLETED`, so this check **always fails** — returning `"User found but enrollment is not active"`.

### Line 147–148 (`hasActiveEnrollment()`):
```java
return enrollment.isPresent() &&
        enrollment.get().getStatus() == FaceEnrollment.EnrollmentStatus.COMPLETED;
```
Same dead logic.

---

## 6. Root Cause

**Mismatch between Java enum values and DB constraint:**

```
DB Constraint:     PENDING → PROCESSING → ENROLLED → FAILED
Java Code:         PENDING → PROCESSING → COMPLETED → FAILED
                                                ^^^^^^^^^
                                                MISMATCH
```

The V6 migration deliberately chose `ENROLLED` as the terminal success state (consistent with the unique partial index `WHERE status = 'ENROLLED'`). The Java code was written with `COMPLETED` instead.

**Cascade of failures:**
1. `processEnrollment()` → sets `COMPLETED` → DB rejects → transaction rolls back
2. Enrollment stays in `PROCESSING` or gets `FAILED` with constraint violation
3. `FaceVerificationService.verifyFace()` → checks for `COMPLETED` → never matches → returns false
4. User sees: "Face verified. userId: 19, similarity: 1.0" but final result is `"User 19 found but enrollment is not active"`

---

## 7. Recommended Fix

**Use `ENROLLED` instead of `COMPLETED` in all Java code.** This is the correct fix because:

1. The DB constraint was intentionally designed with `ENROLLED` as the success state
2. The unique partial index already uses `WHERE status = 'ENROLLED'`
3. `ENROLLED` is semantically correct (the user has been enrolled in the face recognition system)
4. Adding `COMPLETED` to the constraint would create two terminal success states, causing confusion and the unique index would not cover `COMPLETED`

---

## 8. Exact SQL Fix

**No SQL changes needed.** The constraint is correct. If you ever need to fix an existing broken deployment where rows are stuck, use:

```sql
-- Fix any stuck enrollments (if any exist in PROCESSING due to the bug)
UPDATE face_enrollments 
SET status = 'ENROLLED', error_message = NULL
WHERE status = 'PROCESSING' 
  AND external_face_id IS NOT NULL 
  AND error_message IS NULL;
```

**Do NOT add `COMPLETED` to the constraint.** The constraint is the source of truth.

---

## 9. Exact Java Code Fix

### File 1: `FaceEnrollment.java` — Remove `COMPLETED` from enum

```java
// BEFORE:
public enum EnrollmentStatus {
    PENDING, PROCESSING, COMPLETED, FAILED
}

// AFTER:
public enum EnrollmentStatus {
    PENDING, PROCESSING, ENROLLED, FAILED
}
```

### File 2: `FaceEnrollmentService.java` — Three changes

**Line 114** (`processEnrollment`):
```java
// BEFORE:
enrollment.setStatus(FaceEnrollment.EnrollmentStatus.COMPLETED);

// AFTER:
enrollment.setStatus(FaceEnrollment.EnrollmentStatus.ENROLLED);
```

**Line 249** (`updateEnrollment`):
```java
// BEFORE:
enrollment.setStatus(FaceEnrollment.EnrollmentStatus.COMPLETED);

// AFTER:
enrollment.setStatus(FaceEnrollment.EnrollmentStatus.ENROLLED);
```

**Line 190** (`deleteEnrollment`):
```java
// BEFORE:
if (enrollment.getExternalFaceId() != null
        && enrollment.getStatus() == FaceEnrollment.EnrollmentStatus.COMPLETED) {

// AFTER:
if (enrollment.getExternalFaceId() != null
        && enrollment.getStatus() == FaceEnrollment.EnrollmentStatus.ENROLLED) {
```

### File 3: `FaceVerificationService.java` — Two changes

**Line 102** (`verifyFace`):
```java
// BEFORE:
optionalEnrollment.get().getStatus() != FaceEnrollment.EnrollmentStatus.COMPLETED

// AFTER:
optionalEnrollment.get().getStatus() != FaceEnrollment.EnrollmentStatus.ENROLLED
```

**Line 148** (`hasActiveEnrollment`):
```java
// BEFORE:
enrollment.get().getStatus() == FaceEnrollment.EnrollmentStatus.COMPLETED;

// AFTER:
enrollment.get().getStatus() == FaceEnrollment.EnrollmentStatus.ENROLLED;
```

---

## 10. Verification Checklist After Fix

After applying the fix:
- [ ] `FaceEnrollment.EnrollmentStatus.ENROLLED` is the terminal success state
- [ ] DB constraint allows `ENROLLED` (already does)
- [ ] `FaceEnrollmentService.processEnrollment()` sets `ENROLLED` on success → DB accepts
- [ ] `FaceVerificationService.verifyFace()` checks for `ENROLLED` → matches DB state
- [ ] `hasActiveEnrollment()` checks for `ENROLLED` → returns `true` for enrolled users
- [ ] `deleteEnrollment()` properly detects enrolled status → cleans up provider
- [ ] Unique index `idx_face_enrollments_user_active WHERE status = 'ENROLLED'` prevents duplicate enrollments
- [ ] Existing test files may need `COMPLETED` → `ENROLLED` replacements

---

## Files Requiring Changes

| File | Lines | Change |
|------|-------|--------|
| `backend/src/main/java/com/cityparking/backend/entity/FaceEnrollment.java` | enum | `COMPLETED` → `ENROLLED` |
| `backend/src/main/java/com/cityparking/backend/service/FaceEnrollmentService.java` | 114, 190, 249 | `COMPLETED` → `ENROLLED` |
| `backend/src/main/java/com/cityparking/backend/service/FaceVerificationService.java` | 102, 148 | `COMPLETED` → `ENROLLED` |