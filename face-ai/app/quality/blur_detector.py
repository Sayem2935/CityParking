"""
CityParking Face AI — Quality Pipeline: Blur Detector
=======================================================
Laplacian variance-based blur detection for enrollment frames.
Higher variance = sharper image.
"""

import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

# Minimum Laplacian variance for a frame to be considered sharp
DEFAULT_BLUR_THRESHOLD = 80.0


def compute_blur_score(image: np.ndarray) -> float:
    """
    Compute blur score using Laplacian variance.

    The Laplacian highlights regions of rapid intensity change (edges).
    A blurry image has few edges, so the variance of the Laplacian is low.
    A sharp image has many edges, so the variance is high.

    Args:
        image: BGR image as numpy array (OpenCV format)

    Returns:
        Laplacian variance (float). Higher = sharper.
        Typical ranges:
            - Very blurry: < 30
            - Blurry: 30–80
            - Acceptable: 80–200
            - Sharp: > 200
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    variance = float(laplacian.var())
    return variance


def compute_blur_score_from_bytes(image_bytes: bytes) -> float:
    """
    Compute blur score from raw image bytes.

    Args:
        image_bytes: JPEG/PNG image bytes

    Returns:
        Laplacian variance (float)
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image for blur detection")
    return compute_blur_score(img)


def is_sharp(image: np.ndarray, threshold: float = DEFAULT_BLUR_THRESHOLD) -> tuple[bool, float]:
    """
    Check if an image is sharp enough for enrollment.

    Args:
        image: BGR image as numpy array
        threshold: Minimum Laplacian variance

    Returns:
        Tuple of (passed: bool, blur_score: float)
    """
    score = compute_blur_score(image)
    return score >= threshold, score
