---
title: Unlimited-OCR
description: Run Baidu Unlimited-OCR locally on Apple Silicon or an NVIDIA GPU for end-to-end page and long-document parsing.
---

OCRFlow includes Baidu's **Unlimited-OCR** as an optional local provider. It is a 3B mixture-of-experts document parser (about 0.5B active parameters per token, MIT license) that reads a page image and writes the whole page in reading order: text, headings, HTML tables, LaTeX formulas, and figure captions, each with a layout box. One node replaces a layout → OCR → reading-order → table chain.

Its long-document mode reads up to 16 pages in a single generation, so context carries across page breaks (for example, a table that continues on the next page).

## Requirements

Unlimited-OCR runs on one of two platforms. The service picks the engine from the host.

| | Apple Silicon | Linux / Windows (WSL2) + NVIDIA |
| --- | --- | --- |
| Engine | [MLX](https://github.com/ml-explore/mlx) through `mlx-vlm` | Official checkpoint through Transformers (`trust_remote_code`), or the official vLLM server |
| Runs as | Host process (Docker has no access to the Apple GPU) | Docker `unlimited` service (CUDA overlay), or a host process |
| Checkpoint | `mlx-community/Unlimited-OCR-8bit` (3.9 GB download) | `baidu/Unlimited-OCR` (BF16) |
| Stack | `mlx-vlm>=0.7.8` | torch 2.10, Transformers 4.57.1 (the upstream-tested versions) |
| Memory | about 6 GB for single pages, about 9 GB for a 14-page pass | at least 8 GB of VRAM |

On Apple Silicon a dense page takes about 4–6 s on an M3 Max, and an 8-page pass about 36 s.

The 8-bit MLX checkpoint matches the upstream model's output; 4-bit conversions drift on long pages. Set `OCRFLOW_UNLIMITED_MODEL` on the service to load a different checkpoint, such as `mlx-community/Unlimited-OCR-bf16` on a Mac.

Every engine sends the same upstream recipe: `<image>document parsing.` with the *Detail* (gundam) or *Fast* (base) view for single pages, and `<image>Multi page parsing.` at 1024px with no crops for multi-page passes. Both use the sliding-window no-repeat 35-gram guard, with a window of 128 tokens for single pages and 1024 for multi-page passes.

The engine is chosen like this:

| `OCRFLOW_UNLIMITED_ENGINE` | Engine |
| --- | --- |
| `auto` (default) | `mlx` on Apple Silicon; otherwise `vllm` when `OCRFLOW_UNLIMITED_VLLM_URL` is set, else `transformers` |
| `mlx` | mlx-vlm (Apple Silicon only) |
| `transformers` | Upstream `infer` / `infer_multi` on CUDA. The upstream code calls `.cuda()`, so CPU-only hosts cannot run it. |
| `vllm` | Client of an OpenAI-compatible server started from `vllm/vllm-openai:unlimited-ocr` |

## Start the service

`make ocr-unlimited` starts the service for your platform. It listens on `http://127.0.0.1:8105`.

```bash
curl -s http://127.0.0.1:8105/internal/health
# {"status":"ok","provider":"unlimited","device":"mlx","runtime":"mlx",...}
```

The `runtime` field shows the selected engine. `make ocr-down` stops the service, and `make ocr-ps` shows its status.

### Apple Silicon

`mlx-vlm` pulls Transformers 5.x, which conflicts with Surya's `transformers<5` pin, so Unlimited-OCR runs from its own virtualenv. Create it once, then start the service:

```bash
make ocr-unlimited-setup
make ocr-unlimited
```

The first inference downloads the weights to `OCRFLOW_MODEL_CACHE/unlimited`. `make ocr-up` also starts the service once the virtualenv exists. A Dockerized gateway reaches the host service at `http://host.docker.internal:8105`; the Makefile sets this for you on Apple Silicon.

### NVIDIA (Docker)

With the NVIDIA Container Toolkit installed, `make ocr-unlimited` builds the `unlimited` image with CUDA torch and starts it with the NVIDIA overlay:

```bash
make ocr-unlimited
# same as:
docker compose -f docker-compose.yml -f backend/docker/docker-compose.nvidia.yml \
  --profile unlimited up -d --build unlimited
```

Weights download to the `ocrflow_unlimited_models` volume on first inference. On NVIDIA hosts, `make ocr-up`, `make nvidia-up` and `make up-all` include the service. The Compose gateway reaches it at `http://unlimited:8000`. Override that with `OCRFLOW_UNLIMITED_SERVICE_URL`.

To serve the model with vLLM instead, run:

```bash
make ocr-unlimited-vllm
```

This starts the official `vllm/vllm-openai:unlimited-ocr` image (`unlimited-vllm` service, profile `unlimited-vllm`) with upstream's `NGramPerReqLogitsProcessor`. It points the `unlimited` service at that server with `OCRFLOW_UNLIMITED_VLLM_URL=http://unlimited-vllm:8000`. On Hopper GPUs with CUDA 12.9, set `UNLIMITED_VLLM_TAG=unlimited-ocr-cu129`. vLLM's first start downloads the weights and can take several minutes. The *Fast* page view asks the vLLM server for the base (no-crop) view.

### NVIDIA (host)

On a Linux host without Docker, `make ocr-unlimited-setup` installs the CUDA stack into `backend/.venv-unlimited`. Then start the service with:

```bash
OCR_SERVE=host make ocr-unlimited
```

For an air-gapped host, pre-seed the model cache (`OCRFLOW_MODEL_CACHE/unlimited`, or the `ocrflow_unlimited_models` volume) and set `HF_HUB_OFFLINE=1` on the service.

## Canvas nodes

| Node | Input → output | Use it for |
| --- | --- | --- |
| `unlimited/document-parse` | page image → DocumentArtifact + markdown | Accurate per-page parsing; use **Apply to all pages** for a whole PDF |
| `unlimited/multi-page-parse` | PDF or image → DocumentArtifact + markdown | Long documents read in one pass per chunk, keeping cross-page context |

**Page Parse** options:

- **Page view** — *Detail* tiles the page into 640px crops plus a 1024px overview, which suits small print and dense pages. *Fast* reads a single 1024px view.
- **Max output tokens** — the generation limit for one page (default 8192).
- **Keep headers, footers & page numbers** — page furniture is always kept as regions, but it is left out of the markdown unless this is on.

**Multi-page Parse** accepts a PDF loader upstream or a test document dropped on the node. **Pages per pass** (1–16, default 8) sets how many pages share one generation. **Max pages** caps how much of the file is read, and **Render DPI** sets the rasterization resolution.

Both nodes output a `DocumentArtifact`. Each page carries regions with normalized boxes, text blocks, tables (`html`), formulas (`latex`), figures with their captions, and reading order. The output also includes readable `markdown` (GFM tables, `$…$` math, `---` between pages) and the model's raw text. Wire the output into an LLM extraction node, or export it.

## API

```text
POST /api/v1/models/unlimited/document-parse
POST /api/v1/models/unlimited/multi-page-parse
```

`document-parse` takes a `PageImage` and `options` (`mode`, `max_tokens`, `include_furniture`). `multi-page-parse` takes a `DocumentInput` (`asset:{id}` with `options.project_id`, or a base64 PDF/image) and `options` (`pages_per_pass`, `max_pages`, `dpi`, `include_furniture`). Both return `document`, `markdown`, `raw_text`, and `meta` (pages, passes, token counts, speed, peak memory, and warnings, such as an output that hit its token limit).

## Notes

- Multi-page mode is not faster than parsing pages one by one on a Mac. Its value is shared context, and generation slows slightly as more pages fill the prompt.
- Boxes are page-level layout boxes, not word or line polygons, and there are no confidence scores. Pair the output with Surya or Paddle when you need line geometry.
- Heavily degraded scans keep their text, but complex table structure can drift (extra or merged columns).
