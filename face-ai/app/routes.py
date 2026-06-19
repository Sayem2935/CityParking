"""
CityParking Face AI — API Routes
==================================
FastAPI route handlers for face detection, enrollment, verification, and comparison.
Extended with batch enrollment, quality check, liveness analysis, and gallery matching.
"""

import base64
import logging
import time

from fastapi import APIRouter, File, Form, UploadFile, HTTPException

from app.face_service import FaceService
from app.config import settings
from app.models import (
    EnrollResponse,
    EmbeddingResponse,
    DetectResponse,
    FaceDetection,
    CompareRequest,
    CompareResponse,
    HealthResponse,
    ErrorResponse,
    ValidateFrameResponse,
    BatchEnrollResponse,
    BatchEnrollEmbedding,
    RejectedFrame,
    QualityCheckResponse,
    LivenessAnalyzeRequest,
    LivenessAnalyzeResponse,
    GalleryCompareRequest,
    GalleryCompareResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Module-level reference — set by main.py after model loading
face_service: FaceService | None = None


def set_face_service(service: FaceService) -> None:
    """Called by main.py to inject the loaded FaceService singleton."""
    global face_service
    face_service = service


def _get_service() -> FaceService:
    """Get the face service, raising 503 if not ready."""
    if face_service is None or not face_service.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Face AI service is not ready. Models are still loading.",
        )
    return face_service


# ── POST /face/validate-frame ────────────────────────────────

@router.post(
    "/face/validate-frame",
    response_model=ValidateFrameResponse,
    summary="Validate a single frame for real-time guidance",
    description="Analyzes a single frame for a specific pose and returns feedback",
)
async def validate_frame(
    image: UploadFile = File(..., description="Frame to validate"),
    pose_label: str = Form(..., description="Target pose (e.g., center, left, right)")
):
    svc = _get_service()
    start_time = time.time()

    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image file")

    # Fast validation
    from app.quality.quality_pipeline import run_quality_pipeline_from_bytes
    from app.quality.pose_validator import validate_frame_pose

    # Just detect faces, don't strictly extract embeddings yet
    faces = svc.detect_faces(image_bytes)
    
    if len(faces) == 0:
        return ValidateFrameResponse(
            success=True,
            valid=False,
            feedback="No face detected",
            reasons=["no_face"],
            pose_metrics={},
            quality_metrics={},
            bbox=[],
            processing_time_ms=(time.time() - start_time) * 1000
        )

    # InsightFace exposes 5-point landmarks via .kps in the FaceAnalysis output.
    _f0 = faces[0]
    logger.debug(
        "[validate-frame] face attrs: has_kps=%s, kps_shape=%s, has_landmark=%s",
        getattr(_f0, "kps", None) is not None,
        getattr(getattr(_f0, "kps", None), "shape", None),
        getattr(_f0, "landmark", None) is not None,
    )

    report = run_quality_pipeline_from_bytes(image_bytes, faces)

    # Pose specific validation
    val_result = validate_frame_pose(
        pose_label=pose_label.lower(),
        head_pose=report.head_pose,
        blur_score=report.blur_score,
        face_score=report.face_score,
        face_area_ratio=report.face_area_ratio,
        bbox=report.bbox
    )

    elapsed_ms = (time.time() - start_time) * 1000

    # Keep pose metrics available in debug logs for enrollment incident traces.
    _yaw = report.head_pose.get("yaw")
    _pitch = report.head_pose.get("pitch")
    logger.debug(
        f"[validate-frame] pose_label={pose_label} yaw={_yaw}, pitch={_pitch}, "
        f"pose_detected={val_result.get('poseDetected')}, valid={val_result['valid']}, "
        f"head_pose={report.head_pose}"
    )

    return ValidateFrameResponse(
        success=True,
        valid=val_result["valid"],
        feedback=val_result["feedback"],
        reasons=val_result["reasons"],
        pose_detected=val_result.get("poseDetected", "unknown"),
        pose_metrics=report.head_pose,
        quality_metrics={
            "blur_score": report.blur_score,
            "face_score": report.face_score,
            "face_area_ratio": report.face_area_ratio
        },
        bbox=report.bbox,
        processing_time_ms=elapsed_ms
    )



