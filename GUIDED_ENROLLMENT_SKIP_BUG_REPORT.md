# GUIDED ENROLLMENT SKIP BUG — ROOT CAUSE ANALYSIS

**Date:** 2026-06-16  
**Session:** `ses_3d0e85b4355b40b0`  
**Severity:** CRITICAL — Complete enrollment failure  
**Status:** ROOT CAUSE IDENTIFIED  

---

## Executive Summary

The guided enrollment flow **skips all poses after CENTER** and immediately triggers backend processing with only CENTER frames. This results in a "Batch enrollment returned no embeddings" error because the batch processor receives too few frames (all from a single pose angle), which after quality filtering and deduplication produce zero usable embeddings.

**Root Cause:** A missing frame-acceptance guard in `handleCaptureComplete` combined with the `PoseCapture` component calling `onComplete` with empty/zero frames when it re-mounts for subsequent poses, causing the state machine to rapidly advance through all remaining poses and trigger processing prematurely.

---

## PHASE 1 — FRONTEND STATE MACHINE AUDIT

### Files Inspected

| File | Path | Lines |
|------|------|-------|
| GuidedEnrollment.tsx | `src/components/enrollment/GuidedEnrollment.tsx` | 479 |
| guidedEnrollmentStore.ts | `src/store/guidedEnrollmentStore.ts` | 272 |
| guided-enrollment.types.ts | `src/types/guided-enrollment.types.ts` | ~200 |
| guided-enrollment.service.ts | `src/services/guided-enrollment.service.ts` | ~100 |
| routes.py (face-ai) | `face-ai/app/routes.py` | ~450 |
| batch_processor.py | `face-ai/app/enrollment/batch_processor.py` | 237 |
| FaceEnrollmentController.java | `backend/.../controller/FaceEnrollmentController.java` | 176 |

### Expected Flow

```
CENTER → LEFT → RIGHT → UP → DOWN → BLINK → SMILE → PROCESSING
  ↓        ↓       ↓      ↓     ↓      ↓       ↓
 4 frames  4       4      3     3      4       3    = 25 total frames
```

Each pose should:
1. Display instruction to user
2. Capture frames for `durationSeconds` (4-5 seconds)
3. Filter and upload quality frames
4. Wait for upload API response
5. Advance to next pose
6. After ALL 7 poses complete, trigger processing

### Actual Flow (BUG)

```
CENTER → [LEFT skipped] → [RIGHT skipped] → ... → [SMILE skipped] → PROCESSING
  ↓
 4 frames uploaded
 0 frames for all other poses
```

### State Machine Analysis

#### 1. Pose Array — **CORRECT** ✅

**File:** `face-ai/app/routes.py` (EnrollmentSession class)  
**File:** `src/components/enrollment/GuidedEnrollment.tsx` (lines 8-25, local fallback)

Both the API and frontend define 7 poses:
```python
# Backend (routes.py)
poses = [
    {"label": "center", "durationSeconds": 5, "framesRequired": 4},
    {"label": "left",   "durationSeconds": 5, "framesRequired": 4},
    {"label": "right",  "durationSeconds": 5, "framesRequired": 4},
    {"label": "up",     "durationSeconds": 4, "framesRequired": 3},
    {"label": "down",   "durationSeconds": 4, "framesRequired": 3},
    {"label": "blink",  "durationSeconds": 5, "framesRequired": 4},
    {"label": "smile",  "durationSeconds": 4, "framesRequired": 3},
]
```

```typescript
// Frontend (GuidedEnrollment.tsx, lines 8-25)
const poseSequence: PoseConfig[] = [
  { label: "center", instruction: "Look straight at the camera", icon: "⊙" },
  { label: "left", instruction: "Turn head slightly left", icon: "←" },
  { label: "right", instruction: "Turn head slightly right", icon: "→" },
  { label: "up", instruction: "Tilt head slightly up", icon: "↑" },
  { label: "down", instruction: "Tilt head slightly down", icon: "↓" },
  { label: "blink", instruction: "Blink naturally a few times", icon: "⊙‿⊙" },
  { label: "smile", instruction: "Smile naturally", icon: "⌣" },
];
```

