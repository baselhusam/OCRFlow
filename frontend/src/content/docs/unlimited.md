---
title: Unlimited-OCR
description: Run Baidu Unlimited-OCR locally on Apple Silicon for end-to-end page and long-document parsing.
---

OCRFlow includes Baidu's **Unlimited-OCR** as an optional local provider. It is a 3B mixture-of-experts document parser (about 0.5B active parameters per token, MIT license) that reads a page image and writes the whole page in reading order: text, headings, HTML tables, LaTeX formulas, and figure captions, each with a layout box. One node replaces a layout → OCR → reading-order → table chain.

Its long-document mode reads up to 16 pages in a single generation, so context carries across page breaks (for example, a table that continues on the next page).

## Requirements

Unlimited-OCR runs through [MLX](https://github.com/ml-explore/mlx) on **Apple Silicon only**. There is no Docker image: Docker Desktop has no access to the Apple GPU.

| | |
| --- | --- |
| Checkpoint | `mlx-community/Unlimited-OCR-8bit` (3.9 GB download) |
| Memory | about 6 GB for single pages, about 9 GB for a 14-page pass |
| Speed (M3 Max) | about 4–6 s per dense page; 8 pages in one pass in about 36 s |

The 8-bit checkpoint matches the upstream model's output; 4-bit conversions drift on long pages. Set `OCRFLOW_UNLIMITED_MODEL` on the service to use another MLX conversion, such as `mlx-community/Unlimited-OCR-bf16`.

## Start the service

`mlx-vlm` pulls Transformers 5.x, which conflicts with Surya's `transformers<5` pin, so Unlimited-OCR always runs from its own virtualenv. Create it once:

```bash
make ocr-unlimited-setup
```

Then start the provider:

```bash
make ocr-unlimited
```

It listens on `http://127.0.0.1:8105`. The first inference downloads the weights to `OCRFLOW_MODEL_CACHE/unlimited`; for an air-gapped host, pre-seed that cache and set `HF_HUB_OFFLINE=1` on the service. `make ocr-up` starts it too once the virtualenv exists, and `make ocr-down` stops it.

```bash
curl -s http://127.0.0.1:8105/internal/health
# {"status":"ok","provider":"unlimited","device":"mlx",...}
```

A Dockerized gateway reaches the host service at `http://host.docker.internal:8105` by default; override it with `OCRFLOW_UNLIMITED_SERVICE_URL`.

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