# ── POST /face/enroll ────────────────────────────────────────


@router.post(
    "/face/enroll",
    response_model=EnrollResponse,
    responses={400: {"model": ErrorResponse}},
    summary="Enroll a face — detect and extract embedding",
    description=(
        "Accepts an image, detects exactly one face using RetinaFace, "
        "extracts a 512-d ArcFace embedding, and returns the normalized "
        "embedding vector along with detection metadata."
    ),
)
async def enroll_face(
    image: UploadFile = File(..., description="Face image (JPEG/PNG, max 10MB)"),
    user_id: int = Form(..., description="User ID to associate with this enrollment"),
):
    svc = _get_service()

    # Validate content type
    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {image.content_type}. Only image files are accepted.",
        )

    image_bytes = await image.read()

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image file")

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image exceeds 10MB limit")

    logger.info(
        "Enrollment request: user_id=%d, image_size=%d bytes",
        user_id,
        len(image_bytes),
    )

    try:
        result = svc.detect_and_embed(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "error": result["error"],
                "message": result["message"],
                "faces_detected": result["faces_detected"],
            },
        )

    return EnrollResponse(
        success=True,
        embedding=result["embedding"],
        face_score=result["face_score"],
        bbox=result["bbox"],
        faces_detected=result["faces_detected"],
        model_name=result["model_name"],
        embedding_dim=result["embedding_dim"],
        processing_time_ms=result["processing_time_ms"],
    )


# ── POST /face/extract-embedding ─────────────────────────────


@router.post(
    "/face/extract-embedding",
    response_model=EmbeddingResponse,
    responses={400: {"model": ErrorResponse}},
    summary="Extract face embedding from an image",
    description=(
        "Accepts an image, detects a face, and returns the 512-d "
        "ArcFace embedding. Used for verification probes."
    ),
)
async def extract_embedding(
    image: UploadFile = File(..., description="Face image (JPEG/PNG, max 10MB)"),
):
    svc = _get_service()

    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {image.content_type}. Only image files are accepted.",
        )

    image_bytes = await image.read()

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image file")

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image exceeds 10MB limit")

    logger.info("Embedding extraction request: image_size=%d bytes", len(image_bytes))

    try:
        result = svc.extract_embedding(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "error": result["error"],
                "message": result["message"],
                "faces_detected": result.get("faces_detected", 0),
            },
        )

    return EmbeddingResponse(
        success=True,
        embedding=result["embedding"],
        face_score=result["face_score"],
        bbox=result["bbox"],
        processing_time_ms=result["processing_time_ms"],
    )


# ── POST /face/detect ────────────────────────────────────────


@router.post(
    "/face/detect",
    response_model=DetectResponse,
    summary="Detect faces in an image (no embedding)",
    description="Detects all faces in an image and returns bounding boxes and scores.",
)
async def detect_faces(
    image: UploadFile = File(..., description="Image to scan for faces (JPEG/PNG)"),
):
    svc = _get_service()

    image_bytes = await image.read()

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image file")

    start = time.time()

    try:
        faces = svc.detect_faces(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    detections = []
    for face in faces:
        bbox = face.bbox.astype(int).tolist()
        face_w = bbox[2] - bbox[0]
        face_h = bbox[3] - bbox[1]
        landmarks = []
        _kps = getattr(face, "kps", None)
        if _kps is None:
            _kps = getattr(face, "landmark", None)
        if _kps is not None:
            landmarks = _kps.tolist()

        detections.append(
            FaceDetection(
                bbox=[bbox[0], bbox[1], face_w, face_h],
                score=float(face.det_score),
                landmarks=landmarks,
            )
        )

    elapsed_ms = (time.time() - start) * 1000

    return DetectResponse(
        success=True,
        faces=detections,
        faces_detected=len(detections),
        processing_time_ms=round(elapsed_ms, 2),
    )


# ── POST /face/compare ───────────────────────────────────────


@router.post(
    "/face/compare",
    response_model=CompareResponse,
    summary="Compare two face embeddings",
    description=(
        "Computes cosine similarity between two 512-d embeddings "
        "and returns whether they match above the configured threshold."
    ),
)
async def compare_embeddings(request: CompareRequest):
    if len(request.embedding1) != 512 or len(request.embedding2) != 512:
        raise HTTPException(
            status_code=400,
            detail=f"Both embeddings must be 512-dimensional. Got {len(request.embedding1)} and {len(request.embedding2)}.",
        )

    similarity = FaceService.cosine_similarity(
        request.embedding1, request.embedding2
    )

    return CompareResponse(
        similarity=round(similarity, 6),
        match=similarity >= settings.similarity_threshold,
        threshold=settings.similarity_threshold,
    )


# ── GET /health ───────────────────────────────────────────────


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Returns model loading status and service uptime.",
)
async def health_check():
    if face_service is None:
        return HealthResponse(
            status="starting",
            model_loaded=False,
            model_name=settings.model_name,
            det_size=[settings.det_size_w, settings.det_size_h],
        )
    return HealthResponse(**face_service.health_check())


