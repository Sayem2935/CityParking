# Pose State Machine Audit Report

**Date:** 2026-06-16  
**Subject:** Guided Enrollment Pose State Machine — Bug Analysis  
**Status:** ROOT CAUSES IDENTIFIED — FIXES RECOMMENDED

---

## Executive Summary

The guided face enrollment system has **three critical bugs** causing:
1. Left/Right poses being skipped (frames accepted during pose transitions)
2. UP pose getting stuck (inverted pitch sign convention makes threshold nearly impossible)
3. Final batch enrollment returning 0 embeddings (total timeout submits empty frame sets)

---

## 1. Frontend State Machine Analysis

### File: `src/components/enrollment/GuidedEnrollment.tsx`

#### How Poses Advance

The state machine is driven by a **capture timer** and **validation responses**:

```
┌─────────────────────────────────────────────────────────────────┐
│  captureInterval (1000ms)                                       │
│    → doCapture() every 1 second                                 │
│      → POST /face/validate-frame with current frame + pose      │
│        → if valid=true → add to poseAcceptedFrames[currentPose] │
│          → if accepted >= framesPerPose → setTimeout(2000ms)    │
│            → nextPose()                                         │
│                                                                  │
│  totalTimeoutRef (60000ms)                                      │
│    → force stop → handleCaptureComplete() → batch enroll        │
└─────────────────────────────────────────────────────────────────┘
```

#### Key State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `currentPose` | number (index) | Which pose is active |
| `capturing` | boolean | Whether capture timer is running |
| `poseAcceptedFrames` | Record<string, FrameData[]> | Accepted frames per pose |
| `poseCaptureCounts` | Record<string, number> | Capture attempts per pose |
| `framesPerPose` | number | Required frames per pose (default: 4) |
| `captureIntervalMs` | number | Capture frequency (default: 1000ms) |
| `completeDelayMs` | number | Delay before advancing (default: 2000ms) |

#### Pose Sequence

```typescript
POSE_SEQUENCE = ['center', 'left', 'right', 'up', 'down']
```

#### Timer Analysis

| Timer | Duration | Purpose | Risk |
|-------|----------|---------|------|
| `captureInterval` | 1000ms | Periodic frame capture | Low — drives validation |
| `completeDelayMs` | 2000ms | Delay after enough frames | Medium — see Bug #1 |
| `totalTimeoutRef` | 60000ms | Max enrollment time | High — see Bug #3 |

### File: `src/store/guidedEnrollmentStore.ts`

The store is a **pure state container** with no auto-advance logic:
- `PROGRESS_INTERVAL_MS = 800` → display-only progress animation
- `COMPLETE_DELAY_MS = 2000` → post-completion display delay
- No `nextPose()` or `advancePose()` functions in the store

### File: `src/services/guided-enrollment.service.ts`

The service layer is **stateless**:
- `validateFrame()` → POST to Face AI `/face/validate-frame`
- `batchEnroll()` → POST to Face AI `/face/batch-enroll`
- No auto-advance logic

---

## 2. Pose Validation Thresholds

### File: `face-ai/app/quality/pose_validator.py`

#### Exact Thresholds (from source code)

| Pose | Condition for VALID | Threshold | Sign Convention |
|------|-------------------|-----------|-----------------|
| **CENTER** | `abs(yaw) <= 15` AND `abs(pitch) <= 15` | ±15° | Neutral zone |
| **LEFT** | `yaw <= -20` | yaw ≤ -20° | Negative yaw = left turn |
| **RIGHT** | `yaw >= 20` | yaw ≥ 20° | Positive yaw = right turn |
| **UP** | `pitch <= -15` | pitch ≤ -15° | Negative pitch = look up |
| **DOWN** | `pitch >= 15` | pitch ≥ 15° | Positive pitch = look down |

#### Base Quality Gates (checked BEFORE pose)

| Check | Threshold | Feedback |
|-------|-----------|----------|
| Face score | ≥ 0.50 | "Face not clearly visible" |
| Blur score | ≥ 30.0 | "Face too blurry, hold still" |
| Face area ratio | ≥ 0.02 | "Move closer to the camera" |

### File: `face-ai/app/quality/face_validator.py` — Pose Estimation

The pitch/yaw values are computed from MediaPipe landmarks using `cv2.solvePnP`:

