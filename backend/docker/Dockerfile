# Multi-stage image for the OCRFlow backend.
#
# Stages:
#   base     — system deps + shared Python deps + app code (no ML providers).
#   gateway  — the thin API gateway (RUNNER_MODE=remote forwards to services).
#   paddle   — internal service image with PaddleOCR deps.
#   docling  — internal service image with Docling deps.
#   surya    — internal service image with Surya deps.
#   liquid   — internal service image with Liquid LFM2.5-VL deps.
#
# The provider stages install ONLY their own provider's requirements on top of
# base, keeping their mutually-incompatible dependency stacks isolated in
# separate images. CPU wheels are installed by default. Pass
# ACCELERATOR=cuda|rocm (see docker-compose.nvidia.yml / docker-compose.amd.yml)
# to swap in GPU-enabled torch / paddlepaddle-gpu wheels.
#
# Build context is the `backend/` directory (see docker-compose.yml).

ARG PYTHON_BASE=python:3.11-slim

# --------------------------------------------------------------------------- #
FROM ${PYTHON_BASE} AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    OCRFLOW_MODEL_CACHE=/models \
    HF_HOME=/models/hf

WORKDIR /app

# Runtime libs needed by Pillow / pdf rasterization / OpenCV-style deps.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libglib2.0-0 \
        libgl1 \
        poppler-utils \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Shared base dependencies (cached independently of app code).
COPY requirements.txt ./
RUN pip install -r requirements.txt

# App source. Provider stages reuse this layer verbatim.
COPY . .

# --------------------------------------------------------------------------- #
FROM base AS gateway

ENV OCRFLOW_RUNNER_MODE=remote
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# --------------------------------------------------------------------------- #
FROM base AS paddle

ARG ACCELERATOR=cpu
ENV OCRFLOW_SERVICE_PROVIDER=paddle
COPY requirements-paddle.txt docker/install-paddle.sh ./
RUN chmod +x install-paddle.sh && ./install-paddle.sh "${ACCELERATOR}"
EXPOSE 8000
CMD ["uvicorn", "app.internal_service.app:app", "--host", "0.0.0.0", "--port", "8000"]

# --------------------------------------------------------------------------- #
FROM base AS docling

ARG ACCELERATOR=cpu
ENV OCRFLOW_SERVICE_PROVIDER=docling
COPY requirements-docling.txt docker/install-accelerator.sh ./
RUN pip install -r requirements-docling.txt \
    && chmod +x install-accelerator.sh \
    && ./install-accelerator.sh "${ACCELERATOR}"
EXPOSE 8000
CMD ["uvicorn", "app.internal_service.app:app", "--host", "0.0.0.0", "--port", "8000"]

# --------------------------------------------------------------------------- #
FROM base AS surya

ARG ACCELERATOR=cpu
ENV OCRFLOW_SERVICE_PROVIDER=surya
COPY requirements-surya.txt docker/install-accelerator.sh ./
RUN pip install -r requirements-surya.txt \
    && chmod +x install-accelerator.sh \
    && ./install-accelerator.sh "${ACCELERATOR}"
EXPOSE 8000
CMD ["uvicorn", "app.internal_service.app:app", "--host", "0.0.0.0", "--port", "8000"]

# --------------------------------------------------------------------------- #
FROM base AS liquid

ARG ACCELERATOR=cpu
ENV OCRFLOW_SERVICE_PROVIDER=liquid
COPY requirements-liquid.txt docker/install-accelerator.sh ./
RUN pip install -r requirements-liquid.txt \
    && chmod +x install-accelerator.sh \
    && ./install-accelerator.sh "${ACCELERATOR}"
EXPOSE 8000
CMD ["uvicorn", "app.internal_service.app:app", "--host", "0.0.0.0", "--port", "8000"]
