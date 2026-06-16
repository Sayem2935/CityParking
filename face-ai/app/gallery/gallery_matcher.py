"""
CityParking Face AI — Gallery: Gallery Matcher
================================================
Compares a probe embedding against a gallery of stored embeddings
and returns the maximum similarity score with match details.

Supports:
  - 1:1 verification (probe vs single user's gallery)
  - 1:N identification (probe vs all users' galleries)
"""

import numpy as np
import logging
import time

logger = logging.getLogger(__name__)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Compute cosine similarity between two vectors.
    For L2-normalized vectors, equivalent to dot product.

    Args:
        a: First vector (512-d)
        b: Second vector (512-d)

    Returns:
        Cosine similarity in [-1, 1]
    """
    a = np.asarray(a, dtype=np.float32)
    b = np.asarray(b, dtype=np.float32)
    dot = float(np.dot(a, b))
    norm_a = float(np.linalg.norm(a))
    norm_b = float(np.linalg.norm(b))
    if norm_a < 1e-8 or norm_b < 1e-8:
        return 0.0
    return dot / (norm_a * norm_b)


def match_against_gallery(
    probe: list[float],
    gallery: list[list[float]],
    gallery_metadata: list[dict] | None = None,
    threshold: float = 0.45,
) -> dict:
    """
    Compare a probe embedding against a gallery of embeddings.
    Returns the maximum similarity and match details.

    Args:
        probe: 512-d probe embedding
        gallery: List of 512-d gallery embeddings
        gallery_metadata: Optional metadata for each gallery embedding
            (e.g., {"embedding_id": 123, "pose_label": "left"})
        threshold: Match threshold (default: 0.45)

    Returns:
        {
            "matched": bool,
            "max_similarity": float,
            "best_index": int,
            "best_metadata": dict,
            "all_scores": list[float],
            "embeddings_compared": int,
            "threshold": float,
            "processing_time_ms": float,
        }
    """
    start = time.time()

    if not gallery:
        return {
            "matched": False,
            "max_similarity": 0.0,
            "best_index": -1,
            "best_metadata": {},
            "all_scores": [],
            "embeddings_compared": 0,
            "threshold": threshold,
            "processing_time_ms": 0.0,
        }

    probe_np = np.asarray(probe, dtype=np.float32)
    if gallery_metadata is None:
        gallery_metadata = [{}] * len(gallery)

    # Compute cosine similarity against all gallery embeddings
    scores = []
    for emb in gallery:
        emb_np = np.asarray(emb, dtype=np.float32)
        sim = cosine_similarity(probe_np, emb_np)
        scores.append(sim)

    max_sim = max(scores)
    best_idx = int(np.argmax(scores))
    matched = max_sim >= threshold

    elapsed = (time.time() - start) * 1000

    return {
        "matched": matched,
        "max_similarity": round(max_sim, 6),
        "best_index": best_idx,
        "best_metadata": gallery_metadata[best_idx] if best_idx < len(gallery_metadata) else {},
        "all_scores": [round(s, 6) for s in scores],
        "embeddings_compared": len(gallery),
        "threshold": threshold,
        "processing_time_ms": round(elapsed, 3),
    }


def batch_match_gallery(
    probe: list[float],
    galleries: dict[int, list[list[float]]],
    galleries_metadata: dict[int, list[dict]] | None = None,
    threshold: float = 0.45,
) -> dict:
    """
    1:N identification — compare probe against multiple users' galleries.

    Args:
        probe: 512-d probe embedding
        galleries: Dict mapping user_id → list of gallery embeddings
        galleries_metadata: Optional dict mapping user_id → list of metadata
        threshold: Match threshold

    Returns:
        {
            "identified": bool,
            "best_user_id": int | None,
            "best_similarity": float,
            "best_embedding_metadata": dict,
            "user_scores": {user_id: max_similarity, ...},
            "total_embeddings_compared": int,
            "total_users_compared": int,
            "processing_time_ms": float,
        }
    """
    start = time.time()

    if not galleries:
        return {
            "identified": False,
            "best_user_id": None,
            "best_similarity": 0.0,
            "best_embedding_metadata": {},
            "user_scores": {},
            "total_embeddings_compared": 0,
            "total_users_compared": 0,
            "processing_time_ms": 0.0,
        }

    if galleries_metadata is None:
        galleries_metadata = {}

    probe_np = np.asarray(probe, dtype=np.float32)

    best_user_id = None
    best_similarity = 0.0
    best_metadata = {}
    user_scores = {}
    total_compared = 0

    for user_id, gallery in galleries.items():
        user_meta = galleries_metadata.get(user_id, [{}] * len(gallery))
        result = match_against_gallery(
            probe, gallery, user_meta, threshold=0.0  # No threshold for per-user matching
        )
        user_max = result["max_similarity"]
        user_scores[user_id] = round(user_max, 6)
        total_compared += result["embeddings_compared"]

        if user_max > best_similarity:
            best_similarity = user_max
            best_user_id = user_id
            best_metadata = result["best_metadata"]

    identified = best_similarity >= threshold
    elapsed = (time.time() - start) * 1000

    return {
        "identified": identified,
        "best_user_id": best_user_id if identified else None,
        "best_similarity": round(best_similarity, 6),
        "best_embedding_metadata": best_metadata,
        "user_scores": user_scores,
        "total_embeddings_compared": total_compared,
        "total_users_compared": len(galleries),
        "processing_time_ms": round(elapsed, 3),
    }