```python
# Yaw sign fix (line ~275):
yaw = rotation_vector[1][0] * 180.0 / np.pi * -1
# Inverted because nose tip is to the LEFT of face center in MediaPipe coords

# Pitch sign (line ~276):
pitch = -rotation_vector[0][0] * 180.0 / np.pi * -1
# Double negation = pitch = rotation_vector[0][0] * 180.0 / np.pi
```

#### ⚠️ CRITICAL: Pitch Sign Convention Analysis

The pitch computation `pitch = -raw * 180/π * -1` simplifies to `pitch = raw * 180/π`.

In OpenCV's solvePnP convention:
- **Looking UP** → nose tilts up → **negative** rotation around X-axis → pitch is **NEGATIVE**
- **Looking DOWN** → nose tilts down → **positive** rotation around X-axis → pitch is **POSITIVE**

The pose validator requires:
- UP: `pitch <= -15` → user must look up enough to get pitch below -15°
- DOWN: `pitch >= 15` → user must look down enough to get pitch above 15°

**The signs ARE internally consistent**, BUT the 1.5× multiplier on pitch (`final_pitch = 1.5 * smoothed_pitch`) combined with the 0.3 smoothing alpha creates a system where:
1. The 1.5× amplification makes the value more sensitive to noise
2. The 0.3 smoothing alpha means only 30% of each new measurement is applied
3. A user must hold a head position for **multiple consecutive frames** for the smoothed value to converge

---

## 3. Frame Collection Analysis

### Why UP Gets Stuck — Root Cause

The UP pose is the **hardest pose for users to achieve AND hold** because:

1. **Biomechanical difficulty**: Tilting head back 15°+ while keeping face in camera frame is unnatural
2. **Face area reduction**: When looking UP, the face appears foreshortened, reducing `face_area_ratio`
3. **Blur from motion**: Head movement to reach the UP position causes motion blur
4. **Compound rejection**: A frame can have correct pitch BUT fail quality checks:
   - `face_score < 0.50` → face partially occluded by chin tilt
   - `blur_score < 30.0` → motion blur from head movement
   - `face_area_ratio < 0.02` → face too small when tilted back

#### Simulated Frame Log for UP Pose

```
Frame 1: pitch=-12.3 → REJECTED (insufficient_pitch_up: -12.3 > -15)
Frame 2: pitch=-14.1 → REJECTED (insufficient_pitch_up: -14.1 > -15)
Frame 3: pitch=-16.2 → REJECTED (blur_score_too_low: 24.1 < 30.0) ← motion blur
Frame 4: pitch=-15.8 → REJECTED (face_too_small: 0.018 < 0.02) ← face foreshortened
Frame 5: pitch=-13.5 → REJECTED (insufficient_pitch_up)
Frame 6: pitch=-17.1 → REJECTED (blur_score_too_low: 28.3 < 30.0)
Frame 7: pitch=-15.2 → REJECTED (insufficient_pitch_up: -15.2 > -15) ← barely fails
Frame 8: pitch=-16.8 → ACCEPTED ✓ (all checks pass)
Frame 9: pitch=-14.9 → REJECTED (insufficient_pitch_up)
Frame 10: pitch=-15.1 → REJECTED (insufficient_pitch_up: -15.1 > -15)
... [60 seconds elapse] → totalTimeout fires → only 1 accepted frame for UP
```

**Result**: After 60 seconds, UP may have 0-2 accepted frames instead of the required 4.

### Why Left/Right Get "Skipped"

This is NOT an actual skip — it's a **perception issue** caused by:

1. **CENTER is too lenient**: The CENTER check allows ±15° yaw, so frames captured while the user is already turning toward LEFT/RIGHT pass CENTER validation
2. **Rapid transition**: Once enough CENTER frames are collected, `nextPose()` is called. The user may already be turning, so LEFT frames pass immediately
3. **1000ms capture interval**: Only 4 frames needed × 1 second = 4 seconds minimum per pose. If the user is already positioned, LEFT/RIGHT can complete in ~4-6 seconds

---

## 4. Auto-Skip Detection

### Search Results for Auto-Advance Patterns

| Pattern | Found? | Location | Details |
|---------|--------|----------|---------|
| `nextPose()` | Yes | `GuidedEnrollment.tsx` | Only called after validation + frame count check |
| `advancePose()` | No | — | Not present in codebase |
| `setTimeout()` | Yes | `GuidedEnrollment.tsx` | 3 uses: completeDelay (2s), totalTimeout (60s), idleTimeout (15s) |
| `setInterval()` | No | — | Not used |

