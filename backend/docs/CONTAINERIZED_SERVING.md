# Containerized model serving

OCR models pull mutually-incompatible dependency stacks (Docling, Surya, and
PaddleOCR cannot reliably share one Python environment). To isolate them, each
provider runs as its own Docker image/service and the OCRFlow API becomes a thin
**gateway** that forwards inference to the right service over HTTP.

For on-prem / air-gapped packaging, image transfer, and smoke tests, see
[AIR_GAPPED.md](./AIR_GAPPED.md).

```
frontend ─► Next proxy ─► OCRFlow API (gateway)      ┌─ paddle  svc (requirements-paddle + internal app)
                          RUNNER_MODE=remote         ├─ docling svc (requirements-docling + internal app)
                          RemoteModelRunner ─HTTP──►  └─ surya   svc (requirements-surya + internal app)
                          GET /api/v1/models/runtime  (health-checks each service → who's running)
     postgres + redis (unchanged)
```

## Runner modes

`OCRFLOW_RUNNER_MODE` (default `local`):

- **local** — models load and run in-process, exactly as before. Single image,
  no behavior change. This is what the test suite exercises.
- **remote** — the gateway routes each remote-provider model
  (`docling/*`, `surya/*`, `paddle/*`) to a `RemoteModelRunner`
  (`app/models/remote_runner.py`) that POSTs the typed input to the provider
  service and parses the typed output back. Loaders and other light in-process
  work still run inside the gateway.

Routing lives in `app/models/runner_factory.py`; the set of remotely-servable
models and their schemas is in `app/models/servable.py`. Every call site
(`register_routes.py`, pipeline execution) is unchanged — they still funnel
through `get_cached_runner`.

## Internal service app

Each provider image runs the slim app in `app/internal_service/app.py`:

- `POST /internal/models/{model_id}` — validates the forwarded JSON against the
  model's input schema, runs the **local** runner (reused verbatim), returns the
  typed output. No auth, no database, no analytics — those stay in the gateway.
- `GET  /internal/models/{model_id}/health` — per-model health.
- `GET  /internal/health`, `GET /health` — liveness.

It binds no public ports; it is only reachable on the private compose network.

## Runtime availability

`GET /api/v1/models/runtime` (`app/services/runtime_availability.py`) reports
which provider backends are reachable right now:

- local mode → every remote provider reported `running: true` (in-process).
- remote mode → the gateway probes each service's `/internal/health`.

The frontend consumes this to gate the canvas: offline-provider nodes stay
visible in the palette but greyed with a "start the service" hint, and the
provider logo shows a status dot. See `frontend/src/lib/canvas/provider-availability.ts`.

## Running with Docker Compose

Infra (postgres, redis) has no profile and always starts. The gateway and each
provider service are gated behind profiles so you can run all or a subset.

```bash
cd backend/docker
cp .env.example .env

# Gateway + just the paddle service (CPU):
docker compose --profile gateway --profile paddle up --build

# Everything:
docker compose --profile all up --build

# Verify who is running:
curl http://localhost:8000/api/v1/models/runtime
```

The `gateway` profile also starts a **Celery worker** (`worker` service) that
consumes pipeline/project run jobs from Redis. OCR provider services stay off
unless you add their profiles (or use `--profile all`).

### Hybrid local development (recommended)

Keep the FastAPI gateway on the host (`uvicorn`) and start OCR engines as
optional Docker microservices. They are **not** loaded into the gateway process.

1. Postgres + Redis: `docker compose -f backend/docker/docker-compose.yml up postgres redis`
2. Copy `backend/.env.example` → `backend/.env` (includes `OCRFLOW_RUNNER_MODE=remote`
   and localhost service URLs on ports `8101` / `8102` / `8103`).
3. Gateway: `cd backend && uvicorn app.main:app --reload`
4. Start only the OCR engines you need from the repo root:
   - `make ocr-surya` → `http://127.0.0.1:8101`
   - `make ocr-docling` → `http://127.0.0.1:8102`
   - `make ocr-paddle` → `http://127.0.0.1:8103`
5. Frontend: `cd frontend && npm run dev`
6. Celery (for full project runs): `make be-worker`

`GET /api/v1/models/runtime` probes those ports. The project canvas left sidebar
shows online OCR services and hides offline provider nodes until you start them
(or use “Show offline”).

From the repo root, `make up-core` starts gateway + worker + frontend + db
**without** OCR providers; `make ocr-up` / `make ocr-down` manage the three
engines. In Docker, the worker replaces `make be-worker` from the hybrid flow
above — both use the same Celery app and Redis broker.

### Headless pipeline API

Reusable pipelines (no embedded file loaders) are executable via REST:

```bash
# Upload a document to a project you own
curl -H "Authorization: Bearer $TOKEN" -F file=@doc.pdf \
  http://localhost:8000/api/v1/projects/$PROJECT_ID/assets

# Start a pipeline run against that asset
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"asset_id\":\"$ASSET_ID\",\"project_id\":\"$PROJECT_ID\"}" \
  http://localhost:8000/api/v1/pipelines/$PIPELINE_ID/runs

# Poll status / result payload
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/pipelines/$PIPELINE_ID/runs/$RUN_ID
```

The gateway adapts the asset into the pipeline's declared input wire kind, then
executes the graph on the Celery worker (or an in-process thread fallback when
the broker is unreachable).

### GPU

The default images install CPU framework wheels. On an NVIDIA host with the
NVIDIA Container Toolkit, overlay the GPU file to reserve GPUs and switch
inference to CUDA:

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml --profile all up --build
```

For real GPU acceleration the provider images also need GPU-enabled wheels
(e.g. `paddlepaddle-gpu`, a CUDA torch build) — add them to the corresponding
`requirements-<provider>.txt` and pass a CUDA-capable Python base via the
`PYTHON_BASE` build arg. The gateway stays CPU-only; it does no inference.
