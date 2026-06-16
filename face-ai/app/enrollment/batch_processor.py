"""
CityParking Face AI — Enrollment: Batch Processor
===================================================
Processes a batch of enrollment frames through the quality
pipeline, extracts ArcFace embeddings from quality frames,
and runs deduplication.
"""

import time
import logging
from typing import Optional

import cv2
import numpy as np

from app.quality.quality_pipeline import run_quality_pipeline
from app.enrollment.deduplicator import deduplicate_embeddings

logger = logging.getLogger(__name__)


class BatchEnrollmentResult:
    """Result of processing a batch of enrollment frames."""

    def __init__(self):
        self.total_frames: int = 0
        self.quality_passed: int = 0
        self.quality_failed: int = 0
        self.embeddings_extracted: int = 0
        self.embeddings_after_dedup: int = 0
        self.embeddings: list[list[float]] = []
        self.metadata: list[dict] = []
        self.quality_reports: list[dict] = []
        self.rejected_frames: list[dict] = []
        self.processing_time_ms: float = 0.0

    def to_dict(self) -> dict:
        return {
            "total_frames": self.total_frames,
            "quality_passed": self.quality_passed,
            "quality_failed": self.quality_failed,
            "embeddings_extracted": self.embeddings_extracted,
            "embeddings_after_dedup": self.embeddings_after_dedup,
            "embeddings": self.embeddings,
            "metadata": self.metadata,
            "quality_reports": self.quality_reports,
            "rejected_frames": self.rejected_frames,
            "processing_time_ms": round(self.processing_time_ms, 2),
        }


def process_enrollment_batch(
    frames_bytes: list[bytes],
    pose_labels: list[str],
    face_service,
    dedup_threshold: float = 0.95,
    max_embeddings: int = 12,
) -> BatchEnrollmentResult:
    """
    Process a batch of enrollment frames:
    1. Decode each frame
    2. Run face detection (RetinaFace)
    3. Run quality pipeline
    4. Extract ArcFace embedding from quality frames
    5. Deduplicate embeddings

    Args:
        frames_bytes: List of JPEG/PNG image bytes
        pose_labels: List of pose labels (same length as frames_bytes)
        face_service: FaceService instance (with loaded models)
        dedup_threshold: Cosine similarity threshold for deduplication
        max_embeddings: Maximum embeddings to keep

    Returns:
        BatchEnrollmentResult with embeddings and metadata
    """
    start = time.time()
    result = BatchEnrollmentResult()
    result.total_frames = len(frames_bytes)

    raw_embeddings = []
    raw_metadata = []

    for i, (frame_bytes, pose_label) in enumerate(zip(frames_bytes, pose_labels)):
        try:
            # Decode image
            nparr = np.frombuffer(frame_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                result.rejected_frames.append({
                    "frame_index": i,
                    "reason": "decode_failed",
                    "pose_label": pose_label,
                })
                result.quality_failed += 1
                continue

            # Run face detection
            faces = face_service._app.get(img)

            # Run quality pipeline
            quality_report = run_quality_pipeline(img, faces)
            result.quality_reports.append({
                "frame_index": i,
                "pose_label": pose_label,
                **quality_report.to_dict(),
            })

            if not quality_report.passed:
                result.rejected_frames.append({
                    "frame_index": i,
                    "reason": quality_report.rejection_reason,
                    "pose_label": pose_label,
                    "blur_score": quality_report.blur_score,
                })
                result.quality_failed += 1
                continue

            result.quality_passed += 1

            # Extract embedding from the detected face
            face = faces[0]
            embedding = face.embedding
            if embedding is None:
                result.rejected_frames.append({
                    "frame_index": i,
                    "reason": "no_embedding",
                    "pose_label": pose_label,
                })
                continue

            # L2 normalize
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm

            raw_embeddings.append(embedding)
            raw_metadata.append({
                "frame_index": i,
                "pose_label": pose_label,
                "face_score": quality_report.face_score,
                "bbox": quality_report.bbox,
                "landmarks_5pt": quality_report.landmarks_5pt,
                "head_pose": quality_report.head_pose,
                "blur_score": quality_report.blur_score,
            })

        except Exception as e:
            logger.error("Error processing frame %d: %s", i, str(e))
            result.rejected_frames.append({
                "frame_index": i,
                "reason": f"processing_error: {str(e)}",
                "pose_label": pose_label,
            })
            result.quality_failed += 1

    result.embeddings_extracted = len(raw_embeddings)

    # Deduplication
    if raw_embeddings:
        deduped_embs, deduped_meta, selected_indices = deduplicate_embeddings(
            raw_embeddings,
            raw_metadata,
            threshold=dedup_threshold,
            max_embeddings=max_embeddings,
        )

        result.embeddings = [emb.tolist() for emb in deduped_embs]
        result.metadata = deduped_meta
        result.embeddings_after_dedup = len(deduped_embs)
    else:
        result.embeddings_after_dedup = 0

    result.processing_time_ms = (time.time() - start) * 1000

    logger.info(
        "Batch enrollment: %d frames → %d quality → %d embeddings → %d after dedup (%.1fms)",
        result.total_frames,
        result.quality_passed,
        result.embeddings_extracted,
        result.embeddings_after_dedup,
        result.processing_time_ms,
    )

    return result