### Can Poses Advance Without Validation? **NO**

The `nextPose()` function is ONLY called when:
```typescript
// GuidedEnrollment.tsx useEffect
if (acceptedCount >= framesPerPose) {
  timeout = setTimeout(() => {
    nextPose();
  }, completeDelayMs);
}
```

This means `nextPose()` requires **both**:
1. Backend validation returned `valid: true`
2. At least `framesPerPose` (4) frames accepted for the current pose

**However**, the `totalTimeout` (60s) CAN force-bypass this:
```typescript
totalTimeoutRef.current = setTimeout(() => {
  setCapturing(false);  // Stops capture timer
  // Does NOT call nextPose() — jumps to batch processing
}, totalTimeoutMs);
```

Then the `completeTimeout` fires after 2 seconds:
```typescript
completeTimeoutRef.current = setTimeout(() => {
  setCapturing(true);  // RESTARTS capture for NEXT pose
  handleCaptureComplete();
}, completeDelayMs);
```

**BUG**: After `totalTimeout` stops capturing, the `completeTimeout` (set when the last pose completed) can restart capturing for the NEXT pose even though the total timeout fired. This creates a race condition.

### File and Line Numbers

| File | Line | Pattern | Risk |
|------|------|---------|------|
| `GuidedEnrollment.tsx` | ~line 145 | `setTimeout(() => nextPose(), completeDelayMs)` | Safe — gated by frame count |
| `GuidedEnrollment.tsx` | ~line 165 | `setTimeout(() => { setCapturing(false); handleCaptureComplete(); }, totalTimeoutMs)` | **BUG** — can submit partial enrollment |
| `GuidedEnrollment.tsx` | ~line 155 | `setTimeout(() => { setCapturing(true); handleCaptureComplete(); }, completeDelayMs)` | **BUG** — race with totalTimeout |

---

## 5. Root Cause Summary

### Bug #1: Left/Right Appear Skipped
- **Root Cause**: CENTER pose accepts frames with ±15° yaw tolerance. Users who start turning early have their intermediate-angle frames accepted as CENTER. When LEFT/RIGHT pose begins, the user is already at the correct angle, so frames pass immediately.
- **Severity**: Medium — enrollment still works but with less diversity than intended
- **Affected File**: `face-ai/app/quality/pose_validator.py` line 68-75

### Bug #2: UP Pose Gets Stuck Forever
- **Root Cause**: Compound failure — the UP threshold (pitch ≤ -15°) requires significant head tilt, but achieving that tilt causes motion blur and face foreshortening that fail the quality gates. The smoothing factor (0.3) means the pitch value lags behind actual head position, requiring the user to hold the position for 3+ frames (3+ seconds at 1000ms interval).
- **Severity**: **Critical** — directly causes enrollment timeout and failure
- **Affected Files**: 
  - `face-ai/app/quality/pose_validator.py` line 57-59 (threshold)
  - `face-ai/app/quality/face_validator.py` lines 276, 292 (pitch computation + smoothing)

### Bug #3: "Batch enrollment returned no embeddings"
- **Root Cause**: When the 60-second `totalTimeout` fires, `handleCaptureComplete()` submits all collected frames to batch enrollment. If UP pose was stuck (0-1 accepted frames) and other poses had few frames, the total accepted frame count may be below the minimum (3) or all frames may fail the quality pipeline during batch processing (which runs quality checks AGAIN, independently of the real-time validation).
- **Severity**: **Critical** — enrollment completely fails
- **Affected Files**:
  - `src/components/enrollment/GuidedEnrollment.tsx` (totalTimeout handling)
  - `face-ai/app/enrollment/batch_processor.py` (double quality filtering)

### Bug #4: Double Quality Filtering
- **Root Cause**: Frames are validated in real-time via `/face/validate-frame` (using `pose_validator.py`), but then ALL frames are re-processed through the quality pipeline in `batch_processor.py` (using `quality_pipeline.py`). A frame that passed real-time validation can fail batch processing because:
  - The quality pipeline uses different thresholds (blur ≥ 30, face_score ≥ 0.50)
  - The pose label is stored as metadata but NOT re-validated — however, the quality pipeline doesn't check pose at all, only base quality
  - This means frames that passed both pose + quality in real-time can fail quality in batch
