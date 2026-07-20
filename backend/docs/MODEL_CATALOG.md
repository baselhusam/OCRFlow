# OCRFlow Model Catalog & Implementation Plan

Living document for **categories**, **models**, and **per-model implementation requirements**.
We implement and validate models **one at a time**, starting with **Docling**, then **Surya** (per task), then the rest.

**Status legend:** `planned` · `in_progress` · `done` · `deferred`

---

## How to use this document

1. Pick the next model entry (see [Implementation order](#implementation-order)).
2. Implement everything in [Per-model deliverables](#per-model-deliverables-mandatory-checklist).
3. Mark status in this file and link the PR.
4. Multi-task libraries (**Docling**, **Surya**) are **not** one node — each **task** gets its own API, schemas, validation, and tests.

**Related docs (Phase 0 — done):**

| Path | Purpose | Status |
|------|---------|--------|
| [`app/schemas/artifacts.py`](../app/schemas/artifacts.py) | Shared pipeline wire types (`PageArtifact`, `Region`, …) | done |
| [`app/models/registry.py`](../app/models/registry.py) | Model metadata registry (id, category, deps, compute) | done |
| [`app/models/base.py`](../app/models/base.py) | `ModelRunner` protocol: `load`, `run`, `health` | done |
| [`app/models/base_runner.py`](../app/models/base_runner.py) | Abstract runner with logging, timeout, image guards | done |
| [`app/models/cache.py`](../app/models/cache.py) | Process-wide lazy-load runner cache | done |
| [`app/models/errors.py`](../app/models/errors.py) | `ModelLoadError`, `ModelInferenceError`, `ModelValidationError` | done |
| `app/api/v1/models/` | HTTP endpoints per task | done |
| [`tests/models/`](../tests/models/) | Unit + smoke tests per model/task | done (scaffolding) |
| [`tests/fixtures/`](../tests/fixtures/) | Golden images/PDFs + expected JSON | done (README; golden files in Phase 1) |

**Package layout note:** SQLAlchemy ORM lives in `app/db/models/`; `app/models/` is reserved for the model catalog and runners.

---

## Design principles

| Principle | Rule |
|-----------|------|
| **Canvas ↔ API parity** | Anything on the canvas must work headless via API/SDK |
| **Typed wires** | Nodes connect only when output type satisfies input type |
| **Atomic tasks** | One HTTP endpoint = one task (even if the library bundles many) |
| **Adapter, don't fork** | Wrap Docling/Surya/etc.; don't reimplement their inference |
| **Self-host first** | Default catalog = Apache/MIT, runnable on-prem |
| **Lazy model load** | Load weights on first request or explicit warm-up; share singleton per process |

---

## Shared pipeline artifacts (wire types)

All model tasks consume/produce subsets of these Pydantic models (Phase 0).

### Primitives

```python
BBox          # normalized [x0,y0,x1,y1] in 0..1
Polygon       # list of [x,y] normalized points
LayoutLabel   # enum: paragraph, title, table, figure, list, header, footer, ...
```

### Core types

| Type | Description |
|------|-------------|
| `PageImage` | Single page raster + dimensions + `page_index` |
| `DocumentInput` | PDF path/bytes/URL or image list |
| `Region` | Labeled layout box on a page |
| `TextLine` | Text box (optionally with `text` after recognition) |
| `TableStructure` | Rows/cols/cells (+ optional text) |
| `Formula` | Bbox + LaTeX |
| `Figure` | Bbox + optional caption/description |
| `ReadingOrder` | Ordered list of region/line IDs |
| `PageArtifact` | Page + optional regions, lines, tables, formulas, figures, reading_order |
| `DocumentArtifact` | `pages[]` + metadata |
| `DoclingDocumentRef` | Adapter type: serialized Docling native doc (for Docling-only stages) |

### Type compatibility (node wiring)

| Producer task | Wire output | Typical consumers |
|---------------|-------------|-------------------|
| Page loader | `PageArtifact` | Layout, VLM, preprocess |
| Layout detection | `PageArtifact` + `regions` | Reading order, text det, tables, figures |
| Text detection | `TextLine[]` | Text recognition |
| Text recognition | `TextLine[]` (with text) | Assembler |
| Reading order | `reading_order` | Assembler |
| Table structure | `TableStructure[]` | Cell OCR, assembler |
| VLM convert | `DocumentArtifact` + markdown | Export, LLM |
| Assembler | `DocumentArtifact` | Export, LLM |

---

## Per-model deliverables (mandatory checklist)

Every model **task** (row in this catalog) must ship the following before marking `done`:

### 1. Registry entry

```yaml
id: docling/layout-heron
category: layout_detection
provider: docling
status: planned
compute: gpu-low          # cpu | gpu-low | gpu-mid | api
license: apache-2.0
python_extra: docling     # optional-dependencies group in pyproject.toml
```

### 2. Runner class

Path pattern: `app/models/<provider>/<task>.py`

```python
class DoclingLayoutHeronRunner(ModelRunner):
    async def load(self, config: ModelConfig) -> None: ...
    async def run(self, input: LayoutDetectionInput) -> LayoutDetectionOutput: ...
    async def health(self) -> ModelHealth: ...
    async def unload(self) -> None: ...
```

Requirements:

- [ ] Lazy load / singleton cache
- [ ] Explicit `device` from config (`cpu`, `cuda`, `mps`)
- [ ] Timeout + max image dimension guards
- [ ] Structured logging (model id, latency, device)

### 3. Input / output schemas

Path pattern: `app/schemas/models/<provider>/<task>.py`

- [ ] Pydantic `*Input` with field validators (image size, page_index, langs)
- [ ] Pydantic `*Output` stable for pipeline serialization
- [ ] `model_config` example in docstring for OpenAPI

### 4. Validation layer

Path pattern: `app/models/<provider>/<task>_validate.py`

- [ ] Post-conditions (e.g. bboxes in 0..1, non-empty text when confidence > threshold)
- [ ] Normalization (coordinate system, label mapping to `LayoutLabel`)
- [ ] Error types: `ModelLoadError`, `ModelInferenceError`, `ValidationError`

### 5. API route

Path pattern: `app/api/v1/models/<provider>/<task>.py`

```
POST /api/v1/models/docling/layout-heron
POST /api/v1/models/docling/layout-heron/health
```

- [ ] Accepts JSON or `multipart/form-data` (image upload)
- [ ] Returns same schema as runner output
- [ ] OpenAPI tags: `models`, `docling`

### 6. Tests

| Test | Path | Purpose |
|------|------|---------|
| Schema round-trip | `tests/models/<provider>/test_<task>_schemas.py` | JSON serialize/deserialize |
| Validation | `tests/models/<provider>/test_<task>_validate.py` | Bbox/text invariants |
| Smoke (optional GPU) | `tests/models/<provider>/test_<task>_smoke.py` | Real inference on fixture |
| Golden output | `tests/fixtures/<provider>/<task>/` | Regression on expected JSON |

Mark GPU tests: `@pytest.mark.gpu` — skipped in CI without GPU.

### 7. CLI smoke script (developer ergonomics)

Path pattern: `scripts/run_model_<provider>_<task>.py`

```bash
activate
python scripts/run_model_docling_layout_heron.py --image tests/fixtures/sample_page.png
```

### 8. Documentation

- [ ] Update status in this file
- [ ] Note VRAM/RAM, first-run download size, known limits

---

## Implementation order

Phases are intentional — later models depend on artifacts and patterns from earlier ones.

| Phase | Focus | Goal |
|-------|-------|------|
| **0** | Foundations | Shared artifacts, `ModelRunner` protocol, registry, test layout |
| **1** | **Docling** | First production-quality stack; covers most categories |
| **2** | **Surya** | Per-task APIs for comparison / alternative pipeline |
| **3** | Standalone models | Tesseract, Table Transformer, RapidLaTeXOCR, Florence-2, … |
| **4** | LLM / VLM providers | Ollama, vLLM, OpenAI-compatible cloud |
| **5** | Presets & pipelines | Multi-node templates (modular vs VLM shortcut) |

### Phase 1 — Docling task order (recommended)

1. `docling/layout-heron` — layout detection (default)
2. `docling/ocr-auto` — OCR stage (engine auto-select; then specific engines)
3. `docling/tableformer-accurate` — table structure
4. `docling/picture-classifier` — figure type classification
5. `docling/vlm-granite-docling` — full-page VLM convert
6. `docling/picture-description-smolvlm` — figure captioning
7. `docling/code-formula-v2` — code & formula extraction
8. `docling/convert-pipeline` — full `DocumentConverter` preset (integration node)

### Phase 2 — Surya task order (recommended)

1. `surya/layout`
2. `surya/reading-order`
3. `surya/text-detection`
4. `surya/text-recognition`
5. `surya/table-recognition`
6. `surya/latex-ocr`

---

## Categories

| # | Category ID | Display name | Status |
|---|-------------|--------------|--------|
| 0 | `preprocess` | Preprocess | planned |
| 1 | `page_loader` | Page Loader | planned |
| 2 | `layout_detection` | Layout Detection | planned |
| 3 | `text_detection` | Text Detection | planned |
| 4 | `text_recognition` | Text Recognition | planned |
| 5 | `reading_order` | Reading Order | planned |
| 6 | `table_detection` | Table Detection | planned |
| 7 | `table_structure` | Table Structure | planned |
| 8 | `table_cell_ocr` | Table Cell OCR | planned |
| 9 | `formula_detection` | Formula Detection | planned |
| 10 | `formula_recognition` | Formula Recognition | planned |
| 11 | `figure_classification` | Figure Classification | planned |
| 12 | `figure_captioning` | Figure Captioning | planned |
| 13 | `vlm_convert` | VLM Convert (end-to-end) | planned |
| 14 | `assembler` | Document Assembler | planned |
| 15 | `llm_extract` | LLM Structured Extract | planned |
| 16 | `export` | Export | planned |

---

# Provider: Docling

**Why first:** Mature pipeline, permissive license, strong layout models (Heron/Egret), TableFormer, Granite-Docling VLM, and a native `DoclingDocument` representation we can map to `DocumentArtifact`.

**Package:** `docling` (+ transitive `docling-ibm-models`, etc.)  
**Docs:** https://docling-project.github.io/docling/  
**Model catalog:** https://docling-project.github.io/docling/usage/model_catalog/

**Integration strategy:**

- Expose each Docling **stage** as a separate OCRFlow task/API.
- Map Docling native types → OCRFlow `PageArtifact` / `DocumentArtifact`.
- Allow `DoclingDocumentRef` passthrough between Docling stages to avoid lossy conversion when chaining Docling-only nodes.
- Full `DocumentConverter` is a **preset integration node**, not a replacement for atomic tasks.

---

## Docling — `layout_detection`

### `docling/layout-heron` ⭐ default

| Field | Value |
|-------|-------|
| Status | `done` |
| Phase | 1.1 |
| Docling model | `docling-layout-heron` (RT-DETRv2-r50vd, ~43M params) |
| Inference | `docling-ibm-models` — CPU, CUDA, MPS, XPU |

**Input schema (`LayoutDetectionInput`):**

```json
{
  "page": { "page_index": 0, "image_base64": "...", "width": 1654, "height": 2339 },
  "options": {
    "keep_empty_clusters": false,
    "skip_cell_assignment": false
  }
}
```

**Output schema (`LayoutDetectionOutput`):**

```json
{
  "page_index": 0,
  "regions": [
    {
      "id": "r1",
      "label": "paragraph",
      "docling_label": "TEXT",
      "bbox": [0.1, 0.2, 0.9, 0.3],
      "confidence": 0.97
    }
  ],
  "meta": { "model_id": "docling/layout-heron", "latency_ms": 120 }
}
```

**Label mapping:** Docling labels (`TEXT`, `TABLE`, `PICTURE`, `SECTION_HEADER`, `PAGE_HEADER`, `PAGE_FOOTER`, `CAPTION`, `LIST_ITEM`, `FORMULA`, …) → OCRFlow `LayoutLabel` enum.

**Validation:**

- [ ] Every `bbox` within `[0,1]`, `x1>x0`, `y1>y0`
- [ ] `docling_label` preserved in output for debugging
- [ ] Region `id` stable and unique per page

**Load / run:**

- [ ] Use Docling layout model API (`LayoutOptions(model_spec=DOCLING_LAYOUT_HERON)`)
- [ ] Run on single `PageImage` (Docling pipeline stage isolation — verify if stage-only API or thin wrapper around converter with early exit)

**Tests:**

- [ ] Fixture: single-column academic page
- [ ] Fixture: page with table + figure
- [ ] Golden: `tests/fixtures/docling/layout-heron/`

---

### `docling/layout-heron-101`

| Field | Value |
|-------|-------|
| Status | `planned` |
| Phase | 1.1 |
| Notes | Higher accuracy (~77M params); slower. Same schemas as `layout-heron`. |

---

### `docling/layout-egret-medium`

| Field | Value |
|-------|-------|
| Status | `planned` |
| Phase | 1.1 |
| Docling model | `docling-layout-egret-medium` (DFINE-m, ~19.5M params) |
| Notes | Efficiency tier; same I/O as Heron. |

---

### `docling/layout-egret-large` / `docling/layout-egret-xlarge`

| Field | Value |
|-------|-------|
| Status | `deferred` |
| Phase | 3 |
| Notes | Quality tier when GPU available. |

---

## Docling — `text_recognition` (OCR stage)

Docling's OCR stage is an **engine** abstraction. Each engine is a separate OCRFlow task with shared schemas.

**Shared input (`OcrRecognitionInput`):**

```json
{
  "page": { "page_index": 0, "image_base64": "..." },
  "regions": [],
  "languages": ["eng"],
  "engine_options": {}
}
```

**Shared output (`OcrRecognitionOutput`):**

```json
{
  "page_index": 0,
  "lines": [
    { "id": "l1", "bbox": [], "text": "Hello", "confidence": 0.95, "language": "eng" }
  ]
}
```

### `docling/ocr-auto` ⭐

| Field | Value |
|-------|-------|
| Status | `done` |
| Phase | 1.2 |
| Engine | Auto-select best available |

### `docling/ocr-tesseract`

| Field | Value |
|-------|-------|
| Status | `planned` |
| Phase | 1.2 |
| Engine | Tesseract CLI or `tesserocr` |
| Compute | `cpu` |
| Extra | System `tesseract` binary or pip `tesserocr` |

### `docling/ocr-easyocr`

| Field | Value |
|-------|-------|
| Status | `planned` |
| Phase | 3 |

### `docling/ocr-rapidocr`

| Field | Value |
|-------|-------|
| Status | `planned` |
| Phase | 1.2 |
| Notes | Good ONNX/air-gapped option |

### `docling/ocr-surya`

| Field | Value |
|-------|-------|
| Status | `planned` |
| Phase | 2 |
| Notes | Docling's SuryaOCR engine — distinct from standalone `surya/*` tasks but should produce identical wire format |

### `docling/ocr-macos-vision`

| Field | Value |
|-------|-------|
| Status | `deferred` |
| Notes | macOS only |

**Per-engine deliverables:** Same checklist as [Per-model deliverables](#per-model-deliverables-mandatory-checklist); only `engine_options` and loader differ.

---

## Docling — `table_structure`

### `docling/tableformer-fast` ⭐

| Field | Value |
|-------|-------|
| Status | `planned` |
| Phase | 1.3 |
| Mode | `TableFormerMode.FAST` |

**Input (`TableStructureInput`):**

```json
{
  "page": { "page_index": 0, "image_base64": "..." },
  "tables": [{ "id": "t1", "bbox": [0.1, 0.4, 0.9, 0.8] }],
  "options": { "do_cell_matching": true }
}
```

**Output (`TableStructureOutput`):**

```json
{
  "page_index": 0,
  "tables": [{
    "id": "t1",
    "rows": 3, "cols": 4,
    "cells": [{ "row": 0, "col": 0, "bbox": [], "text": "Header", "is_header": true }],
    "otsl": "...",
    "html": "<table>...</table>"
  }]
}
```

**Validation:**

- [ ] Cell bboxes inside table bbox
- [ ] Row/col indices contiguous
- [ ] `html` well-formed (optional `lxml` check)

---

### `docling/tableformer-accurate` ⭐

| Field | Value |
|-------|-------|
| Status | `done` |
| Phase | 1.3 |
| Mode | `TableFormerMode.ACCURATE` |
| Notes | Default for quality pipelines |

---

### `docling/tablestructure-granite-vision`

| Field | Value |
|-------|-------|
| Status | `deferred` |
| Phase | 4 |
| Model | `granite-vision-4.1-4b` (VLM table structure, OTSL output) |

---

## Docling — `figure_classification`

### `docling/picture-classifier-v2.5` ⭐

| Field | Value |
|-------|-------|
| Status | `done` |
| Phase | 1.4 |
| Model | `DocumentFigureClassifier-v2.5` (ViT) |

**Output:** `Figure` with `category` ∈ {`bar_chart`, `photograph`, `logo`, `other`, …}

**Input:** `PageArtifact` (classifies the full page when no figure regions are provided) or optional figure regions from layout detection.

---

## Docling — `vlm_convert`

### `docling/vlm-granite-docling` ⭐

| Field | Value |
|-------|-------|
| Status | `done` |
| Phase | 1.5 |
| Preset | `granite_docling` |
| Model | Granite-Docling-258M |
| Output format | DocTags → Markdown / JSON |

**Input (`VlmConvertInput`):**

```json
{
  "document": { "source": "path-or-url-or-base64", "format": "pdf" },
  "options": {
    "preset": "granite_docling",
    "engine": "transformers",
    "export": ["markdown", "json"]
  }
}
```

**Output (`VlmConvertOutput`):**

```json
{
  "document": { "pages": [] },
  "doctags": "...",
  "markdown": "# Title\n...",
  "json": {}
}
```

**Validation:**

- [ ] DocTags parseable
- [ ] Markdown non-empty for non-blank pages
- [ ] Map to `DocumentArtifact` without losing table/formula structure

---

### Other VLM presets (deferred)

| ID | Preset | Params | Notes |
|----|--------|--------|-------|
| `docling/vlm-smoldocling` | `smoldocling` | 256M | DocTags |
| `docling/vlm-qwen2.5-vl-3b` | `qwen` | 3B | Markdown |
| `docling/vlm-deepseek-ocr` | `deepseek_ocr` | 3B | API-only (Ollama/LM Studio) |

---

## Docling — `figure_captioning`

### `docling/picture-description-smolvlm` ⭐

| Field | Value |
|-------|-------|
| Status | `done` |
| Phase | 1.6 |
| Preset | `smolvlm` (SmolVLM-256M) |

**Input:** `Figure` crop or bbox on page  
**Output:** `Figure` with `description` text

---

### `docling/picture-description-granite-vision`

| Field | Value |
|-------|-------|
| Status | `deferred` |
| Preset | `granite_vision` (2B) |

---

## Docling — `formula_recognition` (+ code)

### `docling/code-formula-v2` ⭐

| Field | Value |
|-------|-------|
| Status | `done` |
| Phase | 1.7 |
| Preset | `codeformulav2` |

**Output:** `Formula` with `latex` and `inline: bool`; code blocks as separate type or `Region` with `label=code`

---

## Docling — integration preset

### `docling/convert-pipeline` ⭐

| Field | Value |
|-------|-------|
| Status | `done` |
| Phase | 1.8 |
| Category | `assembler` (full pipeline) |

Wraps `DocumentConverter` with configurable `ConvertPipelineOptions`:

- Layout model selection
- OCR engine
- TableFormer mode
- Enrichments (pictures, formulas)

**Purpose:** One-node "Docling default" for users who don't want modular wiring.  
**Still required:** Atomic tasks above for canvas composability.

---

# Provider: Surya

**Package:** `surya-ocr` (pinned `>=0.17.0,<0.20.0` in `requirements-surya.txt`)  
**Repo:** https://github.com/datalab-to/surya  
**Note:** Surya bundles many tasks. **Each row below = separate OCRFlow task.**

Shared Surya runner concerns:

- [x] Single `SuryaFoundationCache` for shared weights across tasks in one process
- [x] `languages` param where applicable
- [x] Document images only (not general photos) — document in API description

---

## Surya — `layout_detection`

### `surya/layout`

| Field | Value |
|-------|-------|
| Status | `done` |
| Phase | 2.1 |
| API id | `surya/layout` |

**Input:** `PageImage`  
**Output:** `PageArtifact` + `regions[]` (labels: `Table`, `Figure`, `Header`, `Paragraph`, …)

**Validation:** Map Surya labels → `LayoutLabel`; confidence threshold configurable.

**Tests:** `tests/fixtures/surya/layout/`

---

## Surya — `reading_order`

### `surya/reading-order`

| Field | Value |
|-------|-------|
| Status | `done` |
| Phase | 2.2 |

**Input:** `PageImage` + `regions[]` (from `surya/layout` or compatible)  
**Output:** `reading_order: string[]` + ordered `regions`

---

## Surya — `text_detection`

### `surya/text-detection`

| Field | Value |
|-------|-------|
| Status | `done` |
| Phase | 2.3 |

**Input:** `PageImage` (+ optional `regions[]` to limit scope)  
**Output:** `TextLine[]` without text (bbox/polygon only)

---

## Surya — `text_recognition`

### `surya/text-recognition`

| Field | Value |
|-------|-------|
| Status | `done` |
| Phase | 2.4 |

**Input:** `PageImage` + `TextLine[]` (or full page)  
**Output:** `TextLine[]` with `text` filled

**Options:** `languages: string[]` (90+ supported)

---

## Surya — `table_structure`

### `surya/table-recognition`

| Field | Value |
|-------|-------|
| Status | `done` |
| Phase | 2.5 |
| Category | `table_structure` (+ implicit detection) |

**Input:** `PageImage` (+ optional table `regions`)  
**Output:** `TableStructure[]` with row/col/cell bboxes

**Note:** Surya combines table detection + structure; we may split later if API allows.

---

## Surya — `formula_recognition`

### `surya/latex-ocr`

| Field | Value |
|-------|-------|
| Status | `done` |
| Phase | 2.6 |

**Input:** `PageImage` or formula crop  
**Output:** `Formula[]` with LaTeX

---

# Other providers (Phase 3+)

Brief entries — expand into full checklists when we reach their phase.

## Layout detection

| ID | Model | Compute | Status |
|----|-------|---------|--------|
| `paddle/doclayout-s` | PP-DocLayout-S (1.2M) | cpu/gpu-low | done |
| `paddle/doclayout-m` | PP-DocLayout-M | gpu-low | planned |

## Text detection / recognition

| ID | Model | Compute | Status |
|----|-------|---------|--------|
| `paddle/ocr-v6-small` | PP-OCRv6-small det+rec | cpu/gpu-low | done |
| `tesseract/default` | Tesseract 5.x | cpu | planned |
| `rapidocr/default` | RapidOCR ONNX | cpu | planned |
| `easyocr/default` | EasyOCR | gpu-low | deferred |
| `doctr/default` | DocTR | gpu-mid | deferred |
| `trocr/base` | TrOCR (handwriting) | gpu-mid | deferred |

## Tables (standalone)

| ID | Model | Status |
|----|-------|--------|
| `microsoft/tatr-detection` | Table Transformer detection | planned |
| `microsoft/tatr-structure` | Table Transformer structure | planned |
| `paddle/pp-structure` | PP-StructureV3 | done |

## Formula

| ID | Model | Status |
|----|-------|--------|
| `rapidai/latex-ocr` | RapidLaTeXOCR ONNX | planned |
| `texo/default` | Texo 20M | planned |
| `pix2text/default` | Pix2Text 1.5 | planned |

## Figure captioning

| ID | Model | Status |
|----|-------|--------|
| `salesforce/blip-base` | BLIP captioning | planned |
| `microsoft/florence-2-base` | Florence-2 multi-task | planned |
| `qwen/qwen2.5-vl-3b-caption` | Qwen2.5-VL-3B | deferred |

## VLM convert (non-Docling wrapper)

| ID | Model | Status |
|----|-------|--------|
| `ibm/granite-docling-258m` | Standalone HF runner | planned |
| `paddle/paddleocr-vl-0.9b` | PaddleOCR-VL | deferred |

---

# LLM & VLM providers (Phase 4)

Not document-layout models — they consume **text/markdown** or **images** and produce **structured JSON** or **natural language**.

## Provider abstraction

Single interface: `OpenAICompatibleProvider`

| Provider ID | Runtime | Typical use |
|-------------|---------|-------------|
| `ollama` | Local | Dev, air-gapped |
| `vllm` | Local/server | Production throughput |
| `llamacpp` | Local/edge | Apple Silicon, fine quant |
| `lmstudio` | Local | GUI + API |
| `openai` | Cloud | Best structured output |
| `anthropic` | Cloud | Long docs, tool use |
| `google` | Cloud | Gemini Flash volume tier |
| `mistral` | Cloud | EU hosting |

## Tasks

| ID | Category | Input | Output |
|----|----------|-------|--------|
| `llm/structured-extract` | `llm_extract` | markdown + JSON schema | validated JSON |
| `llm/summarize` | `llm_extract` | text | summary string |
| `llm/qa` | `llm_extract` | text + question | answer string |
| `vlm/qa` | `figure_captioning` | image + question | answer string |

Each provider gets: config schema, health check, model list endpoint, rate limit hooks.

---

# Transforms (non-ML)

| ID | Category | Status |
|----|----------|--------|
| `transform/deskew` | `preprocess` | planned |
| `transform/binarize` | `preprocess` | planned |
| `loader/pdf` | `page_loader` | `done` |
| `loader/image` | `page_loader` | `done` |
| `loader/page-at` | `page_loader` | `done` |
| `assembler/document` | `assembler` | planned |
| `export/markdown` | `export` | planned |
| `export/json` | `export` | planned |

---

# Open questions — Phase 0 decisions

Decisions adopted during Phase 0 implementation:

| # | Question | Decision |
|---|----------|----------|
| 1 | **Docling stage isolation** | Layout uses `LayoutPredictor` directly via `app/models/docling/_layout_engine.py` (Option A) |
| 2 | **`DoclingDocumentRef` passthrough** | Yes — `DoclingDocumentRef` wire type in `app/schemas/artifacts.py` |
| 3 | **Optional deps groups** | Use `requirements-docling.txt` (platform repo, not pip extras) |
| 4 | **Model weight cache dir** | `OCRFLOW_MODEL_CACHE` env, default `~/.cache/ocrflow` |
| 5 | **GPU in CI** | Schema/unit tests always; smoke tests `@pytest.mark.gpu` |
| 6 | **Surya vs Docling OCR** | Yes — both in registry; implement in Phases 1–2 |
| 7 | **First implementation target** | `docling/layout-heron` (Phase 1.1) |
| 8 | **Phase 0 HTTP API** | Foundations only — no `/api/v1/models` routes until Phase 1 |
| 9 | **ORM vs ML package** | SQLAlchemy ORM in `app/db/models/`; ML in `app/models/` |

---

# Progress tracker

Update as we implement.

| Task ID | Status | PR / notes |
|---------|--------|------------|
| Phase 0 — artifacts & protocol | `done` | `app/schemas/artifacts.py`, `app/models/{base,registry,cache,errors}.py`, `tests/models/` |
| Phase 1 — Docling stack | `done` | 8 tasks: layout-heron through convert-pipeline |
| Phase 2 — Surya stack | `done` | 6 tasks: layout through latex-ocr |
| `docling/layout-heron` | `done` | `LayoutPredictor` + `POST /api/v1/models/docling/layout-heron` |
| `docling/ocr-auto` | `done` | `OcrAutoModel` adapter |
| `docling/tableformer-accurate` | `done` | `TableStructureModel` ACCURATE mode |
| `docling/picture-classifier-v2.5` | `done` | `DocumentPictureClassifier` |
| `docling/vlm-granite-docling` | `done` | `DocumentConverter` + `VlmPipeline` granite preset |
| `docling/picture-description-smolvlm` | `done` | `PictureDescriptionVlmEngineModel` smolvlm preset |
| `docling/code-formula-v2` | `done` | `CodeFormulaModel` |
| `docling/convert-pipeline` | `done` | Full `DocumentConverter` preset node |
| `surya/layout` | `done` | `LayoutPredictor` + shared `FoundationPredictor` |
| `surya/reading-order` | `done` | IoU match against layout `position` fields |
| `surya/text-detection` | `done` | `DetectionPredictor` |
| `surya/text-recognition` | `done` | `RecognitionPredictor` + shared foundation |
| `surya/table-recognition` | `done` | `TableRecPredictor` |
| `surya/latex-ocr` | `done` | `RecognitionPredictor` with `block_without_boxes` on crops |
| `loader/pdf` | `done` | pypdfium2 rasterization + project asset sources |
| `loader/image` | `done` | Single image → `PageArtifact[]` |
| `loader/page-at` | `done` | `PageArtifact[]` → single `PageArtifact` bridge |

---

*Last updated: 2026-06-17 — Pipeline ingestion loaders implemented.*

---

## Resource notes — Surya (v1.x, pinned `<0.20.0`)

Install: `pip install -r requirements-surya.txt`

| Task | VRAM estimate (default batch) | Notes |
|------|-------------------------------|-------|
| `surya/text-detection` | ~16 GB (`DETECTOR_BATCH_SIZE=36`) | Torch-only detector |
| `surya/layout` | ~7 GB (`LAYOUT_BATCH_SIZE=32`) | Shares `FoundationPredictor` |
| `surya/text-recognition` | ~20 GB (`RECOGNITION_BATCH_SIZE=512`) | Tune down for dev (runners default to 8) |
| `surya/table-recognition` | ~10 GB (`TABLE_REC_BATCH_SIZE=64`) | |
| `surya/latex-ocr` | lighter | Crop-based recognition |
| `surya/reading-order` | same as layout | Reuses layout predictor |

**License:** Surya code is GPL-3.0; model weights use Open Rail-M (see [Surya repo](https://github.com/datalab-to/surya)).

**Limits:** Document images only (not general photos). First-run weights download to `OCRFLOW_MODEL_CACHE`.

---

## Resource notes — `docling/layout-heron`

| Resource | Estimate |
|----------|----------|
| Model size | ~43M params (`docling-layout-heron`) |
| First-run download | ~170 MB to `OCRFLOW_MODEL_CACHE` |
| RAM (CPU inference) | ~2–4 GB during inference |
| VRAM (CUDA/MPS) | ~1–2 GB |
| Known limits | `max_image_dimension` default 4096; timeout default 120s |

---

# Provider: PaddleOCR (Phase 3)

**Why:** Permissive (Apache-2.0) self-hostable stack covering layout, OCR, and full
document parsing. Wraps PaddleOCR/PaddlePaddle via the standard adapter pattern — the
heavy `paddleocr` import is lazy (inside each runner's `_load_impl`), so the app boots
and CPU tests run without paddle installed.

**Install:** `pip install -r requirements-paddle.txt`
(PaddlePaddle wheels are platform-specific; the file pins the CPU build. GPU users
install the matching `paddlepaddle-gpu` wheel per <https://www.paddlepaddle.org.cn/install>.)

**Device mapping:** `Device.cuda` → paddle `gpu`; `Device.cpu`/`Device.mps` → `cpu`
(PaddlePaddle has no MPS backend). Weights download to `OCRFLOW_MODEL_CACHE/paddle`.

## `paddle/doclayout-s` — layout detection ⭐

| | |
|--|--|
| Model | PP-DocLayout-S | Status | `done` |
| Category | `layout_detection` | Compute | cpu / gpu-low |

- **Input:** `DocLayoutInput{page, options{confidence_threshold=0.5}}`
- **Output:** `DocLayoutOutput{page_index, regions[], meta}` — each `Region` carries the
  mapped `LayoutLabel`, normalized `bbox` (0..1), `confidence`, and the raw paddle label
  in `provider_label`.
- **Label mapping:** `app/models/paddle/_label_map.py` (`text`→paragraph, `table`→table,
  `figure`→figure, `formula`→formula, …; unknown → `other`).

## `paddle/ocr-v6-small` — text recognition

| | |
|--|--|
| Model | PaddleOCR small/mobile det+rec (PP-OCRv5 mobile until v6 ships) | Status | `done` |
| Category | `text_recognition` | Compute | cpu / gpu-low |

- **Input:** `PaddleOcrInput{page, regions[]=[], languages=["en"], options{use_angle_cls, confidence_threshold}}`
- **Output:** `PaddleOcrOutput{page_index, lines[], meta}` (`TextLine` with bbox + polygon + text + confidence).
- **Regions:** empty → full-page det+rec; supplied → crops each region and returns one line per region.

## `paddle/pp-structure` — document parsing (full page artifact)

| | |
|--|--|
| Model | PP-StructureV3 | Status | `done` |
| Category | `table_structure` (returns full page artifact) | Compute | cpu / gpu-low |

- **Input:** `PpStructureInput{page, options{do_ocr=true}}`
- **Output:** `PpStructureOutput{page_index, regions[], lines[], tables[], meta}` — a
  flattened `PageArtifact`: layout `regions`, OCR `lines`, and `tables` (`TableStructure`
  with `html`). Table `cells` are left empty (HTML preserved) pending cell parsing.

## Resource notes — PaddleOCR

| Resource | Estimate |
|----------|----------|
| First-run download | ~10–100 MB per model to `OCRFLOW_MODEL_CACHE/paddle` |
| RAM (CPU inference) | ~1–3 GB; PP-StructureV3 higher (multi-model pipeline) |
| VRAM (CUDA) | ~1–3 GB (`doclayout-s`/`ocr-v6-small`), more for `pp-structure` |
| Known limits | `max_image_dimension` default 4096; timeout default 120s; smoke tests are `@pytest.mark.gpu` and skip without paddle installed |

*Last updated: 2026-07-19 — PaddleOCR doclayout-s, ocr-v6-small, pp-structure implemented.*
