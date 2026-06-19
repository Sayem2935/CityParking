"""
CityParking Face AI — Pose Validator
======================================================
Validates a face frame against a target pose label and generates
user-friendly real-time feedback with full metrics.

Phase 1: Relaxed UP/DOWN thresholds (±10°), tightened CENTER (±10° yaw)
Phase 2: Rich feedback with all metrics for frontend display
"""

# ── Thresholds ──────────────────────────────────────────
# CENTER: tightened yaw to ±10° so CENTER doesn't accept side-turned faces
# UP/DOWN: relaxed from ±15° to ±10° so users don't get stuck
# LEFT/RIGHT: minimum 12° yaw to register as a side pose
_YAW_CENTER_MAX = 10.0          # ±10° for CENTER
_YAW_SIDE_MIN = 12.0            # min 12° to count as LEFT/RIGHT
_PITCH_UP_THRESHOLD = -10.0     # ≤ -10° for UP  (was -15°)
_PITCH_DOWN_THRESHOLD = 10.0    # ≥ 10° for DOWN  (was 15°)
_PITCH_CENTER_MAX = 12.0        # ±12° for CENTER

# Quality thresholds
_MIN_FACE_SCORE = 0.50
_MIN_BLUR_SCORE = 30.0
_MIN_FACE_AREA_RATIO = 0.02


def validate_frame_pose(
    pose_label: str,
    head_pose: dict,
    blur_score: float,
    face_score: float,
    face_area_ratio: float,
    bbox: list[int]
) -> dict:
    """
    Validates frame metrics against specific pose requirements.
    Returns validation status, user-friendly feedback, and all raw metrics.

    Response shape (Phase 2):
    {
        valid: bool,
        feedback: str,
        reasons: list[str],
        poseDetected: str,
        yaw: float,
        pitch: float,
        blurScore: float,
        faceScore: float,
        faceAreaRatio: float
    }
    """
    yaw = head_pose.get("yaw", 0.0)
    pitch = head_pose.get("pitch", 0.0)

    reasons = []
    feedback = "Hold still"
    valid = True
    pose_detected = _detect_current_pose(yaw, pitch)

    # ── 1. Base Quality Checks ──────────────────────────
    if face_score < _MIN_FACE_SCORE:
        valid = False
        reasons.append("low_face_score")
        feedback = "Face not clearly visible — move to better lighting"

    elif blur_score < _MIN_BLUR_SCORE:
        valid = False
        reasons.append("blur_score_too_low")
        feedback = "Image too blurry — hold still"

    elif face_area_ratio < _MIN_FACE_AREA_RATIO:
        valid = False
        reasons.append("face_too_small")
        feedback = "Move closer to camera"

    # ── 2. Pose-Specific Checks ─────────────────────────
    elif pose_label == "left":
        if yaw > -_YAW_SIDE_MIN:
            valid = False
            reasons.append("insufficient_yaw_left")
            feedback = "Turn further left"
        else:
            feedback = "Good — holding left"

    elif pose_label == "right":
        if yaw < _YAW_SIDE_MIN:
            valid = False
            reasons.append("insufficient_yaw_right")
            feedback = "Turn further right"
        else:
            feedback = "Good — holding right"

    elif pose_label == "up":
        if pitch > _PITCH_UP_THRESHOLD:
            valid = False
            reasons.append("insufficient_pitch_up")
            feedback = "Look higher"
        else:
            feedback = "Good — holding up"

    elif pose_label == "down":
        if pitch < _PITCH_DOWN_THRESHOLD:
            valid = False
            reasons.append("insufficient_pitch_down")
            feedback = "Look lower"
        else:
            feedback = "Good — holding down"

    else:
        # center, blink, smile — face should be roughly frontal
        if abs(yaw) > _YAW_CENTER_MAX:
            valid = False
            reasons.append("excessive_yaw")
            feedback = "Face not centered — look straight at camera"
        elif abs(pitch) > _PITCH_CENTER_MAX:
            valid = False
            reasons.append("excessive_pitch")
            feedback = "Keep your head level"
        else:
            if pose_label == "blink":
                feedback = "Blink naturally"
            elif pose_label == "smile":
                feedback = "Smile naturally"
            else:
                feedback = "Good — holding center"

    return {
        "valid": valid,
        "feedback": feedback,
        "reasons": reasons,
        "poseDetected": pose_detected,
        "yaw": round(yaw, 2),
        "pitch": round(pitch, 2),
        "blurScore": round(blur_score, 2),
        "faceScore": round(face_score, 2),
        "faceAreaRatio": round(face_area_ratio, 4),
    }


def _detect_current_pose(yaw: float, pitch: float) -> str:
    """Infer the current pose from yaw/pitch values."""
    if abs(yaw) <= _YAW_CENTER_MAX and abs(pitch) <= _PITCH_CENTER_MAX:
        return "center"
    if yaw < -_YAW_SIDE_MIN:
        return "left"
    if yaw > _YAW_SIDE_MIN:
        return "right"
    if pitch < _PITCH_UP_THRESHOLD:
        return "up"
    if pitch > _PITCH_DOWN_THRESHOLD:
        return "down"
    return "transitioning"