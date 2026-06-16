"""
CityParking Face AI — Enrollment: Deduplicator
================================================
Removes redundant embeddings from a batch using greedy
furthest-point selection based on cosine similarity.

ArcFace embeddings of the same person at the same angle
typically have cosine similarity > 0.97. The deduplication
threshold of 0.95 collapses near-duplicates while preserving
meaningfully different views.
"""

import numpy as np
import logging

logger = logging.getLogger(__name__)

# Embeddings with cosine similarity above this are considered duplicates
DEFAULT_DEDUP_THRESHOLD = 0.95

# Maximum number of embeddings to keep per user
MAX_EMBEDDINGS = 12

# Minimum number of embeddings to keep
MIN_EMBEDDINGS = 3


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Compute cosine similarity between two L2-normalized vectors.
    For normalized vectors, this equals the dot product.

    Args:
        a: First embedding vector
        b: Second embedding vector

    Returns:
        Cosine similarity in [-1, 1]
    """
    dot = float(np.dot(a, b))
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a < 1e-8 or norm_b < 1e-8:
        return 0.0
    return dot / (norm_a * norm_b)


def cosine_similarity_matrix(embeddings: np.ndarray) -> np.ndarray:
    """
    Compute pairwise cosine similarity matrix.

    Args:
        embeddings: Array of shape (N, D) — N embeddings of dimension D

    Returns:
        Similarity matrix of shape (N, N)
    """
    # L2 normalize
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms = np.maximum(norms, 1e-8)
    normalized = embeddings / norms

    # Dot product of all pairs
    sim_matrix = np.dot(normalized, normalized.T)
    return sim_matrix


def deduplicate_embeddings(
    embeddings: list[np.ndarray],
    metadata: list[dict] | None = None,
    threshold: float = DEFAULT_DEDUP_THRESHOLD,
    max_embeddings: int = MAX_EMBEDDINGS,
    min_embeddings: int = MIN_EMBEDDINGS,
) -> tuple[list[np.ndarray], list[dict], list[int]]:
    """
    Remove duplicate embeddings using greedy furthest-point selection.

    Algorithm:
        1. Start with the first embedding as a selected center
        2. For each remaining embedding:
           - Compute cosine similarity to ALL selected centers
           - If max_similarity > threshold: SKIP (duplicate)
           - If max_similarity ≤ threshold: ADD as new center
        3. Cap at max_embeddings

    Args:
        embeddings: List of 512-d embedding vectors
        metadata: Optional list of metadata dicts (same length as embeddings)
        threshold: Cosine similarity threshold for deduplication
        max_embeddings: Maximum embeddings to keep
        min_embeddings: Minimum embeddings to keep (relax threshold if needed)

    Returns:
        Tuple of (selected_embeddings, selected_metadata, selected_indices)
    """
    if not embeddings:
        return [], [], []

    n = len(embeddings)
    if metadata is None:
        metadata = [{}] * n

    if n <= min_embeddings:
        return embeddings, metadata, list(range(n))

    # Convert to numpy array for efficient computation
    emb_array = np.array(embeddings, dtype=np.float32)

    # Start with the first embedding
    selected_indices = [0]
    selected_embs = [emb_array[0]]

    for i in range(1, n):
        if len(selected_indices) >= max_embeddings:
            break

        candidate = emb_array[i]

        # Compute similarity to all selected embeddings
        max_sim = max(
            cosine_similarity(candidate, sel) for sel in selected_embs
        )

        if max_sim <= threshold:
            # Sufficiently different — keep it
            selected_indices.append(i)
            selected_embs.append(candidate)

    # If we have fewer than min_embeddings, relax threshold and try again
    if len(selected_indices) < min_embeddings and n >= min_embeddings:
        logger.info(
            "Only %d embeddings after dedup (threshold=%.2f). "
            "Relaxing to include top-%d most diverse.",
            len(selected_indices), threshold, min_embeddings,
        )
        selected_indices = _select_most_diverse(emb_array, min_embeddings)
        selected_embs = [emb_array[i] for i in selected_indices]

    selected_embeddings = [embeddings[i] for i in selected_indices]
    selected_metadata_list = [metadata[i] for i in selected_indices]

    logger.info(
        "Deduplication: %d → %d embeddings (threshold=%.2f)",
        n, len(selected_indices), threshold,
    )

    return selected_embeddings, selected_metadata_list, selected_indices


def _select_most_diverse(
    embeddings: np.ndarray,
    k: int,
) -> list[int]:
    """
    Select k most diverse embeddings using greedy max-min distance.

    Starts with the first embedding, then iteratively selects the
    embedding that is most distant from all currently selected.

    Args:
        embeddings: Array of shape (N, D)
        k: Number to select

    Returns:
        List of selected indices
    """
    n = embeddings.shape[0]
    k = min(k, n)

    sim_matrix = cosine_similarity_matrix(embeddings)

    selected = [0]
    for _ in range(k - 1):
        # For each candidate, compute its maximum similarity to any selected
        best_idx = -1
        best_min_sim = 2.0  # Start high — we want the LOWEST max similarity

        for i in range(n):
            if i in selected:
                continue
            max_sim_to_selected = max(sim_matrix[i, j] for j in selected)
            if max_sim_to_selected < best_min_sim:
                best_min_sim = max_sim_to_selected
                best_idx = i

        if best_idx >= 0:
            selected.append(best_idx)

    return selected