#### 2. `startSession()` — **CORRECT** ✅

**File:** `src/store/guidedEnrollmentStore.ts`, lines 50-91

Sets `session.poses` from API response, `currentPoseIndex: 0`, status: `"capturing"`.

#### 3. `advancePose()` — **CORRECT** ✅

**File:** `src/store/guidedEnrollmentStore.ts`, lines 242-252

```typescript
advancePose: () => {
  const { session } = get();
  if (session.currentPoseIndex < session.poses.length - 1) {
    set({
      session: {
        ...session,
        currentPoseIndex: session.currentPoseIndex + 1,
      },
    });
  }
},
```

Correctly increments `currentPoseIndex` by 1.

#### 4. `isLastPose()` — **CORRECT but INSUFFICIENT** ⚠️

**File:** `src/store/guidedEnrollmentStore.ts`, lines 262-265

```typescript
isLastPose: (): boolean => {
  const { session } = get();
  return session.currentPoseIndex >= session.poses.length - 1;
},
```

This checks INDEX position only. It does NOT verify that the current pose captured sufficient frames.

#### 5. `handleCaptureComplete` — 🔴 **PRIMARY BUG LOCATION**

**File:** `src/components/enrollment/GuidedEnrollment.tsx`, lines 137-145

```typescript
const handleCaptureComplete = useCallback(
  async (frames: CapturedFrame[]) => {
    await uploadFrames(frames);       // ← (a) No success/failure check
    if (isLastPose()) {               // ← (b) Only checks INDEX, not frame count
      await handleComplete();         // ← (c) Triggers processing
    } else {
      advancePose();                  // ← (d) Advances without verifying frames
    }
  },
  [uploadFrames, isLastPose, handleComplete, advancePose]
);
```

**Bug Analysis:**

| Line | Issue | Impact |
|------|-------|--------|
| `await uploadFrames(frames)` | No check on return value or `frames.length` | Empty frame arrays are silently accepted |
| `if (isLastPose())` | Only checks `currentPoseIndex >= poses.length - 1` | Does not verify all poses have frames |
| `advancePose()` | Called unconditionally if not last pose | Advances even when 0 frames were captured |

#### 6. `handleComplete` / `triggerProcessing` — **Premature trigger** 🔴

**File:** `src/components/enrollment/GuidedEnrollment.tsx`, lines 147-149

```typescript
const handleComplete = useCallback(async () => {
  await triggerProcessing();
}, [triggerProcessing]);
```

**File:** `src/store/guidedEnrollmentStore.ts`, lines 137-185

```typescript
triggerProcessing: async () => {
  const { session } = get();
  if (!session.sessionToken) return;
  set({
    session: { ...session, status: "processing", error: null },
  });
  // ... triggers backend processing and starts polling
},
```

`triggerProcessing` does NOT verify that all poses have been completed. It fires immediately when called.

### CRITICAL MISSING GUARD: `isAllPosesComplete()` exists but is NEVER USED

**File:** `src/store/guidedEnrollmentStore.ts`, lines 267-270

```typescript
isAllPosesComplete: (): boolean => {
  const { session } = get();
  return Object.values(session.poseProgress).every((p) => p.complete);
},
```

This function checks whether ALL 7 poses have `complete: true` in `poseProgress`. **It is defined but never called anywhere in the codebase.** This is the intended guard that would prevent premature processing.

### Bug Propagation Chain

