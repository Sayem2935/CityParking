"""
CityParking Face AI — Quality Pipeline: Orchestrator
======================================================
Runs all quality checks on a single frame and returns
a consolidated quality report.
"""

import cv2
import numpy as np
import logging
import time

from app.quality.blur_detector import compute_blur_score, DEFAULT_BLUR_THRESHOLD
from app.quality.face_validator import (
    validate_face_count,
    validate_face_score,
    validate_face_size,
    validate_landmarks_visible,
    validate_head_pose,
    estimate_head_pose,
    get_landmarks_5pt,
    MIN_FACE_SCORE,
    MIN_FACE_AREA_RATIO,
)

logger = logging.getLogger(__name__)


class QualityReport:
    """Result of running the full quality pipeline on a single frame."""

    def __init__(self):
        self.passed: bool = False
        self.rejection_reason: str | None = None
        self.blur_score: float = 0.0
        self.face_score: float = 0.0
        self.face_area_ratio: float = 0.0
        self.bbox: list[int] = []
        self.landmarks_5pt: list[list[float]] = []
        self.head_pose: dict = {"yaw": 0.0, "pitch": 0.0, "roll": 0.0}
        self.processing_time_ms: float = 0.0

    def to_dict(self) -> dict:
        return {
            "passed": self.passed,
            "rejection_reason": self.rejection_reason,
            "blur_score": round(self.blur_score, 2),
            "face_score": round(self.face_score, 4),
            "face_area_ratio": round(self.face_area_ratio, 4),
            "bbox": self.bbox,
            "landmarks_5pt": self.landmarks_5pt,
            "head_pose": self.head_pose,
            "processing_time_ms": round(self.processing_time_ms, 2),
        }


# ── Phase 7: Relaxed thresholds for pre-validated frames ──
# Frames that already passed /face/validate-frame should NOT be
# aggressively rejected during batch processing.
PRE_VALIDATED_BLUR_FACTOR = 0.5   # 50% more lenient blur threshold
PRE_VALIDATED_FACE_SCORE_FACTOR = 0.7  # 30% more lenient face score


