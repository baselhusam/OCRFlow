# Enterprise & air-gapped deployment checklist

OCRFlow is designed for on-prem and air-gapped environments: the API gateway
never requires outbound network access once images and model weights are
staged. OCR engines (Surya, Docling, Paddle) are optional microservices.

## Core principles

1. **Control plane** — frontend, gateway, Celery worker, PostgreSQL, Redis.
2. **Data plane** — only the OCR providers you choose (`surya`, `docling`, `paddle`).
3. **No OCR by default** — `make up` / `make up-core` start core only.
4. **Runtime truth** — `GET /api/v1/models/runtime` reports which providers are up;
   the project canvas sidebar mirrors that automatically.

## Image & dependency bundle (air-gapped)

On a networked build host:

```bash
# Build core + selected provider images
docker compose --profile gateway --profile frontend --profile surya build

# Optional: save for transfer
docker save ocrflow-gateway ocrflow-frontend ocrflow-surya postgres:17-alpine redis:7-alpine \
  | gzip > ocrflow-images.tar.gz
```

On the air-gapped host:

```bash
gunzip -c ocrflow-images.tar.gz | docker load
# Copy repo + backend/docker/.env (no cloud credentials)
make up-core          # or: docker compose --profile gateway --profile frontend up -d
make ocr-surya        # only if Surya is needed (GPU auto-detected)
```

Pre-seed model caches into the named volumes (`ocrflow_surya_models`, etc.) or
bind-mount a prepared cache directory. Set offline flags in provider env when
applicable:

```bash
HF_HUB_OFFLINE=1
TRANSFORMERS_OFFLINE=1
```

## Recommended topology

| Profile / process | Role |
|-------------------|------|
| `postgres`, `redis` | Always on |
| `gateway` + `worker` | API + background runs |
| `frontend` | UI |
| `surya` / `docling` / `paddle` | Opt-in OCR |

Host hybrid (dev):

- Gateway: `uvicorn` with `OCRFLOW_RUNNER_MODE=remote` (see `.env.remote.example`)
- OCR: `make be-ocr-surya` (or Docker `make ocr-*`)
- Worker: `make be-worker` (or Docker `worker` with `make up`)

If Redis is up but no Celery worker is running, project/pipeline runs fall back to a
**subprocess** executor so local hybrid stacks still complete. Prefer a real worker
in production.

## APIs for headless / enterprise integration

| Use case | Endpoint |
|----------|----------|
| Runtime detection | `GET /api/v1/models/runtime` |
| Upload document | `POST /api/v1/projects/{id}/assets` |
| Bulk upload | `POST /api/v1/projects/{id}/assets/batch` |
| Project run | `POST /api/v1/projects/{id}/runs` |
| Bulk project runs | `POST /api/v1/projects/{id}/batch-runs` |
| Pipeline run | `POST /api/v1/pipelines/{id}/runs` `{"asset_id","project_id"}` |

Authenticate with JWT (`Authorization: Bearer …`). Browser clients use the
Next.js same-origin BFF under `/api/...`.

## Hybrid host ↔ container asset paths

When the gateway runs on the host (`uvicorn`) but OCR services run in Docker,
uploaded files live under the host `OCRFLOW_UPLOAD_DIR` (default
`~/.cache/ocrflow/uploads`). Provider containers must see the **same** files at
the same path they resolve via `asset:` URIs.

Options:

1. **Preferred for hybrid** — run OCR on the host too (`make be-ocr-surya`), so
   both share the host upload directory.
2. **Compose-only** — gateway + worker + OCR all in Docker share the
   `ocrflow_uploads` volume (`OCRFLOW_UPLOAD_DIR=/data/uploads`).
3. **Bind-mount** — mount the host upload dir into each OCR service at the same
   absolute path the gateway writes.

Mismatched paths surface as file-not-found inside Docling/Surya/Paddle, not as
gateway upload failures.

## Security hardening (production)

- Rotate `SECRET_KEY`; never ship the example default.
- Bind Postgres/Redis to private networks only (drop published ports in prod).
- Keep provider `/internal/*` on the private compose/K8s network.
- Prefer `OCRFLOW_RUNNER_MODE=remote` so the gateway never imports ML stacks.
- Run migrations: `make db-migrate` or `alembic upgrade head`.

## Smoke test after deploy

```bash
curl -s http://localhost:8000/health
curl -s http://localhost:8000/api/v1/models/runtime
# Expect mode=remote and only started providers with running=true
```

Open a project canvas: offline OCR chips should hide their models; start one
provider and confirm the left sidebar gains that provider’s components without
a full page reload (polls ~10s / on focus).