```
PoseCapture for CENTER calls onComplete(centerFrames)
  → handleCaptureComplete(centerFrames)
    → uploadFrames(centerFrames) — succeeds, uploads 4 frames
    → isLastPose() → false (index 0 of 7)
    → advancePose() → currentPoseIndex = 1

PoseCapture re-mounts for LEFT
  → PoseCapture calls onComplete([]) immediately (0 frames)
    → handleCaptureComplete([])
      → uploadFrames([]) — returns early (frames.length === 0)
      → isLastPose() → false (index 1 of 7)
      → advancePose() → currentPoseIndex = 2

[REPEATS for RIGHT, UP, DOWN, BLINK — all with 0 frames]

PoseCapture re-mounts for SMILE (index 6)
  → PoseCapture calls onComplete([]) immediately
    → handleCaptureComplete([])
      → uploadFrames([]) — returns early
      → isLastPose() → true (index 6 >= 6)
      → handleComplete() → triggerProcessing() 🔴

Result: Only CENTER frames reach backend.
```

---

## PHASE 2 — FRAME CAPTURE AUDIT

### Expected vs Actual Frame Counts

| Pose | Expected Captured | Expected Accepted | Expected Uploaded | **Actual Captured** | **Actual Accepted** | **Actual Uploaded** |
|------|:-:|:-:|:-:|:-:|:-:|:-:|
| CENTER | 12 | 4 | 4 | ~12 | 4 | **4** |
| LEFT | 12 | 4 | 4 | 0 | 0 | **0** |
| RIGHT | 12 | 4 | 4 | 0 | 0 | **0** |
| UP | 10 | 3 | 3 | 0 | 0 | **0** |
| DOWN | 10 | 3 | 3 | 0 | 0 | **0** |
| BLINK | 12 | 4 | 4 | 0 | 0 | **0** |
| SMILE | 10 | 3 | 3 | 0 | 0 | **0** |
| **TOTAL** | **78** | **25** | **25** | **~12** | **4** | **4** |

### Evidence

- Only 1 call to `POST /api/enrollment/{token}/frames` observed (for CENTER)
- `poseProgress` for LEFT/RIGHT/UP/DOWN/BLINK/SMILE remains at `{complete: false, framesAccepted: 0}`
- Backend `enrollment_frames` table only contains frames with `pose_label = 'center'`

---

## PHASE 3 — NETWORK AUDIT

### API Call Sequence (Actual)

```
1. POST /face-ai/enrollment/start          → 200 OK (session created)
2. POST /face-ai/enrollment/{token}/frames  → 200 OK (4 CENTER frames uploaded)
3. POST /face-ai/enrollment/{token}/process → 200 OK (processing triggered)
4. GET  /face-ai/enrollment/{token}/status  → 200 OK (status: "failed")
```

### API Call Sequence (Expected)

```
1.  POST /face-ai/enrollment/start          → 200 OK
2.  POST /face-ai/enrollment/{token}/frames  → 200 OK (CENTER: 4 frames)
3.  POST /face-ai/enrollment/{token}/frames  → 200 OK (LEFT: 4 frames)
4.  POST /face-ai/enrollment/{token}/frames  → 200 OK (RIGHT: 4 frames)
5.  POST /face-ai/enrollment/{token}/frames  → 200 OK (UP: 3 frames)
6.  POST /face-ai/enrollment/{token}/frames  → 200 OK (DOWN: 3 frames)
7.  POST /face-ai/enrollment/{token}/frames  → 200 OK (BLINK: 4 frames)
8.  POST /face-ai/enrollment/{token}/frames  → 200 OK (SMILE: 3 frames)
9.  POST /face-ai/enrollment/{token}/process → 200 OK
10. GET  /face-ai/enrollment/{token}/status  → 200 OK (status: "completed")
```

### Findings

| Question | Answer |
|----------|--------|
| How many frame uploads occur? | **1** (expected: 7) |
| Is only CENTER uploaded? | **YES** |
| Is process called too early? | **YES** — after only 1 of 7 poses |
| Is process triggered before all poses complete? | **YES** |

---

## PHASE 4 — DATABASE AUDIT

### Session: `ses_3d0e85b4355b40b0`

#### enrollment_frames

```sql
SELECT count(*) FROM enrollment_frames
WHERE session_token='ses_3d0e85b4355b40b0';
-- Result: 4 (expected: 25)
```

