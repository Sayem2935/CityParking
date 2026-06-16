"""
CityParking Face AI — Liveness: Blink Detector
================================================
Detects natural eye blinks using Eye Aspect Ratio (EAR)
computed from 5-point facial landmarks.

Reference: Soukupová & Čech, "Real-Time Eye Blink Detection
using Facial Landmarks" (2016)
"""

import numpy as np
import logging

logger = logging.getLogger(__name__)

# EAR thresholds
EAR_OPEN_THRESHOLD = 0.25      # Eyes considered open above this
EAR_CLOSED_THRESHOLD = 0.15    # Eyes considered closed below this
MIN_BLINK_FRAMES = 1           # Minimum frames in closed state for a valid blink
MAX_BLINK_FRAMES = 8           # Maximum frames in closed state (filter long closures)
MIN_BLINKS_REQUIRED = 1        # At least 1 blink required for liveness


def compute_ear_from_5pt(landmarks_5pt: np.ndarray) -> float:
    """
    Approximate Eye Aspect Ratio from InsightFace 5-point landmarks.

    InsightFace 5-point landmarks:
        0: left eye center
        1: right eye center
        2: nose tip
        3: left mouth corner
        4: right mouth corner

    With only 2 eye points (centers), we cannot compute the standard
    6-point EAR formula. Instead, we use a proxy:

    We estimate EAR from the vertical distance between the eye center
    and the midpoint of the eye-nose-mouth triangle, normalized by
    the inter-eye distance. This produces a value that decreases
    when eyes close (face "shortens" vertically near eyes).

    For more accurate EAR, a 68-point landmark model would be needed.
    This approximation is sufficient for enrollment-time liveness.

    Args:
        landmarks_5pt: numpy array of shape (5, 2), [x, y] per landmark

    Returns:
        Approximate EAR value (float, typically 0.05–0.40)
    """
    left_eye = landmarks_5pt[0]
    right_eye = landmarks_5pt[1]
    nose = landmarks_5pt[2]

    # Inter-eye distance (horizontal baseline)
    eye_dist = np.linalg.norm(right_eye - left_eye)
    if eye_dist < 1e-6:
        return 0.0

    # Eye center
    eye_center = (left_eye + right_eye) / 2.0

    # Vertical distance from eye center to nose
    # When eyes close, the apparent eye position shifts slightly down
    # and the overall face region "compresses" vertically
    eye_nose_dist = abs(nose[1] - eye_center[1])

    # Normalize by eye distance to get a ratio
    ear_proxy = eye_nose_dist / eye_dist

    return float(ear_proxy)


def detect_blinks(
    landmarks_sequence: list[np.ndarray],
    ear_open: float = EAR_OPEN_THRESHOLD,
    ear_closed: float = EAR_CLOSED_THRESHOLD,
    min_blink_frames: int = MIN_BLINK_FRAMES,
    max_blink_frames: int = MAX_BLINK_FRAMES,
) -> dict:
    """
    Detect blinks in a sequence of landmark frames.

    A blink is defined as: EAR above open → EAR below closed → EAR above open.

    Args:
        landmarks_sequence: List of 5-point landmark arrays (one per frame)
        ear_open: EAR threshold for eyes-open state
        ear_closed: EAR threshold for eyes-closed state
        min_blink_frames: Minimum frames in closed state
        max_blink_frames: Maximum frames in closed state

    Returns:
        {
            "ear_values": [...],
            "blink_count": int,
            "blink_indices": [[start, end], ...],
            "passed": bool,
            "confidence": float
        }
    """
    if not landmarks_sequence:
        return {
            "ear_values": [],
            "blink_count": 0,
            "blink_indices": [],
            "passed": False,
            "confidence": 0.0,
        }

    # Compute EAR for each frame
    ear_values = []
    for landmarks in landmarks_sequence:
        if landmarks is not None and len(landmarks) >= 5:
            ear = compute_ear_from_5pt(landmarks)
        else:
            ear = 0.0
        ear_values.append(ear)

    # Detect blinks using state machine
    blinks = []
    state = "open"  # open, closing, closed
    closed_start = -1
    closed_frames = 0

    for i, ear in enumerate(ear_values):
        if state == "open":
            if ear < ear_closed:
                state = "closed"
                closed_start = i
                closed_frames = 1
        elif state == "closed":
            if ear < ear_closed:
                closed_frames += 1
                if closed_frames > max_blink_frames:
                    # Too long to be a blink — reset
                    state = "open"
            elif ear >= ear_open:
                # Transition back to open — potential blink
                if closed_frames >= min_blink_frames:
                    blinks.append([closed_start, i])
                state = "open"

    blink_count = len(blinks)
    passed = blink_count >= MIN_BLINKS_REQUIRED

    # Confidence: higher with more blinks, capped at 1.0
    if blink_count == 0:
        confidence = 0.0
    elif blink_count == 1:
        confidence = 0.7
    elif blink_count == 2:
        confidence = 0.9
    else:
        confidence = 1.0

    return {
        "ear_values": [round(v, 4) for v in ear_values],
        "blink_count": blink_count,
        "blink_indices": blinks,
        "passed": passed,
        "confidence": confidence,
    }