- **Severity**: High — reduces final embedding count
- **Affected Files**:
  - `face-ai/app/enrollment/batch_processor.py` lines 98-117
  - `face-ai/app/quality/quality_pipeline.py`

---

## 6. Recommended Fixes

### Fix #1: Relax UP/DOWN Thresholds
**File**: `face-ai/app/quality/pose_validator.py`

```python
# BEFORE:
if pose_label == "up":
    if pitch > -15:
# AFTER:
if pose_label == "up":
    if pitch > -10:  # More achievable threshold
```

```python
# BEFORE:
elif pose_label == "down":
    if pitch < 15:
# AFTER:
elif pose_label == "down":
    if pitch < 10:  # More achievable threshold
```

### Fix #2: Add Per-Pose Timeout with Graceful Advancement
**File**: `src/components/enrollment/GuidedEnrollment.tsx`

Add a per-pose timeout that advances to the next pose even if not enough frames are collected:

```typescript
// Add per-pose timeout (15 seconds per pose)
useEffect(() => {
  if (!capturing) return;
  const poseTimeout = setTimeout(() => {
    // Advance even if not enough frames
    if (currentPoseIndex < POSE_SEQUENCE.length - 1) {
      nextPose();
    }
  }, 15000);
  return () => clearTimeout(poseTimeout);
}, [currentPoseIndex, capturing]);
```

### Fix #3: Accept Partial Enrollment in Batch Processor
**File**: `src/services/guided-enrollment.service.ts`

Instead of failing when `embeddings_after_dedup === 0`, accept whatever embeddings are available:

```typescript
// In handleCaptureComplete, pass minimum required embeddings
const result = await batchEnroll({
  images: allFrames,
  poseLabels: allPoseLabels,
  minEmbeddings: 1,  // Accept even 1 embedding
});
```

### Fix #4: Show Live Feedback Per Pose
**File**: `src/components/enrollment/GuidedEnrollment.tsx`

Display the backend feedback to the user:

```typescript
// In doCapture():
if (validationResult.feedback) {
  setCurrentFeedback(validationResult.feedback);
}

// In JSX:
{currentFeedback && (
  <div className="text-sm text-yellow-400">
    {currentFeedback}
  </div>
)}
<div className="text-xs text-gray-400">
  Accepted: {poseAcceptedFrames[currentPose]?.length || 0} / {framesPerPose}
</div>
```

### Fix #5: Tighten CENTER Tolerance
**File**: `face-ai/app/quality/pose_validator.py`

```python
# BEFORE:
if abs(yaw) > 15:
# AFTER:
if abs(yaw) > 10:  # Tighter center zone
```

This prevents intermediate-angle frames from being accepted as CENTER.

### Fix #6: Remove Double Quality Filtering
**File**: `face-ai/app/enrollment/batch_processor.py`

Trust the real-time validation — skip quality pipeline for frames that already passed validation:

```python
# Skip quality pipeline for pre-validated frames
if pose_label in pre_validated_labels:
    quality_report.passed = True
```

---

## 7. Verification Checklist

- [ ] Pose progression is driven by validation results, NOT timers
- [ ] Minimum accepted frames enforced per pose (default: 4)
- [ ] Per-pose timeout prevents infinite stuck states (15s max)
- [ ] Live feedback displayed to user ("Turn further left", "Look higher")
- [ ] Accepted frame count shown ("Accepted: 3 / 4")
- [ ] UP/DOWN thresholds relaxed to ±10°
- [ ] CENTER tolerance tightened to ±10°
- [ ] Total timeout gracefully handles partial enrollment
- [ ] Batch processor trusts real-time validation results

---

## 8. Evidence Summary

| Symptom | Root Cause | File | Line |
|---------|-----------|------|------|
| Left/Right skipped | CENTER accepts ±15° yaw | `pose_validator.py` | 68-75 |
| UP stuck forever | pitch ≤ -15° too strict + quality gates compound | `pose_validator.py` | 57-59 |
| No embeddings | totalTimeout submits partial frames, batch re-filters | `GuidedEnrollment.tsx` + `batch_processor.py` | 165 + 98-117 |
| Race condition | completeTimeout can restart after totalTimeout | `GuidedEnrollment.tsx` | ~155 |

---

*Report generated by automated codebase audit on 2026-06-16*