# OCRFlow — local inference services

How to **stop** and **start** Surya, Docling, Paddle, and Ollama on this machine.

On Apple Silicon, Surya, Docling, and Liquid must run **on the host** (PyTorch MPS). Paddle has no macOS ARM GPU wheel — use Docker (`make ocr-paddle`) or skip it. Do **not** `pip install` Paddle into `backend/.venv`; it fights Surya’s torch. Liquid needs `transformers>=5.1` while Surya pins `<5`, so Liquid lives in its own `backend/.venv-liquid` (the host runner prefers `backend/.venv-<provider>` when it exists).

Gateway (`:8000`), Next.js (`:3000`), Celery, Postgres, and Redis are separate. Leave them running unless you intend to stop the whole app.

## Ports

| Service | Port | Start (preferred) |
| --- | --- | --- |
| Surya | `8101` | `make ocr-surya` |
| Docling | `8102` | `make ocr-docling` |
| Paddle | `8103` | `make ocr-paddle` (Docker on Mac) |
| Liquid | `8104` | `make ocr-liquid` |
| Ollama | `11434` | `open -a Ollama` |

Health:

```bash
curl -s http://127.0.0.1:8101/health   # {"status":"ok","provider":"surya",...}
curl -s http://127.0.0.1:8102/health   # {"status":"ok","provider":"docling",...}
curl -s http://127.0.0.1:8103/health   # {"status":"ok","provider":"paddle",...}
curl -s http://127.0.0.1:8104/internal/health   # {"status":"ok","provider":"liquid",...}
curl -s http://127.0.0.1:11434/api/tags
```

## Stop

From the repo root:

```bash
make ocr-down
```

That only stops processes started via `scripts/run-ocr-host.sh` (pidfiles in `.ocr-run/`) plus Docker `surya` / `docling` / `paddle` / `liquid` containers.

If you started host uvicorn **by hand** (no pidfile), kill the listeners:

```bash
# Surya / Docling / Paddle / Liquid host processes
for p in 8101 8102 8103 8104; do
  pid=$(lsof -tiTCP:$p -sTCP:LISTEN) && kill "$pid"
done

# Ollama (macOS app relaunches `ollama serve` unless you quit it)
osascript -e 'quit app "Ollama"'
killall Ollama ollama 2>/dev/null || true
```

## Start again

From the **repository root**. Activate `backend/.venv` first (`activate` from `backend/`, or `source backend/.venv/bin/activate`).

### Ollama

```bash
open -a Ollama
# if the app is not installed: ollama serve

ollama pull qwen3:0.6b      # text + structured extract
ollama pull qwen3.5:0.8b    # vision (and optional text)
```

Host default URL: `OCRFLOW_OLLAMA_BASE_URL=http://127.0.0.1:11434` (see `backend/.env.example`).

Allowlisted models are at or below ~1B params: `qwen3:0.6b` and `qwen3.5:0.8b`.

### Surya (`:8101`)

```bash
make ocr-surya
```

Equivalent host command (no `--reload`; the internal service keeps predictors in process):

```bash
cd backend
activate
OCRFLOW_SERVICE_PROVIDER=surya OCRFLOW_RUNNER_MODE=local \
  uvicorn app.internal_service.app:app --host 127.0.0.1 --port 8101
```

Requires `pip install -r requirements-surya.txt` in `backend/.venv`.

### Docling (`:8102`)

```bash
make ocr-docling
```

Equivalent:

```bash
cd backend
activate
OCRFLOW_SERVICE_PROVIDER=docling OCRFLOW_RUNNER_MODE=local \
  uvicorn app.internal_service.app:app --host 127.0.0.1 --port 8102
```

Requires `pip install -r requirements-docling.txt`. First inference can download weights and take several minutes. Surya and Docling both use MPS — running both at once is valid but they compete for GPU memory.

### Paddle (`:8103`)

Paddle extras are **not** installed in the host venv. On this Mac, start the Docker service:

```bash
make ocr-paddle
```

Do not install `requirements-paddle.txt` into the same venv as Surya. Host-only (CPU, separate venv) if you must:

```bash
cd backend
activate
OCRFLOW_SERVICE_PROVIDER=paddle OCRFLOW_RUNNER_MODE=local \
  uvicorn app.internal_service.app:app --host 127.0.0.1 --port 8103
```

### Liquid (`:8104`)

```bash
make ocr-liquid
```

Runs from `backend/.venv-liquid` (create it once: `cd backend && python -m venv .venv-liquid && .venv-liquid/bin/pip install -r requirements-liquid.txt`). Do not install `requirements-liquid.txt` into `backend/.venv` — its `transformers>=5.1` breaks Surya. If Liquid is started from the shared venv, model load fails with `Tokenizer class TokenizersBackend does not exist`.

Equivalent:

```bash
cd backend
OCRFLOW_SERVICE_PROVIDER=liquid OCRFLOW_RUNNER_MODE=local \
  .venv-liquid/bin/uvicorn app.internal_service.app:app --host 127.0.0.1 --port 8104
```

### All OCR engines

```bash
make ocr-up     # Surya + Docling + Liquid on host; Paddle via Docker on Apple Silicon
make ocr-ps     # status
```

Gateway `OCRFLOW_RUNNER_MODE=remote` URLs are in `backend/.env.remote.example`:

- `OCRFLOW_SURYA_SERVICE_URL=http://127.0.0.1:8101`
- `OCRFLOW_DOCLING_SERVICE_URL=http://127.0.0.1:8102`
- `OCRFLOW_PADDLE_SERVICE_URL=http://127.0.0.1:8103`
- `OCRFLOW_LIQUID_SERVICE_URL=http://127.0.0.1:8104`

More Make targets: `frontend/src/content/docs/commands.md`.

## Documentation maintenance

After completing a feature, model integration, API or configuration change, or
operational workflow change, assess whether it changes information a user or
operator needs to know. Update the OCRFlow documentation only when the change
affects documented behavior, setup, model availability or usage, API contracts,
commands, deployment, or troubleshooting.

When an update is warranted, make the documentation change in the same task and
follow the established documentation structure, navigation, language, layout,
and visual theme. Do not add, rewrite, or expand documentation merely because
code changed when the existing docs remain accurate.
