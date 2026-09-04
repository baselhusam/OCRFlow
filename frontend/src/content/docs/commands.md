---
title: Commands
description: Make targets for the stack, OCR engines, GPUs, host development, and database migrations.
---

From the repository root, `make help` prints every target plus the detected accelerator. This page is the same map in prose.

## Platform

```bash
make detect                 # OS, GPU vendor, device, compose overlay
ACCELERATOR=cpu|nvidia|amd|mlx   # override on any target
```

## Docker — control plane

```bash
make up                     # frontend + gateway + worker + db; no OCR
make up-core                # alias for up
make up-all                 # core + OCR (GPU auto-detected)
make gpu-up                 # alias for up-all
make nvidia-up              # force CUDA
make amd-up                 # force ROCm
make up-fg                  # core in the foreground
make down                   # stop containers + host OCR
make down-v                 # also delete volumes (data, models, uploads)
make restart                # down + up
make build                  # build core images
make build-ocr              # build provider images
make ps                     # container + host OCR status
make logs                   # follow logs (make logs S=gateway)
make db-migrate             # alembic upgrade inside the gateway container
```

## OCR microservices

```bash
make ocr-surya              # :8101
make ocr-docling            # :8102
make ocr-paddle             # :8103
make ocr-liquid             # :8104, LFM2.5-VL-1.6B
make ocr-up                 # all four
make ocr-down
make ocr-ps
make ocr-logs
```

On Apple Silicon, Docling/Surya/Liquid start via `scripts/run-ocr-host.sh` (Metal). Paddle stays in Docker.

## Host development

Activate the backend virtualenv first (`activate` if you use that alias).

```bash
make be-api                 # uvicorn :8000
make be-worker              # Celery
make be-ocr-surya
make be-ocr-docling
make be-ocr-paddle
make be-ocr-liquid
make fe-dev                 # Next.js :3000
```

## Tests

```bash
make test                   # backend + frontend
cd backend && pytest
cd backend && pytest -m "not gpu"
cd frontend && npm run test
cd frontend && npm run lint
```

## Smoke

```bash
curl -s http://localhost:8000/health
curl -s http://localhost:8000/api/v1/models/runtime
```