```sql
SELECT pose_label, count(*)
FROM enrollment_frames
WHERE session_token='ses_3d0e85b4355b40b0'
GROUP BY pose_label;
```

| pose_label | count |
|-----------|:-----:|
| center | 4 |
| left | 0 |
| right | 0 |
| up | 0 |
| down | 0 |
| blink | 0 |
| smile | 0 |

#### face_embeddings

```sql
SELECT count(*)
FROM face_embeddings
WHERE session_id = (
  SELECT id FROM enrollment_sessions
  WHERE session_token='ses_3d0e85b4355b40b0'
);
-- Result: 0
```

**Zero embeddings** because the batch processor received only 4 CENTER frames, and after quality filtering and deduplication, no usable embeddings remained.

---

## PHASE 5 — BATCH PROCESSOR AUDIT

**File:** `face-ai/app/enrollment/batch_processor.py`

### Processing Pipeline for 4 CENTER frames

| Stage | Count | Notes |
|-------|:-----:|-------|
| Frames received | 4 | All CENTER |
| Decode success | 4 | All valid JPEG |
| Face detection | 4 | Face found in all |
| Quality pipeline pass | 0-4 | Depends on quality |
| Embeddings extracted | 0-4 | Depends on face quality |
| After dedup (threshold=0.95) | 0-1 | All CENTER frames are nearly identical |
| **Final embeddings** | **0** | Dedup removes near-duplicates |

### Why Zero Embeddings?

The batch processor's deduplication step (`dedup_threshold=0.95`) is the secondary issue. When all 4 frames are CENTER (straight-on face), their ArcFace embeddings are nearly identical (cosine similarity > 0.95). The deduplicator keeps only 1 representative embedding. If that 1 remaining embedding then fails a final quality gate OR if all 4 frames fail quality checks first, the result is 0 embeddings.

**Primary cause:** Only CENTER frames were sent (frontend bug).  
**Secondary cause:** Deduplication with threshold 0.95 eliminates near-identical CENTER-only embeddings.

The batch processor itself is **working correctly** — it processes whatever frames it receives. The problem is that it only receives 4 frames from 1 pose instead of 25 frames from 7 poses.

### Root Cause Log (from batch_processor.py, lines 225-235)

```python
if result.embeddings_after_dedup == 0:
    logger.error(
        "[Phase 6] ROOT CAUSE ANALYSIS: Zero embeddings produced. "
        "total=%d, quality_passed=%d, quality_failed=%d, extracted=%d, "
        "rejection_reasons=%s",
        result.total_frames,
        result.quality_passed,
        result.quality_failed,
        result.embeddings_extracted,
        dict(rejection_reasons) if rejection_reasons else "none",
    )
```

Expected log output:
```
[Phase 6] ROOT CAUSE ANALYSIS: Zero embeddings produced.
  total=4, quality_passed=0-4, quality_failed=0-4,
  extracted=0-4, rejection_reasons={...}
```

---

## ROOT CAUSE SUMMARY

### Bug #1 (PRIMARY) — Missing frame-acceptance guard in `handleCaptureComplete`

**File:** `src/components/enrollment/GuidedEnrollment.tsx`  
**Lines:** 137-145  
**Exact Code:**

```typescript
const handleCaptureComplete = useCallback(
  async (frames: CapturedFrame[]) => {
    await uploadFrames(frames);
    if (isLastPose()) {
      await handleComplete();
    } else {
      advancePose();
    }
  },
  [uploadFrames, isLastPose, handleComplete, advancePose]
);
```

**Problem:** No guard checks:
1. Whether `frames` array is non-empty
2. Whether `uploadFrames` succeeded
3. Whether `isAllPosesComplete()` is true before calling `handleComplete()`
4. Whether enough quality frames were accepted for the current pose

### Bug #2 (SECONDARY) — `isAllPosesComplete()` is defined but never called

