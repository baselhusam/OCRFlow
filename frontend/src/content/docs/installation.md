---
title: Installation
description: Docker Compose, hybrid host development, and fully manual Python/Node installs.
---

OCRFlow can run as containers, as a hybrid (host gateway + container OCR), or entirely on the host. Pick the mode that matches how you develop.

## Docker (recommended)

This is the default for trying the product and for most on-prem installs.

```bash
cp backend/docker/.env.example backend/docker/.env
make up
make db-migrate
```

| Target | What starts |
| --- | --- |
| `make up` / `make up-core` | Frontend, API gateway, Celery worker, Postgres, Redis. No OCR. |
| `make up-all` / `make gpu-up` | Core **and** every OCR microservice, with auto GPU detection. |
| `make ocr-up` | Only Surya, Docling, and Paddle. |

Frontend: `http://localhost:3000`. API: `http://localhost:8000`.

See [containerized serving](/documentation/connect-models) for runner modes and [Commands](/documentation/commands) for the full make surface.

## Hybrid host development

Keep FastAPI on the host (hot reload) and run OCR engines as optional Docker services — or as host processes on Apple Silicon.

1. Start Postgres and Redis:

```bash
docker compose -f backend/docker/docker-compose.yml up postgres redis
```

2. Copy env and point the gateway at remote providers:

```bash
cd backend
cp .env.example .env
# includes OCRFLOW_RUNNER_MODE=remote and localhost URLs on 8101 / 8102 / 8103
```

3. Create a virtualenv, install deps, migrate, and run the API:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

4. Start only the engines you need from the repo root:

```bash
make detect
make ocr-surya      # http://127.0.0.1:8101
make ocr-docling    # http://127.0.0.1:8102
make ocr-paddle     # http://127.0.0.1:8103
make be-worker      # Celery, required for full project/pipeline runs
```

5. Frontend:

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

On Apple Silicon, Docling and Surya start as **host** processes so they can use Metal/MPS. Paddle still runs in a `linux/amd64` container because there is no ARM GPU wheel.

## Fully manual (no Docker OCR)

Install extra requirement files when you want in-process models (`OCRFLOW_RUNNER_MODE=local`):

```bash
pip install -r requirements.txt
pip install -r requirements-docling.txt   # optional
pip install -r requirements-surya.txt     # optional
pip install -r requirements-paddle.txt    # optional
```

Local mode loads weights inside the gateway process. It is what the test suite exercises. Prefer **remote** mode in production so the gateway never imports ML stacks.

## Frontend environment

`frontend/.env.local` should point `API_URL` at the gateway (`http://localhost:8000` in host dev). The Next.js app proxies `/api/*` as a same-origin BFF; the browser does not talk to FastAPI directly.

## Verify

```bash
curl -s http://localhost:8000/health
curl -s http://localhost:8000/api/v1/models/runtime
```

Expect `mode=remote` in hybrid/Docker and only started providers with `running: true`.
