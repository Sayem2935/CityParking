"""
CityParking Face AI — Liveness: Fusion Engine
===============================================
Combines all liveness signals into a single weighted score.

Signals and weights:
  - Blink detection:       30%
  - Texture analysis:      25%
  - Color analysis:        15%
  - Motion analysis:       20%
  - Reflection analysis:   10%

Decision threshold: 0.60
"""

import logging
from typing import Optional

import cv2
import numpy as np

from app.liveness.blink_detector import detect_blinks
from app.liveness.texture_analyzer import analyze_texture_multi_frame
from app.liveness.color_analyzer import analyze_color_multi_frame
from app.liveness.motion_analyzer import analyze_motion
from app.liveness.reflection_analyzer import analyze_reflection_multi_frame

logger = logging.getLogger(__name__)

# Signal weights (must sum to 1.0)
WEIGHTS = {
    "blink": 0.30,
    "texture": 0.25,
    "color": 0.15,
    "motion": 0.20,
    "reflection": 0.10,
}

# Overall liveness threshold
LIVENESS_THRESHOLD = 0.60


def extract_face_crops(
    frames: list[np.ndarray],
    bboxes: list[list[int]],
) -> list[np.ndarray]:
    """
    Extract face crops from frames using bounding boxes.

    Args:
        frames: List of BGR images
        bboxes: List of [x, y, w, h] bounding boxes

    Returns:
        List of cropped face images
    """
    crops = []
    for frame, bbox in zip(frames, bboxes):
        if frame is None or bbox is None or len(bbox) < 4:
            continue
        x, y, w, h = bbox
        # Add margin (10%)
        margin_x = int(w * 0.1)
        margin_y = int(h * 0.1)
        x1 = max(0, x - margin_x)
        y1 = max(0, y - margin_y)
        x2 = min(frame.shape[1], x + w + margin_x)
        y2 = min(frame.shape[0], y + h + margin_y)

        crop = frame[y1:y2, x1:x2]
        if crop.size > 0:
            crops.append(crop)
    return crops


def run_liveness_analysis(
    frames: list[np.ndarray],
    landmarks_sequence: list[Optional[np.ndarray]],
    bboxes: list[list[int]],
    weights: Optional[dict] = None,
    threshold: float = LIVENESS_THRESHOLD,
) -> dict:
    """
    Run the complete liveness analysis pipeline.

    Args:
        frames: List of BGR images (decoded frames from enrollment session)
        landmarks_sequence: List of 5-point landmark arrays (one per frame)
        bboxes: List of [x, y, w, h] bounding boxes (one per frame)
        weights: Optional custom weights (default: WEIGHTS)
        threshold: Liveness score threshold (default: 0.60)

    Returns:
        {
            "live": bool,
            "liveness_score": float,
            "threshold": float,
            "checks": {
                "blink": {"passed": bool, "confidence": float, "weight": float, ...},
                "texture": {"passed": bool, "confidence": float, "weight": float, ...},
                "color": {"passed": bool, "confidence": float, "weight": float, ...},
                "motion": {"passed": bool, "confidence": float, "weight": float, ...},
                "reflection": {"passed": bool, "confidence": float, "weight": float, ...},
            },
            "weighted_scores": {
                "blink": float,
                "texture": float,
                "color": float,
                "motion": float,
                "reflection": float,
            }
        }
    """
    if weights is None:
        weights = WEIGHTS

    # Extract face crops for texture/color/reflection analysis
    face_crops = extract_face_crops(frames, bboxes)

    # Filter valid landmarks
    valid_landmarks = [
        lm for lm in landmarks_sequence
        if lm is not None and len(lm) >= 5
    ]

    # ── Run individual checks ──────────────────────────────────

    # 1. Blink detection
    blink_result = detect_blinks(valid_landmarks)
    blink_check = {
        "passed": blink_result["passed"],
        "confidence": blink_result["confidence"],
        "weight": weights["blink"],
        "blink_count": blink_result["blink_count"],
    }

    # 2. Texture analysis (Moiré/FFT)
    if face_crops:
        # Sample up to 10 frames for efficiency
        sampled_crops = face_crops[::max(1, len(face_crops) // 10)][:10]
        texture_result = analyze_texture_multi_frame(sampled_crops)
    else:
        texture_result = {"passed": False, "confidence": 0.0, "evidence": {}}
    texture_check = {
        "passed": texture_result["passed"],
        "confidence": texture_result["confidence"],
        "weight": weights["texture"],
    }

    # 3. Color analysis (YCbCr)
    if face_crops:
        sampled_crops = face_crops[::max(1, len(face_crops) // 10)][:10]
        color_result = analyze_color_multi_frame(sampled_crops)
    else:
        color_result = {"passed": False, "confidence": 0.0, "evidence": {}}
    color_check = {
        "passed": color_result["passed"],
        "confidence": color_result["confidence"],
        "weight": weights["color"],
    }

    # 4. Motion analysis (landmark displacement)
    motion_result = analyze_motion(valid_landmarks)
    motion_check = {
        "passed": motion_result["passed"],
        "confidence": motion_result["confidence"],
        "weight": weights["motion"],
    }

    # 5. Reflection analysis (specular highlights)
    if face_crops:
        sampled_crops = face_crops[::max(1, len(face_crops) // 10)][:10]
        reflection_result = analyze_reflection_multi_frame(sampled_crops)
    else:
        reflection_result = {"passed": False, "confidence": 0.0, "evidence": {}}
    reflection_check = {
        "passed": reflection_result["passed"],
        "confidence": reflection_result["confidence"],
        "weight": weights["reflection"],
    }

    # ── Compute weighted fusion ────────────────────────────────

    weighted_scores = {
        "blink": weights["blink"] * blink_check["confidence"],
        "texture": weights["texture"] * texture_check["confidence"],
        "color": weights["color"] * color_check["confidence"],
        "motion": weights["motion"] * motion_check["confidence"],
        "reflection": weights["reflection"] * reflection_check["confidence"],
    }

    liveness_score = sum(weighted_scores.values())
    live = liveness_score >= threshold

    logger.info(
        "Liveness analysis: score=%.3f, threshold=%.2f, live=%s "
        "(blink=%.2f, texture=%.2f, color=%.2f, motion=%.2f, reflection=%.2f)",
        liveness_score, threshold, live,
        weighted_scores["blink"], weighted_scores["texture"],
        weighted_scores["color"], weighted_scores["motion"],
        weighted_scores["reflection"],
    )

    return {
        "live": live,
        "liveness_score": round(liveness_score, 4),
        "threshold": threshold,
        "checks": {
            "blink": blink_check,
            "texture": texture_check,
            "color": color_check,
            "motion": motion_check,
            "reflection": reflection_check,
        },
        "weighted_scores": {k: round(v, 4) for k, v in weighted_scores.items()},
    }