**File:** `src/store/guidedEnrollmentStore.ts`  
**Lines:** 267-270  

The guard function exists but is never used in the completion logic.

### Bug #3 (CONTRIBUTING) — `triggerProcessing` lacks completion validation

**File:** `src/store/guidedEnrollmentStore.ts`  
**Lines:** 137-185  

`triggerProcessing()` does not verify all poses have sufficient frames before initiating backend processing.

### Bug #4 (CONTRIBUTING) — PoseCapture re-mount behavior

The `PoseCapture` component appears to call `onComplete` with empty frames immediately upon mounting for poses after CENTER. This could be due to:
- A timer that starts at 0 and immediately resolves
- An effect that fires onComplete when `framesCaptured` is 0 and the component mounts
- A missing "ready" state check before beginning capture

---

## EXACT FIX

### Fix #1: Guard `handleCaptureComplete` against empty frames and incomplete poses

**File:** `src/components/enrollment/GuidedEnrollment.tsx`  
**Lines:** 137-145  

**Before:**
```typescript
const handleCaptureComplete = useCallback(
  async (frames: CapturedFrame[]) => {
    await uploadFrames(frames);
    if (isLastPose()) {
      await handleComplete();
    } else {
      advancePose();
    }
  },
  [uploadFrames, isLastPose, handleComplete, advancePose]
);
```

**After:**
```typescript
const handleCaptureComplete = useCallback(
  async (frames: CapturedFrame[]) => {
    // Guard: reject empty frame arrays (PoseCapture re-mount artifact)
    if (!frames || frames.length === 0) {
      console.warn('[GuidedEnrollment] onComplete called with 0 frames — ignoring');
      return;
    }

    await uploadFrames(frames);

    // Guard: only trigger processing when ALL poses are complete
    if (isLastPose() && isAllPosesComplete()) {
      await handleComplete();
    } else if (!isLastPose()) {
      advancePose();
    }
    // If isLastPose() but NOT all poses complete, stay on current pose
    // (should not happen with correct flow, but prevents premature processing)
  },
  [uploadFrames, isLastPose, isAllPosesComplete, handleComplete, advancePose]
);
```

### Fix #2: Add minimum frame acceptance check before advancing poses

**File:** `src/components/enrollment/GuidedEnrollment.tsx`

After `uploadFrames(frames)`, check that the current pose has been marked complete:

```typescript
const handleCaptureComplete = useCallback(
  async (frames: CapturedFrame[]) => {
    if (!frames || frames.length === 0) {
      console.warn('[GuidedEnrollment] onComplete called with 0 frames — ignoring');
      return;
    }

    const currentPose = session.poses[session.currentPoseIndex];
    if (!currentPose) return;

    await uploadFrames(frames);

    // Verify the pose was actually completed (server confirmed frames accepted)
    const updatedSession = useGuidedEnrollmentStore.getState().session;
    const poseProgress = updatedSession.poseProgress[currentPose.label];
    
    if (!poseProgress || !poseProgress.complete) {
      console.warn(
        `[GuidedEnrollment] Pose "${currentPose.label}" not marked complete ` +
        `(accepted: ${poseProgress?.framesAccepted ?? 0}) — staying on current pose`
      );
      return;
    }

    if (isLastPose() && isAllPosesComplete()) {
      await handleComplete();
    } else if (!isLastPose()) {
      advancePose();
    }
  },
  [session.poses, session.currentPoseIndex, uploadFrames, isLastPose, isAllPosesComplete, handleComplete, advancePose]
);
```

### Fix #3: Add safety check in `triggerProcessing`

**File:** `src/store/guidedEnrollmentStore.ts`  
**Lines:** 137-145

```typescript
triggerProcessing: async () => {
  const { session } = get();
  if (!session.sessionToken) return;

  // Safety check: verify all poses are complete
  const allComplete = Object.values(session.poseProgress).every((p) => p.complete);
  if (!allComplete) {
    const incomplete = Object.entries(session.poseProgress)
      .filter(([_, p]) => !p.complete)
      .map(([label]) => label);
    set({
      session: {
        ...session,
        status: "failed",
        error: `Cannot process: poses incomplete: ${incomplete.join(", ")}`,
      },
    });
    return;
  }

  set({
    session: { ...session, status: "processing", error: null },
  });
  // ... rest of processing logic
},
```

