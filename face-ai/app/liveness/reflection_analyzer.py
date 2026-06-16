"""
CityParking Face AI — Liveness: Reflection Analyzer
=====================================================
Analyzes specular reflections on the face surface to distinguish
real skin from glossy photos and screen surfaces.

Real skin: smooth, diffuse reflections from natural skin texture.
Glossy photo/screen: sharp specular highlight spots.
"""

import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

# Percentage of very bright pixels (specular highlights)
# Real face: typically < 2% very bright pixels on forehead/cheeks
# Glossy photo: 5–15% due to flat reflective surface
SPECULAR_THRESHOLD = 0.05  # 5% of face pixels being "hot"
BRIGHT_PIXEL_THRESHOLD = 240  # Pixel value threshold for "very bright"


def compute_reflection_metrics(face_crop: np.ndarray) -> dict:
    """
    Analyze specular reflections in the face region.

    Args:
        face_crop: BGR image of the face region

    Returns:
        {
            "bright_ratio": float,       # Fraction of very bright pixels
            "highlight_count": int,      # Number of specular highlight blobs
            "highlight_sharpness": float, # Average gradient magnitude at highlights
            "is_glossy": bool,
            "confidence": float
        }
    """
    if face_crop is None or face_crop.size == 0:
        return {
            "bright_ratio": 0.0, "highlight_count": 0,
            "highlight_sharpness": 0.0, "is_glossy": False,
            "confidence": 0.5,
        }

    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    total_pixels = gray.size

    # Find very bright pixels (specular highlights)
    bright_mask = gray >= BRIGHT_PIXEL_THRESHOLD
    bright_count = int(np.sum(bright_mask))
    bright_ratio = bright_count / total_pixels if total_pixels > 0 else 0.0

    # Count distinct highlight blobs
    bright_binary = bright_mask.astype(np.uint8) * 255
    # Dilate to merge nearby bright spots
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    bright_dilated = cv2.dilate(bright_binary, kernel, iterations=1)
    contours, _ = cv2.findContours(bright_dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    highlight_count = len(contours)

    # Compute gradient magnitude at highlight locations
    # Sharp specular highlights have high gradient (abrupt brightness change)
    grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    gradient_mag = np.sqrt(grad_x ** 2 + grad_y ** 2)

    if bright_count > 0:
        highlight_sharpness = float(np.mean(gradient_mag[bright_mask]))
    else:
        highlight_sharpness = 0.0

    # Decision: glossy surfaces have higher bright ratio AND sharper highlights
    is_glossy = bright_ratio >= SPECULAR_THRESHOLD and highlight_sharpness > 50.0

    # Confidence: higher if clearly not glossy
    if bright_ratio < 0.01:
        confidence = 1.0  # Very few bright spots — natural skin
    elif bright_ratio < SPECULAR_THRESHOLD:
        confidence = 0.8
    elif bright_ratio < 0.10:
        confidence = 0.4
    else:
        confidence = 0.1

    return {
        "bright_ratio": round(bright_ratio, 4),
        "highlight_count": highlight_count,
        "highlight_sharpness": round(highlight_sharpness, 2),
        "is_glossy": is_glossy,
        "confidence": round(float(confidence), 3),
    }


def analyze_reflection(face_crop: np.ndarray) -> dict:
    """
    Run reflection analysis on a face crop for liveness detection.

    Args:
        face_crop: BGR image of the face region

    Returns:
        {"passed": bool, "confidence": float, "evidence": dict}
    """
    metrics = compute_reflection_metrics(face_crop)
    return {
        "passed": not metrics["is_glossy"],
        "confidence": metrics["confidence"],
        "evidence": metrics,
    }


def analyze_reflection_multi_frame(face_crops: list[np.ndarray]) -> dict:
    """
    Run reflection analysis across multiple frames and aggregate.

    Args:
        face_crops: List of BGR face crop images

    Returns:
        Aggregated result dict
    """
    if not face_crops:
        return {"passed": False, "confidence": 0.0, "evidence": {}}

    results = [compute_reflection_metrics(crop) for crop in face_crops]
    avg_confidence = np.mean([r["confidence"] for r in results])
    glossy_votes = sum(1 for r in results if r["is_glossy"])
    passed = glossy_votes < len(results) / 2

    return {
        "passed": passed,
        "confidence": round(float(avg_confidence), 3),
        "evidence": {
            "glossy_votes": glossy_votes,
            "total_frames": len(results),
            "avg_bright_ratio": round(float(np.mean([r["bright_ratio"] for r in results])), 4),
        },
    }
