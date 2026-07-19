# OCRFlow Backend

Composable OCR pipelines, fully under your control.

## What this repo is

The OCRFlow **API and pipeline execution engine** — FastAPI service, headless pipeline runs, custom node registration, and (eventually) SDK surface.

## Sibling directories

| Path | Purpose |
|------|---------|
| `../frontend/` | Next.js landing page and canvas UI |
| `../branding/` | Logo, color palette, fonts, brand guidelines |

## Local development

```bash
activate  # activate Python venv

# 1. Start Postgres
cd docker && docker compose up -d

# 2. Install deps and migrate
pip install -r requirements.txt
pip install -r requirements-dev.txt
alembic upgrade head

# 3. (Optional) Install Docling for model inference
pip install -r requirements-docling.txt

# 3b. (Optional) Install Surya for alternative pipeline tasks
pip install -r requirements-surya.txt

# 4. Run API
uvicorn app.main:app --reload --port 8000
```

Copy `.env.example` to `.env` and `docker/.env.example` to `docker/.env` before first run.

Frontend (sibling repo): copy `../frontend/.env.local.example` to `.env.local`, then `npm run dev` in `../frontend/`.

## Docker services

Postgres runs via `docker/docker-compose.yml`. Model inference runs on the host (CPU/CUDA/MPS).

## Product context

OCRFlow lets developers build document-understanding pipelines on a visual canvas. Each stage (layout, OCR, tables, figures, LLM post-processing) is a swappable node. Pipelines run locally or in the cloud, export structured results, and ship as reusable templates.

Primary persona: **developers and ML engineers**.

## Package layout

| Path | Purpose |
|------|---------|
| `app/db/models/` | SQLAlchemy ORM (e.g. `User`) |
| `app/models/` | Model catalog: registry, `ModelRunner` protocol, provider runners |
| `app/models/docling/` | Docling adapter runners |
| `app/models/surya/` | Surya adapter runners |
| `app/api/v1/models/` | Model catalog + inference HTTP routes |
| `app/schemas/artifacts.py` | Shared pipeline wire types (`PageArtifact`, `Region`, …) |
| `docs/MODEL_CATALOG.md` | Living model catalog and implementation plan |
| `requirements-docling.txt` | Optional Docling ML dependencies |
| `requirements-surya.txt` | Optional Surya ML dependencies (v1.x, pinned `<0.20.0`) |

## Tests

```bash
activate
pip install -r requirements.txt -r requirements-dev.txt
pytest tests/ -v -m "not gpu"
```

GPU smoke tests use `@pytest.mark.gpu` and are skipped in CI without a GPU.

## Model API (Phase 1–2)

```bash
# Catalog
curl http://localhost:8000/api/v1/models/
curl http://localhost:8000/api/v1/models/docling/layout-heron
curl http://localhost:8000/api/v1/models/surya/layout

# Layout inference (multipart)
curl -X POST http://localhost:8000/api/v1/models/docling/layout-heron \
  -F "file=@tests/fixtures/docling/layout-heron/academic_single_column.png"

curl -X POST http://localhost:8000/api/v1/models/surya/layout \
  -F "file=@tests/fixtures/surya/layout/sample.png"
```