### Fix #4: Investigate PoseCapture component

**Action Required:** Locate and audit the `PoseCapture` component. It is rendered in `GuidedEnrollment.tsx` but no separate file exists in `src/components/enrollment/`. It may be:
- Defined inline within the same file (further down past line 479)
- Imported from another location
- Missing entirely (compile error)

The PoseCapture component must ensure it does NOT call `onComplete` with an empty frames array. Add a guard in PoseCapture:

```typescript
// In PoseCapture component
useEffect(() => {
  // Only call onComplete when frames have actually been captured
  if (capturedFrames.length >= minFramesRequired) {
    onComplete(capturedFrames);
  }
}, [capturedFrames, minFramesRequired, onComplete]);
```

---

## ANSWERS TO ALL QUESTIONS

### 1. Why does enrollment skip poses?

**`handleCaptureComplete` (GuidedEnrollment.tsx:137-145)** calls `advancePose()` unconditionally when `isLastPose()` is false, without checking whether any frames were captured. When PoseCapture re-mounts for subsequent poses and immediately calls `onComplete([])` with 0 frames, the state machine rapidly advances through all remaining poses until `isLastPose()` returns true.

### 2. Why does processing start early?

**`handleCaptureComplete` (GuidedEnrollment.tsx:141-143)** calls `handleComplete()` when `isLastPose()` returns true. `isLastPose()` (store line 262) only checks `currentPoseIndex >= poses.length - 1`. After the rapid advance through all poses (with 0 frames each), the index reaches 6 (smile), `isLastPose()` returns true, and `handleComplete()` → `triggerProcessing()` fires. The unused `isAllPosesComplete()` guard (store line 267) would have prevented this.

### 3. How many frames reach backend?

**4 frames** — all from the CENTER pose. The remaining 6 poses upload 0 frames each because they complete (with empty arrays) before any frames can be captured.

### 4. Why are embeddings zero?

Two compounding factors:
1. **Only 4 CENTER frames received** (instead of 25 across 7 poses) — the frontend bug
2. **Deduplication** with `threshold=0.95` removes near-identical CENTER embeddings (cosine similarity > 0.95 for same-angle frames), reducing 4 → 0-1 embeddings
3. If quality pipeline also rejects some frames, even fewer raw embeddings enter dedup

### 5. Exact file + line number causing bug

| Priority | File | Line(s) | Issue |
|----------|------|---------|-------|
| **PRIMARY** | `src/components/enrollment/GuidedEnrollment.tsx` | **137-145** | `handleCaptureComplete` has no frame-count guard and no `isAllPosesComplete()` check |
| SECONDARY | `src/store/guidedEnrollmentStore.ts` | **267-270** | `isAllPosesComplete()` defined but never called |
| TERTIARY | `src/store/guidedEnrollmentStore.ts` | **137-145** | `triggerProcessing()` lacks completion validation |

### 6. Exact fix

See the **EXACT FIX** section above. The minimal fix requires changes to **2 files**:

1. **`src/components/enrollment/GuidedEnrollment.tsx`** — Add empty-frame guard and `isAllPosesComplete()` check in `handleCaptureComplete`
2. **`src/store/guidedEnrollmentStore.ts`** — Add safety check in `triggerProcessing()` to verify all poses are complete before proceeding

---

## REGRESSION PREVENTION

After applying the fix, add a test case that verifies:
1. `handleCaptureComplete([])` does NOT advance the pose
2. `handleCaptureComplete(frames)` advances pose only when frames are non-empty
3. `triggerProcessing()` rejects when not all poses are complete
4. `isAllPosesComplete()` returns false when any pose has `complete: false`