---
title: Air-gapped deploy
description: Package images and model weights for on-prem sites with no outbound network.
---

OCRFlow is designed for on-prem and air-gapped environments. Once images and model weights are staged, the API gateway never requires outbound network access. OCR engines are optional microservices — you ship only the ones you need.

## Core principles

1. **Control plane** — frontend, gateway, Celery worker, PostgreSQL, Redis.
2. **Data plane** — only the OCR providers you choose (`surya`, `docling`, `paddle`).
3. **No OCR by default** — `make up` starts core only.
4. **Runtime truth** — `GET /api/v1/models/runtime` reports who is up; the canvas sidebar mirrors that.

## Build on a networked host

```bash
docker compose --profile gateway --profile frontend --profile surya build

docker save ocrflow-gateway ocrflow-frontend ocrflow-surya postgres:17-alpine redis:7-alpine \
  | gzip > ocrflow-images.tar.gz
```

Add `--profile docling` / `--profile paddle` (and those image names) if those engines are in scope. Copy the repo, `backend/docker/.env` (no cloud credentials), and the tarball to the isolated site.

## Load on the air-gapped host

```bash
gunzip -c ocrflow-images.tar.gz | docker load
make up-core
make ocr-surya          # only if Surya is needed; GPU auto-detected
```

Pre-seed model caches into named volumes (`ocrflow_surya_models`, and the Docling/Paddle equivalents) or bind-mount a prepared cache directory. Set offline flags on provider env when applicable:

```bash
HF_HUB_OFFLINE=1
TRANSFORMERS_OFFLINE=1
```

## Recommended topology

| Process | Role |
| --- | --- |
| `postgres`, `redis` | Always on |
| `gateway` + `worker` | API + background runs |
| `frontend` | UI |
| `surya` / `docling` / `paddle` | Opt-in OCR |

If Redis is up but no Celery worker is running, project/pipeline runs fall back to a **subprocess** executor so local hybrid stacks still complete. Prefer a real worker in production.

## Hybrid asset paths

When the gateway runs on the host (`uvicorn`) but OCR runs in Docker, uploaded files live under `OCRFLOW_UPLOAD_DIR` (default `~/.cache/ocrflow/uploads`). Provider containers must see the **same** files at the same path they resolve via `asset:` URIs.

1. **Preferred for hybrid** — run OCR on the host too (`make be-ocr-surya`), so both share the host upload directory.
2. **Compose-only** — gateway + worker + OCR all in Docker share `ocrflow_uploads` (`OCRFLOW_UPLOAD_DIR=/data/uploads`).
3. **Bind-mount** — mount the host upload dir into each OCR service at the same absolute path the gateway writes.

Mismatched paths show up as file-not-found **inside** Docling/Surya/Paddle, not as gateway upload failures.

## Production hardening

- Rotate `SECRET_KEY`. Never ship the example default.
- Bind Postgres/Redis to private networks only; drop published ports in production.
- Keep provider `/internal/*` on the private compose/Kubernetes network.
- Prefer `OCRFLOW_RUNNER_MODE=remote` so the gateway never imports ML stacks.
- Run migrations: `make db-migrate` or `alembic upgrade head`.

## Smoke test

```bash
curl -s http://localhost:8000/health
curl -s http://localhost:8000/api/v1/models/runtime
```

Expect `mode=remote` and only started providers with `running: true`. Open a project canvas: offline OCR chips should hide their models; start one provider and confirm the left sidebar gains that provider's components without a full page reload.
