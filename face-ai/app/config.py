"""
CityParking Face AI — Configuration
====================================
Environment-based settings via pydantic-settings.
"""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server
    host: str = "0.0.0.0"
    port: int = 8001

    # InsightFace model configuration
    model_name: str = "buffalo_l"
    model_root: str = os.path.join(os.path.expanduser("~"), ".insightface", "models")
    det_size_w: int = 640
    det_size_h: int = 640
    providers: list[str] = ["CPUExecutionProvider"]

    # Face detection thresholds
    min_face_score: float = 0.5
    min_face_quality: float = 0.90
    min_face_area_ratio: float = 0.02  # Face bbox must be ≥ 2% of image area

    # Cosine similarity thresholds
    similarity_threshold: float = 0.45

    # Multi-embedding enrollment settings
    dedup_threshold: float = 0.95        # Cosine similarity above this = duplicate
    max_embeddings_per_user: int = 12    # Maximum embeddings stored per user
    min_embeddings_per_user: int = 3     # Minimum embeddings for valid enrollment
    blur_threshold: float = 80.0         # Laplacian variance — below this = blurry
    enrollment_quality_face_score: float = 0.70  # Stricter than detection threshold

    # Liveness detection
    liveness_threshold: float = 0.60     # Weighted fusion score threshold
    liveness_enabled: bool = True        # Enable/disable liveness checks

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8080"]

    model_config = {
        "env_prefix": "FACE_AI_",
        "env_file": ".env",
        "extra": "ignore",
    }


settings = Settings()
