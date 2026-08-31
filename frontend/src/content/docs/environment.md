---
title: Environment
description: Gateway secrets, runner mode, provider URLs, admin bootstrap, and frontend API_URL.
---

Copy examples; do not invent keys. **Backend Docker:** `backend/docker/.env.example` → `backend/docker/.env`. **Host gateway:** `backend/.env.example` → `backend/.env`. **Frontend:** `frontend/.env.local.example` → `frontend/.env.local`.

## Gateway essentials

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL (asyncpg) |
| `REDIS_URL` | Celery broker / cache |
| `SECRET_KEY` | JWT signing — rotate in production |
| `ADMIN_EMAIL` | First matching login/register becomes `admin` |
| `OCRFLOW_RUNNER_MODE` | `local` or `remote` |
| `OCRFLOW_UPLOAD_DIR` | Where assets are stored |

Never commit filled `.env` files. Never ship the example `SECRET_KEY`.

## Remote providers

When `OCRFLOW_RUNNER_MODE=remote`, the gateway needs URLs for each engine you start. Host hybrid typically uses:

- Surya `http://127.0.0.1:8101`
- Docling `http://127.0.0.1:8102`
- Paddle `http://127.0.0.1:8103`

Compose sets service DNS instead of localhost. See `backend/.env.example` and `backend/.env.remote.example` for the exact names.

Ollama is an external local runtime in both modes. Configure
`OCRFLOW_OLLAMA_BASE_URL` (host default: `http://127.0.0.1:11434`; compose:
`http://ollama:11434`). The gateway and worker must resolve the same endpoint.
Runtime health probes `/api/tags`, so unavailable local-model nodes are visibly
disabled instead of failing only after a run starts.

## Provider containers

Useful flags on OCR services (especially air-gapped):

```bash
HF_HUB_OFFLINE=1
TRANSFORMERS_OFFLINE=1
```

Device / accelerator is usually injected by compose overlays (`docker-compose.nvidia.yml`, `docker-compose.amd.yml`) or by `scripts/run-ocr-host.sh` on Mac.

## Frontend

`API_URL` (or the equivalent in `.env.local.example`) must point at the gateway. The browser talks to Next.js; Next.js proxies to FastAPI with the session cookie.

## Theme of the product vs docs

The marketing landing page is forced **light**. The app and these docs follow the stored theme (default **light**). That is `THEME_INIT_SCRIPT` in the frontend — not an env var.

## Celery

Workers share the same Redis and `SECRET_KEY`/database as the gateway. If Redis is up and no worker is running, some runs fall back to a subprocess executor. Production: always run `worker`.
