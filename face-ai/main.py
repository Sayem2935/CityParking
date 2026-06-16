"""
CityParking Face AI — FastAPI Application
==========================================
Production face recognition microservice using:
  - RetinaFace (det_10g.onnx) for face detection
  - ArcFace (w600k_r50.onnx) for 512-d embedding extraction
  - ONNX Runtime on CPU

Models are loaded once at startup via the lifespan context manager.
Typical startup time: ~55s on Apple Silicon CPU.

Usage:
    cd face-ai
    venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001 --reload
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.face_service import FaceService
from app.routes import router, set_face_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Loads InsightFace models at startup and cleans up on shutdown.
    """
    logger.info("=" * 60)
    logger.info("  CityParking Face AI — Starting")
    logger.info("=" * 60)
    logger.info("  Model: %s", settings.model_name)
    logger.info("  Det Size: %dx%d", settings.det_size_w, settings.det_size_h)
    logger.info("  Providers: %s", settings.providers)
    logger.info("  Similarity Threshold: %.2f", settings.similarity_threshold)
    logger.info("=" * 60)

    # Load models
    service = FaceService()
    service.load_models()
    set_face_service(service)

    logger.info("✅ Face AI service is READY on port %d", settings.port)

    yield

    # Cleanup
    logger.info("Shutting down Face AI service...")
    set_face_service(None)


# ── FastAPI Application ──────────────────────────────────────

app = FastAPI(
    title="CityParking Face AI",
    description=(
        "Production face recognition microservice for the CityParking system. "
        "Uses RetinaFace for detection and ArcFace for 512-d embedding extraction."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


# ── CLI Entry Point ──────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level="info",
    )
