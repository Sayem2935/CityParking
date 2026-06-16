"""
CityParking Face AI — Pydantic Models
======================================
Request/response schemas for all API endpoints.
"""

from pydantic import BaseModel, Field


# ── Response Models ──────────────────────────────────────────


class FaceDetection(BaseModel):
    """Single detected face metadata."""

    bbox: list[int] = Field(description="Bounding box [x, y, w, h]")
    score: float = Field(description="RetinaFace detection confidence (0-1)")
    landmarks: list[list[float]] = Field(
        default_factory=list,
        description="5-point facial landmarks [[x,y], ...]",
    )


class EnrollResponse(BaseModel):
    """Response for /face/enroll endpoint."""

    success: bool
    embedding: list[float] = Field(
        default_factory=list, description="512-d normalized ArcFace embedding"
    )
    face_score: float = Field(default=0.0, description="RetinaFace detection confidence")
    bbox: list[int] = Field(default_factory=list, description="Face bounding box [x,y,w,h]")
    faces_detected: int = Field(default=0, description="Number of faces found in image")
    model_name: str = Field(default="w600k_r50", description="ArcFace model identifier")
    embedding_dim: int = Field(default=512, description="Embedding vector dimensionality")
    processing_time_ms: float = Field(default=0.0, description="Total processing time in ms")


class EmbeddingResponse(BaseModel):
    """Response for /face/extract-embedding endpoint."""

    success: bool
    embedding: list[float] = Field(
        default_factory=list, description="512-d normalized ArcFace embedding"
    )
    face_score: float = Field(default=0.0, description="RetinaFace detection confidence")
    bbox: list[int] = Field(default_factory=list, description="Face bounding box [x,y,w,h]")
    processing_time_ms: float = Field(default=0.0, description="Total processing time in ms")


class DetectResponse(BaseModel):
    """Response for /face/detect endpoint."""

    success: bool
    faces: list[FaceDetection] = Field(
        default_factory=list, description="List of detected faces"
    )
    faces_detected: int = Field(default=0)
    processing_time_ms: float = Field(default=0.0)


class CompareRequest(BaseModel):
    """Request for /face/compare endpoint."""

    embedding1: list[float] = Field(description="First 512-d embedding")
    embedding2: list[float] = Field(description="Second 512-d embedding")


class CompareResponse(BaseModel):
    """Response for /face/compare endpoint."""

    similarity: float = Field(description="Cosine similarity score [-1, 1]")
    match: bool = Field(description="Whether similarity exceeds threshold")
    threshold: float = Field(description="Threshold used for match decision")


class HealthResponse(BaseModel):
    """Response for /health endpoint."""

    status: str = Field(default="healthy")
    model_loaded: bool = Field(default=False)
    model_name: str = Field(default="")
    det_size: list[int] = Field(default_factory=list)
    embedding_dim: int = Field(default=512)
    uptime_seconds: float = Field(default=0.0)


class ErrorResponse(BaseModel):
    """Standard error response."""

    success: bool = Field(default=False)
    error: str = Field(description="Error code")
    message: str = Field(description="Human-readable error message")
    faces_detected: int = Field(default=0)


# ── Batch Enrollment Models ──────────────────────────────────


class BatchEnrollEmbedding(BaseModel):
    """Single embedding result from batch enrollment."""

    embedding: list[float] = Field(description="512-d normalized ArcFace embedding")
    pose_label: str = Field(description="Pose label (center, left, right, up, down, blink, smile)")
    face_score: float = Field(description="RetinaFace detection confidence")
    bbox: list[int] = Field(description="Face bounding box [x,y,w,h]")
    head_pose: dict = Field(default_factory=dict, description="Estimated yaw/pitch/roll")
    blur_score: float = Field(default=0.0, description="Laplacian variance blur score")


class RejectedFrame(BaseModel):
    """Details of a frame that failed quality checks."""

    frame_index: int = Field(description="Index of the rejected frame")
    reason: str = Field(description="Rejection reason code")
    pose_label: str = Field(default="", description="Pose label")
    blur_score: float = Field(default=0.0)


class BatchEnrollResponse(BaseModel):
    """Response for /face/batch-enroll endpoint."""

    success: bool
    total_frames: int = Field(default=0, description="Total frames received")
    quality_passed: int = Field(default=0, description="Frames passing quality checks")
    quality_failed: int = Field(default=0, description="Frames failing quality checks")
    embeddings_extracted: int = Field(default=0, description="Embeddings before dedup")
    embeddings_after_dedup: int = Field(default=0, description="Embeddings after dedup")
    embeddings: list[BatchEnrollEmbedding] = Field(default_factory=list)
    rejected_frames: list[RejectedFrame] = Field(default_factory=list)
    processing_time_ms: float = Field(default=0.0)


# ── Quality Check Models ─────────────────────────────────────


class QualityCheckResponse(BaseModel):
    """Response for /face/quality-check endpoint."""

    success: bool
    passed: bool = Field(description="Whether the frame passes all quality checks")
    rejection_reason: str | None = Field(default=None)
    blur_score: float = Field(default=0.0)
    face_score: float = Field(default=0.0)
    face_area_ratio: float = Field(default=0.0)
    bbox: list[int] = Field(default_factory=list)
    landmarks_5pt: list[list[float]] = Field(default_factory=list)
    head_pose: dict = Field(default_factory=dict)
    processing_time_ms: float = Field(default=0.0)


# ── Liveness Models ──────────────────────────────────────────


class LivenessCheckResult(BaseModel):
    """Individual liveness check result."""

    passed: bool
    confidence: float
    weight: float = Field(default=0.0)


class LivenessAnalyzeRequest(BaseModel):
    """Request for /face/liveness/analyze endpoint."""

    frames_b64: list[str] = Field(description="Base64-encoded JPEG frames")
    landmarks_sequence: list[list[list[float]]] = Field(
        description="5-point landmarks per frame: [[[x,y],...], ...]"
    )
    bboxes: list[list[int]] = Field(
        description="Bounding boxes per frame: [[x,y,w,h], ...]"
    )


class LivenessAnalyzeResponse(BaseModel):
    """Response for /face/liveness/analyze endpoint."""

    success: bool
    live: bool = Field(description="Whether the subject is determined to be live")
    liveness_score: float = Field(description="Weighted fusion score [0, 1]")
    threshold: float = Field(description="Decision threshold")
    checks: dict = Field(default_factory=dict, description="Per-check results")
    weighted_scores: dict = Field(default_factory=dict, description="Per-check weighted scores")


# ── Gallery Comparison Models ────────────────────────────────


class GalleryCompareRequest(BaseModel):
    """Request for /face/compare-gallery endpoint."""

    probe: list[float] = Field(description="512-d probe embedding")
    gallery: list[list[float]] = Field(description="List of 512-d gallery embeddings")
    gallery_metadata: list[dict] = Field(
        default_factory=list,
        description="Optional metadata per gallery embedding"
    )
    threshold: float = Field(default=0.45, description="Match threshold")


class GalleryCompareResponse(BaseModel):
    """Response for /face/compare-gallery endpoint."""

    matched: bool = Field(description="Whether max similarity exceeds threshold")
    max_similarity: float = Field(description="Maximum cosine similarity score")
    best_index: int = Field(description="Index of best-matching gallery embedding")
    best_metadata: dict = Field(default_factory=dict)
    all_scores: list[float] = Field(default_factory=list, description="All similarity scores")
    embeddings_compared: int = Field(default=0)
    threshold: float = Field(default=0.45)
    processing_time_ms: float = Field(default=0.0)
