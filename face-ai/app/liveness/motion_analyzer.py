"""
CityParking Face AI — Liveness: Motion Analyzer
=================================================
Analyzes inter-frame motion patterns to distinguish live faces
from static photos.

Live faces exhibit:
  - Micro-movements (breathing, swaying)
  - Non-rigid deformation (eyes blink, mouth moves independently)

Static photos exhibit:
  - Zero motion or rigid-body motion only
  - All landmarks translate/rotate together
"""

import numpy as np
import logging

logger = logging.getLogger(__name__)

# Minimum average landmark displacement (pixels) between consecutive frames
# to indicate life. Real faces typically show 0.5–5.0 px micro-motion.
MIN_MOTION_THRESHOLD = 0.3

# Maximum rigid motion ratio. If landmarks all move by nearly the same vector,
# it's likely a photo being moved, not a real face.
MAX_RIGID_RATIO = 0.90


def compute_landmark_motion(
    landmarks_prev: np.ndarray,
    landmarks_curr: np.ndarray,
) -> dict:
    """
    Compute motion statistics between two consecutive frames' landmarks.

    Args:
        landmarks_prev: 5-point landmarks of previous frame (5, 2)
        landmarks_curr: 5-point landmarks of current frame (5, 2)

    Returns:
        {
            "mean_displacement": float,     # Average displacement across landmarks
            "max_displacement": float,      # Maximum single-landmark displacement
            "min_displacement": float,      # Minimum single-landmark displacement
            "displacement_std": float,      # Standard deviation of displacements
            "rigid_ratio": float,           # How uniform the motion is (1.0 = perfectly rigid)
            "displacements": list[float],   # Per-landmark displacements
        }
    """
    if landmarks_prev is None or landmarks_curr is None:
        return {
            "mean_displacement": 0.0, "max_displacement": 0.0,
            "min_displacement": 0.0, "displacement_std": 0.0,
            "rigid_ratio": 1.0, "displacements": [],
        }

    prev = np.array(landmarks_prev, dtype=np.float64)
    curr = np.array(landmarks_curr, dtype=np.float64)

    if prev.shape != (5, 2) or curr.shape != (5, 2):
        return {
            "mean_displacement": 0.0, "max_displacement": 0.0,
            "min_displacement": 0.0, "displacement_std": 0.0,
            "rigid_ratio": 1.0, "displacements": [],
        }

    # Per-landmark displacement vectors
    deltas = curr - prev  # (5, 2) — dx, dy for each landmark
    displacements = np.linalg.norm(deltas, axis=1)  # (5,) — magnitude

    mean_disp = float(np.mean(displacements))
    max_disp = float(np.max(displacements))
    min_disp = float(np.min(displacements))
    std_disp = float(np.std(displacements))

    # Rigid ratio: how similar are the motion vectors?
    # If all landmarks move by the same vector, it's rigid motion (photo being moved).
    # Compute pairwise angles between delta vectors.
    if mean_disp > 0.1:
        # Compute mean delta vector
        mean_delta = np.mean(deltas, axis=0)
        mean_delta_norm = np.linalg.norm(mean_delta)

        if mean_delta_norm > 1e-6:
            # For each landmark, compute how close its delta is to the mean delta
            cosines = []
            for d in deltas:
                d_norm = np.linalg.norm(d)
                if d_norm > 1e-6:
                    cos_sim = float(np.dot(d, mean_delta) / (d_norm * mean_delta_norm))
                    cosines.append(max(-1.0, min(1.0, cos_sim)))
            rigid_ratio = float(np.mean(cosines)) if cosines else 1.0
        else:
            rigid_ratio = 1.0
    else:
        # Very little motion — can't determine rigidity
        rigid_ratio = 0.5

    return {
        "mean_displacement": round(mean_disp, 4),
        "max_displacement": round(max_disp, 4),
        "min_displacement": round(min_disp, 4),
        "displacement_std": round(std_disp, 4),
        "rigid_ratio": round(rigid_ratio, 4),
        "displacements": [round(float(d), 4) for d in displacements],
    }


def analyze_motion(landmarks_sequence: list[np.ndarray]) -> dict:
    """
    Analyze motion across a sequence of landmark frames.

    Checks for:
    1. Presence of micro-motion (real faces move slightly)
    2. Non-rigid deformation (different parts move differently)

    Args:
        landmarks_sequence: List of 5-point landmark arrays, one per frame

    Returns:
        {
            "passed": bool,
            "confidence": float,
            "evidence": {
                "avg_displacement": float,
                "has_motion": bool,
                "is_rigid": bool,
                "avg_rigid_ratio": float,
                "frame_pairs_analyzed": int,
            }
        }
    """
    if len(landmarks_sequence) < 2:
        return {
            "passed": False,
            "confidence": 0.0,
            "evidence": {
                "avg_displacement": 0.0,
                "has_motion": False,
                "is_rigid": True,
                "avg_rigid_ratio": 1.0,
                "frame_pairs_analyzed": 0,
            },
        }

    motions = []
    for i in range(1, len(landmarks_sequence)):
        prev = landmarks_sequence[i - 1]
        curr = landmarks_sequence[i]
        if prev is not None and curr is not None:
            motion = compute_landmark_motion(prev, curr)
            motions.append(motion)

    if not motions:
        return {
            "passed": False,
            "confidence": 0.0,
            "evidence": {"frame_pairs_analyzed": 0},
        }

    avg_displacement = np.mean([m["mean_displacement"] for m in motions])
    avg_rigid_ratio = np.mean([m["rigid_ratio"] for m in motions])
    max_displacement = max(m["max_displacement"] for m in motions)

    has_motion = avg_displacement >= MIN_MOTION_THRESHOLD
    is_rigid = avg_rigid_ratio >= MAX_RIGID_RATIO

    # Decision: need motion AND it should be non-rigid
    if has_motion and not is_rigid:
        # Strong evidence of live face
        confidence = min(1.0, 0.5 + avg_displacement / 5.0)
    elif has_motion and is_rigid:
        # Motion but rigid — could be a photo being moved
        confidence = 0.3
    elif not has_motion:
        # No motion — suspicious but could be a still person
        confidence = 0.2
    else:
        confidence = 0.1

    passed = has_motion and not is_rigid

    return {
        "passed": passed,
        "confidence": round(float(confidence), 3),
        "evidence": {
            "avg_displacement": round(float(avg_displacement), 4),
            "max_displacement": round(float(max_displacement), 4),
            "has_motion": has_motion,
            "is_rigid": is_rigid,
            "avg_rigid_ratio": round(float(avg_rigid_ratio), 4),
            "frame_pairs_analyzed": len(motions),
        },
    }
