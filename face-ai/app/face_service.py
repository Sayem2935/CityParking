"""
CityParking Face AI — Face Service
====================================
Singleton InsightFace wrapper providing:
  - Face detection (RetinaFace)
  - Face embedding extraction (ArcFace w600k_r50, 512-d)
  - Face quality validation

Models loaded once at startup via FaceAnalysis("buffalo_l").
All inference runs on CPU via ONNX Runtime.
"""

import time
import logging

import cv2
import numpy as np
from insightface.app import FaceAnalysis

from app.config import settings

logger = logging.getLogger(__name__)


class FaceService:
    """Singleton service wrapping InsightFace FaceAnalysis pipeline."""

    def __init__(self) -> None:
        self._app: FaceAnalysis | None = None
        self._model_loaded: bool = False
        self._startup_time: float = 0.0

    def load_models(self) -> None:
        """Load InsightFace models (called once at app startup)."""
        logger.info(
            "Loading InsightFace models: name=%s, root=%s, providers=%s",
            settings.model_name,
            settings.model_root,
            settings.providers,
        )
        start = time.time()

        self._app = FaceAnalysis(
            name=settings.model_name,
            root=settings.model_root,
            providers=settings.providers,
        )
        self._app.prepare(
            ctx_id=-1,
            det_size=(settings.det_size_w, settings.det_size_h),
        )

        elapsed = time.time() - start
        self._model_loaded = True
        self._startup_time = time.time()
        logger.info("InsightFace models loaded in %.2fs", elapsed)

    @property
    def is_loaded(self) -> bool:
        return self._model_loaded

    @property
    def uptime_seconds(self) -> float:
        if self._startup_time == 0.0:
            return 0.0
        return time.time() - self._startup_time

    # ── Core methods ─────────────────────────────────────────

    def detect_faces(self, image_bytes: bytes) -> list:
        """
        Detect faces in an image using RetinaFace.

        Returns a list of InsightFace Face objects, each containing:
          - bbox: [x1, y1, x2, y2]
          - det_score: detection confidence
          - landmark: 5-point facial landmarks
          - embedding: 512-d ArcFace vector (if recognition model loaded)
        """
        if not self._model_loaded:
            raise RuntimeError("Models not loaded. Call load_models() first.")

        img = self._decode_image(image_bytes)
        faces = self._app.get(img)
        return faces

    def detect_and_embed(
        self, image_bytes: bytes
    ) -> dict:
        """
        Full enrollment pipeline:
        1. Decode image
        2. RetinaFace detection
        3. Validate single face
        4. Quality gate (min detection score)
        5. Extract ArcFace 512-d embedding
        6. L2-normalize embedding
        7. Return embedding + metadata

        Returns:
            dict with keys: success, embedding, face_score, bbox,
                            faces_detected, error, message
        """
        start = time.time()
        img = self._decode_image(image_bytes)
        height, width = img.shape[:2]
        image_area = height * width

        faces = self._app.get(img)
        faces_detected = len(faces)

        if faces_detected == 0:
            return {
                "success": False,
                "error": "no_face_detected",
                "message": "No face was detected in the image. Please ensure your face is clearly visible.",
                "faces_detected": 0,
                "processing_time_ms": (time.time() - start) * 1000,
            }

        if faces_detected > 1:
            return {
                "success": False,
                "error": "multiple_faces",
                "message": f"Multiple faces detected ({faces_detected}). Please ensure only one face is visible.",
                "faces_detected": faces_detected,
                "processing_time_ms": (time.time() - start) * 1000,
            }

        face = faces[0]
        face_score = float(face.det_score)

        # Quality gate: minimum detection confidence
        if face_score < settings.min_face_score:
            return {
                "success": False,
                "error": "low_quality",
                "message": f"Face detection confidence too low ({face_score:.2f}). Please improve lighting and face positioning.",
                "faces_detected": 1,
                "processing_time_ms": (time.time() - start) * 1000,
            }

        # Quality gate: face size relative to image
        bbox = face.bbox.astype(int).tolist()  # [x1, y1, x2, y2]
        face_w = bbox[2] - bbox[0]
        face_h = bbox[3] - bbox[1]
        face_area = face_w * face_h
        area_ratio = face_area / image_area if image_area > 0 else 0

        if area_ratio < settings.min_face_area_ratio:
            return {
                "success": False,
                "error": "face_too_small",
                "message": "Face is too small in the image. Please move closer to the camera.",
                "faces_detected": 1,
                "processing_time_ms": (time.time() - start) * 1000,
            }

        # Extract embedding (InsightFace FaceAnalysis.get() already computes it)
        embedding = face.embedding  # numpy array, shape (512,)

        # L2 normalize (should already be normalized, but ensure)
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        elapsed_ms = (time.time() - start) * 1000

        return {
            "success": True,
            "embedding": embedding.tolist(),
            "face_score": face_score,
            "bbox": [bbox[0], bbox[1], face_w, face_h],  # Convert to [x, y, w, h]
            "faces_detected": 1,
            "model_name": "w600k_r50",
            "embedding_dim": len(embedding),
            "processing_time_ms": round(elapsed_ms, 2),
        }

    def extract_embedding(self, image_bytes: bytes) -> dict:
        """
        Extract embedding only (for verification probes).
        Same pipeline as detect_and_embed but simplified response.
        """
        result = self.detect_and_embed(image_bytes)

        if not result["success"]:
            return result

        return {
            "success": True,
            "embedding": result["embedding"],
            "face_score": result["face_score"],
            "bbox": result["bbox"],
            "processing_time_ms": result["processing_time_ms"],
        }

    def health_check(self) -> dict:
        """Return model health status."""
        return {
            "status": "healthy" if self._model_loaded else "unhealthy",
            "model_loaded": self._model_loaded,
            "model_name": settings.model_name,
            "det_size": [settings.det_size_w, settings.det_size_h],
            "embedding_dim": 512,
            "uptime_seconds": round(self.uptime_seconds, 2),
        }

    # ── Utility methods ──────────────────────────────────────

    @staticmethod
    def _decode_image(image_bytes: bytes) -> np.ndarray:
        """Decode raw bytes into an OpenCV BGR image array."""
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError(
                "Failed to decode image. Please ensure the file is a valid JPEG or PNG image."
            )
        return img

    @staticmethod
    def cosine_similarity(a: list[float], b: list[float]) -> float:
        """
        Compute cosine similarity between two vectors.
        For L2-normalized vectors, this is equivalent to the dot product.
        """
        a_np = np.array(a, dtype=np.float32)
        b_np = np.array(b, dtype=np.float32)

        dot_product = np.dot(a_np, b_np)
        norm_a = np.linalg.norm(a_np)
        norm_b = np.linalg.norm(b_np)

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return float(dot_product / (norm_a * norm_b))