def run_quality_pipeline(
    image: np.ndarray,
    faces: list,
    blur_threshold: float = DEFAULT_BLUR_THRESHOLD,
    min_face_score: float = MIN_FACE_SCORE,
    min_face_area_ratio: float = MIN_FACE_AREA_RATIO,
    pre_validated: bool = False,
) -> QualityReport:
    """
    Run the full quality pipeline on a decoded image with pre-detected faces.

    Pipeline order:
        1. Blur detection (Laplacian variance)
        2. Face count validation (exactly 1)
        3. Face score validation (confidence ≥ threshold)
        4. Face size validation (area ratio ≥ threshold)
        5. Landmark visibility check
        6. Head pose validation (yaw/pitch within range)

    Phase 7: When pre_validated=True, quality thresholds are relaxed
    to avoid double-filtering frames that already passed validate-frame.

    Args:
        image: BGR image as numpy array (already decoded)
        faces: List of InsightFace Face objects (already detected)
        blur_threshold: Minimum Laplacian variance
        min_face_score: Minimum detection confidence
        min_face_area_ratio: Minimum face area / image area
        pre_validated: If True, use relaxed thresholds (Phase 7)

    Returns:
        QualityReport with all metrics and pass/fail result
    """
    start = time.time()
    report = QualityReport()
    h, w = image.shape[:2]

    # Phase 7: Relax thresholds for pre-validated frames
    effective_blur_threshold = blur_threshold
    effective_min_face_score = min_face_score
    if pre_validated:
        effective_blur_threshold = blur_threshold * PRE_VALIDATED_BLUR_FACTOR
        effective_min_face_score = min_face_score * PRE_VALIDATED_FACE_SCORE_FACTOR
        logger.debug(
            "Pre-validated frame: relaxed blur_threshold=%.1f (was %.1f), "
            "min_face_score=%.3f (was %.3f)",
            effective_blur_threshold, blur_threshold,
            effective_min_face_score, min_face_score,
        )

    # Step 1: Blur detection
    report.blur_score = compute_blur_score(image)
    if report.blur_score < effective_blur_threshold:
        report.rejection_reason = "blur_score_too_low"
        report.processing_time_ms = (time.time() - start) * 1000
        logger.debug(
            "Quality reject: blur_score=%.1f < threshold=%.1f (pre_validated=%s)",
            report.blur_score, effective_blur_threshold, pre_validated,
        )
        return report

    # Step 2: Face count
    count_ok, count_reason = validate_face_count(faces)
    if not count_ok:
        report.rejection_reason = count_reason
        report.processing_time_ms = (time.time() - start) * 1000
        logger.debug("Quality reject: %s", count_reason)
        return report

    # Sort faces by bounding box area (largest first) to ensure we evaluate the main subject
    faces = sorted(
        faces,
        key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
        reverse=True
    )
    face = faces[0]

    # Step 3: Face score
    score_ok, score_reason, face_score = validate_face_score(face, effective_min_face_score)
    report.face_score = face_score
    if not score_ok:
        report.rejection_reason = score_reason
        report.processing_time_ms = (time.time() - start) * 1000
        logger.debug(
            "Quality reject: face_score=%.3f < threshold=%.3f (pre_validated=%s)",
            face_score, effective_min_face_score, pre_validated,
        )
        return report

    # Step 4: Face size
    size_ok, size_reason, area_ratio = validate_face_size(face, h, w, min_face_area_ratio)
    report.face_area_ratio = area_ratio
    if not size_ok:
        report.rejection_reason = size_reason
        report.processing_time_ms = (time.time() - start) * 1000
        logger.debug("Quality reject: %s (face_area_ratio=%.4f)", size_reason, area_ratio)
        return report

    # Extract bbox
    bbox = face.bbox.astype(int).tolist()
    face_w = bbox[2] - bbox[0]
    face_h = bbox[3] - bbox[1]
    report.bbox = [bbox[0], bbox[1], face_w, face_h]

    # Step 5: Landmark visibility
    landmark_ok, landmark_reason = validate_landmarks_visible(face, h, w)
    if not landmark_ok:
        report.rejection_reason = landmark_reason
        report.processing_time_ms = (time.time() - start) * 1000
        logger.debug("Quality reject: %s", landmark_reason)
        return report
    # Store landmarks (InsightFace exposes 5-point landmarks via .kps)
    landmarks_5pt = get_landmarks_5pt(face)
    if landmarks_5pt is not None:
        report.landmarks_5pt = landmarks_5pt.tolist()

    # Step 6: Head pose validation (skip for pre-validated frames that were already pose-checked)
    if landmarks_5pt is not None:
        if pre_validated:
            # Phase 7: Skip head pose re-validation for pre-validated frames
            # The frame already passed pose validation in validate-frame
            report.head_pose = estimate_head_pose(landmarks_5pt)
            logger.debug(
                "Pre-validated frame: skipping pose re-validation, pose=%s",
                report.head_pose,
            )
        else:
            pose_ok, pose_reason, pose = validate_head_pose(landmarks_5pt)
            report.head_pose = pose
            if not pose_ok:
                report.rejection_reason = pose_reason
                report.processing_time_ms = (time.time() - start) * 1000
                logger.debug("Quality reject: %s", pose_reason)
                return report

    # All checks passed
    report.passed = True
    report.processing_time_ms = (time.time() - start) * 1000
    logger.debug(
        "Quality passed: blur=%.1f, face_score=%.3f, area_ratio=%.4f, "
        "pre_validated=%s, time=%.1fms",
        report.blur_score, report.face_score, report.face_area_ratio,
        pre_validated, report.processing_time_ms,
    )
    return report


def run_quality_pipeline_from_bytes(
    image_bytes: bytes,
    faces: list,
    **kwargs,
) -> QualityReport:
    """
    Run quality pipeline from raw image bytes.

    Args:
        image_bytes: JPEG/PNG image bytes
        faces: Pre-detected face list
        **kwargs: Passed to run_quality_pipeline

    Returns:
        QualityReport
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        report = QualityReport()
        report.rejection_reason = "invalid_image"
        return report
    return run_quality_pipeline(img, faces, **kwargs)
