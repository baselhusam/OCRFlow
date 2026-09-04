---
title: Model catalog
description: Every runnable task in OCRFlow today, grouped by provider, with input and output.
---

The catalog is **task-level**. A library is not a node. Status in the registry is `planned`, `in_progress`, `done`, or `deferred`. Only `done` tasks run inference.

`GET /api/v1/models/` lists metadata (filter by `category`, `provider`, `status`). The canvas palette is the same catalog, gated by [runtime availability](/documentation/connect-models).

## Loaders

| ID | Input → output | API |
| --- | --- | --- |
| `loader/pdf` | File → pages | `POST /api/v1/models/loader/pdf` |
| `loader/image` | File → page | `POST /api/v1/models/loader/image` |
| `loader/page-at` | `PageArtifact[]` → one page | `POST /api/v1/models/loader/page-at` |

Params: `dpi`, `max_pages` on loaders; `page_index` on select-page. `loader/page-branch` is spawn-only.

## Docling (`:8102`)

| ID | Category | Output |
| --- | --- | --- |
| `docling/layout-heron` | layout | regions |
| `docling/ocr-auto` | text recognition | `TextLine[]` |
| `docling/tableformer-accurate` | table structure | tables |
| `docling/picture-classifier-v2.5` | figure classification | figures |
| `docling/picture-description-smolvlm` | figure captioning | captions |
| `docling/code-formula-v2` | formula recognition | formulas |
| `docling/vlm-granite-docling` | VLM convert | document + markdown |
| `docling/convert-pipeline` | assembler | full Docling convert |

Details: [Docling](/documentation/docling).

## Surya (`:8101`, GPL-3.0)

| ID | Category |
| --- | --- |
| `surya/layout` | layout detection |
| `surya/text-detection` | text detection |
| `surya/text-recognition` | text recognition |
| `surya/reading-order` | reading order |
| `surya/table-recognition` | table structure |
| `surya/latex-ocr` | formula recognition |

Details: [Surya](/documentation/surya). Check license compatibility before shipping Surya in a proprietary product.

## Paddle (`:8103`)

| ID | Category |
| --- | --- |
| `paddle/doclayout-s` | layout detection |
| `paddle/ocr-v6-small` | text recognition |
| `paddle/pp-structure` | table / page structure |

Details: [Paddle](/documentation/paddle).

## Liquid AI (`:8104`)

Liquid's optional provider runs `LiquidAI/LFM2.5-VL-1.6B` in an isolated
Transformers service. It is a multilingual VLM for document comprehension and
prompted extraction rather than a bounding-box OCR engine.

| ID | Input → output |
| --- | --- |
| `liquid/vision-prompt` | page image + instruction → text |
| `liquid/vision-structured-extract` | page image + JSON Schema → validated JSON |

Details: [Liquid AI](/documentation/liquid).

## Local text and vision (`Ollama :11434`)

| ID | Input → output | Default |
| --- | --- | --- |
| `ollama/text-prompt` | text + prompt → text | Qwen3 0.6B |
| `ollama/structured-extract` | text + JSON Schema → validated JSON | Qwen3 0.6B |
| `ollama/vision-prompt` | page image + prompt → text | Qwen3.5 0.8B |
| `ollama/vision-structured-extract` | page image + JSON Schema → validated JSON | Qwen3.5 0.8B |

The model selector is deliberately restricted to weights at or below 1B
parameters. Start Ollama, pull `qwen3:0.6b` and `qwen3.5:0.8b`, then configure
the instruction and optional system prompt in Setup. Structured nodes require a
top-level object JSON Schema; malformed schemas are blocked before a run.

## Planned and deferred

The backend registry also lists Tesseract, RapidOCR, EasyOCR, docTR, TrOCR, Table Transformer, RapidLaTeXOCR, Florence-2, vLLM, export nodes, and more. They appear as future palette rows. Do not wire them expecting inference.

Implementation order in the living catalog: foundations → Docling → Surya → standalone models → LLM/VLM providers → presets.

## Compute hints

Registry `compute` is a hint (`cpu`, `gpu-low`, `gpu-mid`, `api`), not a scheduler. Pair heavy VLMs with [GPU & accelerators](/documentation/gpu). Layout-heron and OCR v6-small are the usual starting points on a single workstation GPU.
