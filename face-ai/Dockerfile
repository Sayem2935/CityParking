# ============================================================
# CityParking Face AI — Docker Image
# ============================================================
# Multi-stage build for the FastAPI face recognition microservice.
#
# Usage:
#   docker build -t cityparking-face-ai .
#   docker run -p 8001:8001 -v ~/.insightface:/root/.insightface cityparking-face-ai
# ============================================================

FROM python:3.11-slim

# Install OpenCV system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .
COPY app/ app/

# InsightFace models should be mounted as a volume
# docker run -v ~/.insightface:/root/.insightface ...
VOLUME ["/root/.insightface"]

EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