# ── POST /face/batch-enroll ──────────────────────────────────


@router.post(
    "/face/batch-enroll",
    response_model=BatchEnrollResponse,
    responses={400: {"model": ErrorResponse}},
    summary="Batch enrollment — process multiple frames and return deduplicated embeddings",
    description=(
        "Accepts multiple face images from a guided enrollment session, "
        "runs quality checks, extracts ArcFace embeddings, deduplicates, "
        "and returns the diverse embedding set."
    ),
)
async def batch_enroll(
    images: list[UploadFile] = File(..., description="Face images (JPEG/PNG, 4-50 frames)"),
    user_id: int = Form(..., description="User ID"),
    pose_labels: str = Form("", description="Comma-separated pose labels per frame"),
):
    svc = _get_service()

    if len(images) < 3:
        raise HTTPException(status_code=400, detail="At least 3 frames are required for batch enrollment")

    if len(images) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 frames per batch")

    # Parse pose labels
    if pose_labels:
        labels = [l.strip() for l in pose_labels.split(",")]
    else:
        labels = ["center"] * len(images)

    # Pad or truncate labels to match frames
    while len(labels) < len(images):
        labels.append("center")
    labels = labels[:len(images)]

    # Read all frame bytes
    frames_bytes = []
    for img in images:
        data = await img.read()
        if len(data) == 0:
            continue
        if len(data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Individual image exceeds 10MB limit")
        frames_bytes.append(data)

    if not frames_bytes:
        raise HTTPException(status_code=400, detail="No valid images received")

    logger.info(
        "Batch enrollment: user_id=%d, frames=%d",
        user_id, len(frames_bytes),
    )

    try:
        from app.enrollment.batch_processor import process_enrollment_batch

        result = process_enrollment_batch(
            frames_bytes=frames_bytes,
            pose_labels=labels[:len(frames_bytes)],
            face_service=svc,
            dedup_threshold=settings.dedup_threshold,
            max_embeddings=settings.max_embeddings_per_user,
        )

        # Convert to response model
        embedding_responses = []
        for emb, meta in zip(result.embeddings, result.metadata):
            embedding_responses.append(BatchEnrollEmbedding(
                embedding=emb,
                pose_label=meta.get("pose_label", "center"),
                face_score=meta.get("face_score", 0.0),
                bbox=meta.get("bbox", []),
                head_pose=meta.get("head_pose", {}),
                blur_score=meta.get("blur_score", 0.0),
            ))

        rejected = [
            RejectedFrame(
                frame_index=r.get("frame_index", 0),
                reason=r.get("reason", "unknown"),
                pose_label=r.get("pose_label", ""),
                blur_score=r.get("blur_score", 0.0),
            )
            for r in result.rejected_frames
        ]

        return BatchEnrollResponse(
            success=result.embeddings_extracted > 0,
            total_frames=result.total_frames,
            quality_passed=result.quality_passed,
            quality_failed=result.quality_failed,
            embeddings_extracted=result.embeddings_extracted,
            embeddings_after_dedup=result.embeddings_after_dedup,
            embeddings=embedding_responses,
            rejected_frames=rejected,
            processing_time_ms=result.processing_time_ms,
        )

    except Exception as e:
        logger.error("Batch enrollment failed: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Batch enrollment failed: {str(e)}")


# ── POST /face/quality-check ─────────────────────────────────


@router.post(
    "/face/quality-check",
    response_model=QualityCheckResponse,
    responses={400: {"model": ErrorResponse}},
    summary="Check quality of a single frame",
    description="Runs blur, face detection, size, landmark, and pose checks on a single image.",
)
async def quality_check(
    image: UploadFile = File(..., description="Face image (JPEG/PNG)"),
):
    svc = _get_service()

    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image file")

    import cv2
    import numpy as np
    from app.quality.quality_pipeline import run_quality_pipeline

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Failed to decode image")

    faces = svc.detect_faces(image_bytes)
    report = run_quality_pipeline(img, faces)

    return QualityCheckResponse(
        success=True,
        passed=report.passed,
        rejection_reason=report.rejection_reason,
        blur_score=report.blur_score,
        face_score=report.face_score,
        face_area_ratio=report.face_area_ratio,
        bbox=report.bbox,
        landmarks_5pt=report.landmarks_5pt,
        head_pose=report.head_pose,
        processing_time_ms=report.processing_time_ms,
    )


# ── POST /face/liveness/analyze ──────────────────────────────


@router.post(
    "/face/liveness/analyze",
    response_model=LivenessAnalyzeResponse,
    summary="Analyze frame sequence for liveness",
    description=(
        "Accepts a sequence of frames with landmarks and bounding boxes, "
        "runs 5-signal passive liveness detection (blink, texture, color, "
        "motion, reflection), and returns a weighted fusion score."
    ),
)
async def liveness_analyze(request: LivenessAnalyzeRequest):
    import cv2
    import numpy as np
    from app.liveness.liveness_fusion import run_liveness_analysis

    if len(request.frames_b64) < 5:
        raise HTTPException(status_code=400, detail="At least 5 frames required for liveness analysis")

    if len(request.frames_b64) > 60:
        raise HTTPException(status_code=400, detail="Maximum 60 frames for liveness analysis")

    # Decode frames
    frames = []
    for b64_str in request.frames_b64:
        try:
            img_bytes = base64.b64decode(b64_str)
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                frames.append(img)
        except Exception:
            continue

    if len(frames) < 5:
        raise HTTPException(status_code=400, detail="Could not decode enough valid frames")

    # Convert landmarks
    landmarks_seq = []
    for lm in request.landmarks_sequence:
        if lm and len(lm) >= 5:
            landmarks_seq.append(np.array(lm, dtype=np.float64))
        else:
            landmarks_seq.append(None)

    result = run_liveness_analysis(
        frames=frames,
        landmarks_sequence=landmarks_seq,
        bboxes=request.bboxes,
        threshold=settings.liveness_threshold,
    )

    return LivenessAnalyzeResponse(
        success=True,
        live=result["live"],
        liveness_score=result["liveness_score"],
        threshold=result["threshold"],
        checks=result["checks"],
        weighted_scores=result["weighted_scores"],
    )


# ── POST /face/compare-gallery ───────────────────────────────


@router.post(
    "/face/compare-gallery",
    response_model=GalleryCompareResponse,
    summary="Compare probe against embedding gallery",
    description=(
        "Compares a single 512-d probe embedding against a gallery of "
        "embeddings, returning the maximum similarity score and match details."
    ),
)
async def compare_gallery(request: GalleryCompareRequest):
    if len(request.probe) != 512:
        raise HTTPException(
            status_code=400,
            detail=f"Probe must be 512-dimensional. Got {len(request.probe)}.",
        )

    for i, emb in enumerate(request.gallery):
        if len(emb) != 512:
            raise HTTPException(
                status_code=400,
                detail=f"Gallery embedding {i} must be 512-dimensional. Got {len(emb)}.",
            )

    from app.gallery.gallery_matcher import match_against_gallery

    result = match_against_gallery(
        probe=request.probe,
        gallery=request.gallery,
        gallery_metadata=request.gallery_metadata if request.gallery_metadata else None,
        threshold=request.threshold,
    )

    return GalleryCompareResponse(
        matched=result["matched"],
        max_similarity=result["max_similarity"],
        best_index=result["best_index"],
        best_metadata=result["best_metadata"],
        all_scores=result["all_scores"],
        embeddings_compared=result["embeddings_compared"],
        threshold=result["threshold"],
        processing_time_ms=result["processing_time_ms"],
    )
