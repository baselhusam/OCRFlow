---
title: Connect OCR models
description: Start Docling, Surya, and Paddle as microservices and watch them appear in the palette.
---

OCR models pull mutually incompatible Python stacks. They cannot share one venv reliably. OCRFlow therefore runs each provider as its **own process/image**. The gateway is a thin router.

## Runner modes

`OCRFLOW_RUNNER_MODE` (default `local` in some test configs; use `remote` for Docker/hybrid):

| Mode | Behavior |
| --- | --- |
| `local` | Weights load in the gateway process. One environment. Used by the test suite. |
| `remote` | `docling/*`, `surya/*`, `paddle/*` POST to the matching internal service. Loaders stay local. |

Routing is `get_cached_runner` → `RemoteModelRunner` when the model is remotely servable.

## Internal service

Each provider image runs a slim app:

- `POST /internal/models/{model_id}` — validate, run, return typed output
- `GET /internal/models/{model_id}/health`
- `GET /internal/health` and `GET /health`
- `GET /internal/capabilities` — protocol version, provider name, and model IDs

No public ports, no auth, no database. Those stay on the gateway. Only the compose/Kubernetes network should reach `/internal/*`.

## Connect a remote engine

Administrators can open **Configuration → OCR engine control room** and connect a
supported provider at any reachable HTTP(S) IP address and port. The connection
is tested before it can be enabled:

1. `GET /internal/health` confirms the provider, detects whether an API key is
   required, and checks protocol version **v1**.
2. `GET /internal/capabilities` compares the engine's advertised models with
   OCRFlow's supported models.
3. `GET /internal/models/{model_id}/health` is called for every advertised,
   supported model API.

The page reports an exact state: ready, partial, credentials needed,
incompatible (including the found vs required protocol version), or offline.
For a partial engine, only the model APIs that passed are enabled on the
canvas; the other nodes remain unavailable. A verified, enabled remote engine
is selected by the gateway for its passing models, without requiring the
engine to be launched from this repository.

Bearer tokens and `X-API-Key` credentials are supported. Stored credentials
are encrypted with the deployment `SECRET_KEY` and are never returned by the
API.

## Start providers

From the repo root, after `make detect`:

```bash
make ocr-surya       # http://127.0.0.1:8101
make ocr-docling     # http://127.0.0.1:8102
make ocr-paddle      # http://127.0.0.1:8103
make ocr-up          # all three
```

Host-native equivalents: `make be-ocr-surya`, `be-ocr-docling`, `be-ocr-paddle`.

Gateway env (hybrid) should include URLs such as:

```bash
OCRFLOW_RUNNER_MODE=remote
OCRFLOW_SURYA_URL=http://127.0.0.1:8101
OCRFLOW_DOCLING_URL=http://127.0.0.1:8102
OCRFLOW_PADDLE_URL=http://127.0.0.1:8103
```

Exact variable names live in `backend/.env.example` — copy that file rather than inventing keys.

## Confirm runtime

```bash
curl -s http://localhost:8000/api/v1/models/runtime
```

In remote mode the gateway probes each `/internal/health`. The JSON lists providers with `running: true|false`. The canvas reads this endpoint (via the Next.js BFF) and updates chips without a reload.

## Palette behavior

- Offline provider nodes: visible, greyed, "start the service" hint.
- Provider logo: status dot.
- **Show offline** reveals everything if you are composing a graph before GPUs are attached.

## First inference

Weights download on first `run` (or an explicit warm-up if you call the model's health/load path). Subsequent calls reuse a **per-process singleton**. Cold start can take minutes on CPU; GPUs cut that sharply.

For air-gapped sites, pre-seed caches — [Air-gapped deploy](/documentation/air-gapped).
