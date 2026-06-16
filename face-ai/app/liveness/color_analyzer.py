"""
CityParking Face AI — Liveness: Color Analyzer
================================================
Analyzes skin color distribution in YCbCr color space
to distinguish real skin from printed photos and screens.

Real skin has a characteristic cluster in CbCr space.
Printed photos and screen displays have different color
response curves due to ink/backlight differences.
"""

import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

# Skin color model in YCbCr space (empirical values from literature)
# Chai & Ngan, "Face segmentation using skin-color map in videophone applications" (1999)
SKIN_CB_RANGE = (77, 127)   # Cb channel range for skin
SKIN_CR_RANGE = (133, 173)  # Cr channel range for skin

# Minimum percentage of face pixels that should fall within skin color range
MIN_SKIN_RATIO = 0.30

# Mahalanobis distance threshold for skin color model
MAX_MAHALANOBIS_DIST = 4.0


def compute_skin_color_metrics(face_crop: np.ndarray) -> dict:
    """
    Analyze face crop in YCbCr color space for skin color consistency.

    Args:
        face_crop: BGR image of the face region

    Returns:
        {
            "skin_ratio": float,        # Fraction of pixels within skin color range
            "cb_mean": float,           # Mean Cb value
            "cr_mean": float,           # Mean Cr value
            "cb_std": float,            # Cb standard deviation
            "cr_std": float,            # Cr standard deviation
            "mahalanobis_dist": float,  # Distance to skin color model center
            "is_skin": bool,
            "confidence": float
        }
    """
    if face_crop is None or face_crop.size == 0:
        return {
            "skin_ratio": 0.0, "cb_mean": 0.0, "cr_mean": 0.0,
            "cb_std": 0.0, "cr_std": 0.0, "mahalanobis_dist": 999.0,
            "is_skin": False, "confidence": 0.0,
        }

    # Convert to YCbCr
    ycbcr = cv2.cvtColor(face_crop, cv2.COLOR_BGR2YCrCb)
    # OpenCV uses YCrCb order, so index 1=Cr, 2=Cb
    cr_channel = ycbcr[:, :, 1].astype(np.float64)
    cb_channel = ycbcr[:, :, 2].astype(np.float64)

    total_pixels = cr_channel.size
    if total_pixels == 0:
        return {
            "skin_ratio": 0.0, "cb_mean": 0.0, "cr_mean": 0.0,
            "cb_std": 0.0, "cr_std": 0.0, "mahalanobis_dist": 999.0,
            "is_skin": False, "confidence": 0.0,
        }

    # Count pixels within skin color range
    skin_mask = (
        (cb_channel >= SKIN_CB_RANGE[0]) & (cb_channel <= SKIN_CB_RANGE[1]) &
        (cr_channel >= SKIN_CR_RANGE[0]) & (cr_channel <= SKIN_CR_RANGE[1])
    )
    skin_pixels = int(np.sum(skin_mask))
    skin_ratio = skin_pixels / total_pixels

    # Compute statistics
    cb_mean = float(np.mean(cb_channel))
    cr_mean = float(np.mean(cr_channel))
    cb_std = float(np.std(cb_channel))
    cr_std = float(np.std(cr_channel))

    # Mahalanobis-like distance to skin color center
    skin_center_cb = (SKIN_CB_RANGE[0] + SKIN_CB_RANGE[1]) / 2.0  # 102
    skin_center_cr = (SKIN_CR_RANGE[0] + SKIN_CR_RANGE[1]) / 2.0  # 153
    skin_range_cb = (SKIN_CB_RANGE[1] - SKIN_CB_RANGE[0]) / 2.0   # 25
    skin_range_cr = (SKIN_CR_RANGE[1] - SKIN_CR_RANGE[0]) / 2.0   # 20

    if skin_range_cb > 0 and skin_range_cr > 0:
        dist = np.sqrt(
            ((cb_mean - skin_center_cb) / skin_range_cb) ** 2 +
            ((cr_mean - skin_center_cr) / skin_range_cr) ** 2
        )
    else:
        dist = 999.0

    mahalanobis_dist = float(dist)

    # Determine if skin
    is_skin = skin_ratio >= MIN_SKIN_RATIO and mahalanobis_dist <= MAX_MAHALANOBIS_DIST

    # Confidence scoring
    if is_skin:
        # Higher skin ratio and lower distance = higher confidence
        ratio_score = min(skin_ratio / 0.60, 1.0)  # Normalize: 0.60+ → 1.0
        dist_score = max(0.0, 1.0 - mahalanobis_dist / MAX_MAHALANOBIS_DIST)
        confidence = 0.6 * ratio_score + 0.4 * dist_score
    else:
        confidence = 0.2 if skin_ratio > 0.15 else 0.05

    return {
        "skin_ratio": round(skin_ratio, 4),
        "cb_mean": round(cb_mean, 2),
        "cr_mean": round(cr_mean, 2),
        "cb_std": round(cb_std, 2),
        "cr_std": round(cr_std, 2),
        "mahalanobis_dist": round(mahalanobis_dist, 4),
        "is_skin": is_skin,
        "confidence": round(float(confidence), 3),
    }


def analyze_color(face_crop: np.ndarray) -> dict:
    """
    Run color analysis on a face crop for liveness detection.

    Args:
        face_crop: BGR image of the face region

    Returns:
        {"passed": bool, "confidence": float, "evidence": dict}
    """
    metrics = compute_skin_color_metrics(face_crop)
    return {
        "passed": metrics["is_skin"],
        "confidence": metrics["confidence"],
        "evidence": metrics,
    }


def analyze_color_multi_frame(face_crops: list[np.ndarray]) -> dict:
    """
    Run color analysis across multiple frames and aggregate.

    Args:
        face_crops: List of BGR face crop images

    Returns:
        Aggregated result dict
    """
    if not face_crops:
        return {"passed": False, "confidence": 0.0, "evidence": {}}

    results = [compute_skin_color_metrics(crop) for crop in face_crops]
    avg_confidence = np.mean([r["confidence"] for r in results])
    skin_votes = sum(1 for r in results if r["is_skin"])
    passed = skin_votes >= len(results) / 2

    return {
        "passed": passed,
        "confidence": round(float(avg_confidence), 3),
        "evidence": {
            "skin_votes": skin_votes,
            "total_frames": len(results),
            "avg_skin_ratio": round(float(np.mean([r["skin_ratio"] for r in results])), 4),
            "avg_mahalanobis": round(float(np.mean([r["mahalanobis_dist"] for r in results])), 4),
        },
    }
