"""
CityParking Face AI — Liveness: Texture Analyzer
==================================================
Detects presentation attacks (photos on screens) by analyzing
high-frequency texture patterns using FFT (Fast Fourier Transform).

Screens exhibit Moiré patterns — periodic interference between
the display pixel grid and the camera sensor grid. These appear
as characteristic high-frequency spikes in the frequency domain.
"""

import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

# Threshold: ratio of high-frequency energy to total energy
# Real faces: 0.02–0.10, Screen displays: 0.15–0.40
TEXTURE_THRESHOLD = 0.12


def compute_frequency_energy(image: np.ndarray) -> dict:
    """
    Analyze frequency domain energy distribution of the face region.

    Args:
        image: BGR image (face crop recommended)

    Returns:
        {
            "high_freq_ratio": float,
            "low_freq_energy": float,
            "high_freq_energy": float,
            "total_energy": float,
            "is_screen": bool,
            "confidence": float
        }
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Resize to standard size for consistent analysis
    gray = cv2.resize(gray, (128, 128))

    # Apply FFT
    f_transform = np.fft.fft2(gray.astype(np.float64))
    f_shift = np.fft.fftshift(f_transform)
    magnitude = np.abs(f_shift)

    h, w = magnitude.shape
    center_y, center_x = h // 2, w // 2

    # Define low-frequency region (center circle, radius = 20% of image)
    radius_low = int(min(h, w) * 0.20)
    # Define high-frequency region (outside 60% radius)
    radius_high = int(min(h, w) * 0.60)

    # Create masks
    y_grid, x_grid = np.ogrid[:h, :w]
    dist_from_center = np.sqrt((y_grid - center_y) ** 2 + (x_grid - center_x) ** 2)

    low_mask = dist_from_center <= radius_low
    high_mask = dist_from_center >= radius_high

    low_energy = float(np.sum(magnitude[low_mask] ** 2))
    high_energy = float(np.sum(magnitude[high_mask] ** 2))
    total_energy = float(np.sum(magnitude ** 2))

    if total_energy < 1e-10:
        return {
            "high_freq_ratio": 0.0,
            "low_freq_energy": 0.0,
            "high_freq_energy": 0.0,
            "total_energy": 0.0,
            "is_screen": False,
            "confidence": 0.5,
        }

    high_freq_ratio = high_energy / total_energy

    # Score: how likely this is a real face (higher = more likely real)
    # Real: low high_freq_ratio → high confidence
    # Screen: high high_freq_ratio → low confidence
    if high_freq_ratio < 0.05:
        confidence = 1.0
    elif high_freq_ratio < TEXTURE_THRESHOLD:
        # Linear interpolation between 0.05 and threshold
        confidence = 1.0 - (high_freq_ratio - 0.05) / (TEXTURE_THRESHOLD - 0.05) * 0.5
    elif high_freq_ratio < 0.25:
        confidence = 0.3
    else:
        confidence = 0.1

    return {
        "high_freq_ratio": round(high_freq_ratio, 6),
        "low_freq_energy": round(low_energy, 2),
        "high_freq_energy": round(high_energy, 2),
        "total_energy": round(total_energy, 2),
        "is_screen": high_freq_ratio >= TEXTURE_THRESHOLD,
        "confidence": round(confidence, 3),
    }


def analyze_texture(face_crop: np.ndarray) -> dict:
    """
    Run texture analysis on a face crop for liveness detection.

    Args:
        face_crop: BGR image of the face region (cropped from bbox)

    Returns:
        {
            "passed": bool,
            "confidence": float,
            "evidence": dict
        }
    """
    result = compute_frequency_energy(face_crop)

    return {
        "passed": not result["is_screen"],
        "confidence": result["confidence"],
        "evidence": result,
    }


def analyze_texture_multi_frame(face_crops: list[np.ndarray]) -> dict:
    """
    Run texture analysis across multiple frames and aggregate.

    Averaging across frames reduces noise and improves detection accuracy.

    Args:
        face_crops: List of BGR face crop images

    Returns:
        Aggregated result dict
    """
    if not face_crops:
        return {"passed": False, "confidence": 0.0, "evidence": {}}

    results = [compute_frequency_energy(crop) for crop in face_crops]

    avg_ratio = np.mean([r["high_freq_ratio"] for r in results])
    avg_confidence = np.mean([r["confidence"] for r in results])
    screen_votes = sum(1 for r in results if r["is_screen"])

    passed = screen_votes < len(results) / 2  # Majority vote

    return {
        "passed": passed,
        "confidence": round(float(avg_confidence), 3),
        "evidence": {
            "avg_high_freq_ratio": round(float(avg_ratio), 6),
            "screen_votes": screen_votes,
            "total_frames": len(results),
            "per_frame_ratios": [r["high_freq_ratio"] for r in results],
        },
    }
