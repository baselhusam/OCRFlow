---
title: Liquid AI
description: Run Liquid LFM2.5-VL-1.6B as a private, multilingual document-vision service.
---

OCRFlow includes Liquid AI's **LFM2.5-VL-1.6B** as an optional local provider. It is the default Liquid model and is designed for document understanding, visual question answering, OCR-assisted extraction, charts, and forms. It supports English, Arabic, Chinese, French, German, Japanese, Korean, and Spanish.

## Start the service

```bash
make ocr-liquid
```

The provider listens on `http://127.0.0.1:8104` in hybrid development. In the full Docker stack it is available as `http://liquid:8000`. On Apple Silicon, the target starts a host process so PyTorch can use Metal/MPS.

```bash
# Full OCR stack, including Liquid
make ocr-up

# Host development only
make be-ocr-liquid
```

The initial start downloads the model to the shared `ocrflow_liquid_models` volume (or `OCRFLOW_MODEL_CACHE/liquid` on a host). For an air-gapped deployment, pre-seed that cache and set `HF_HUB_OFFLINE=1` and `TRANSFORMERS_OFFLINE=1` on the Liquid service.

## Canvas nodes

| Node | Input → output | Use it for |
| --- | --- | --- |
| `liquid/vision-prompt` | page image + instruction → text | Document Q&A, transcription-assisted reading, chart/table explanations |
| `liquid/vision-structured-extract` | page image + instruction + JSON Schema → validated JSON | Forms, invoices, receipts, and predictable field extraction |

Both nodes use `LiquidAI/LFM2.5-VL-1.6B`; the model field is intentionally read-only so every Liquid request uses the deployed checkpoint. Set the instruction, temperature, maximum output tokens, and optional system prompt in the node Setup panel.

The structured node asks the model for JSON and validates its response against the top-level object schema before exposing it downstream. Keep schemas focused and use a low temperature for extraction.

## API

```text
POST /api/v1/models/liquid/vision-prompt
POST /api/v1/models/liquid/vision-structured-extract
```

Both routes accept a `PageImage`, prompt, and generation options. The structured route additionally requires `json_schema`.

## Hardware

Liquid's provider image uses PyTorch and Transformers 5.1+. It runs on CPU, CUDA, ROCm, and Apple MPS, but a GPU is recommended for interactive document pages. `make detect` automatically applies the existing NVIDIA or AMD provider overlay; Apple Silicon uses the host service path.

Liquid VLM is a document-understanding layer, not a replacement for deterministic layout/OCR engines. Pair it with Docling, Surya, or Paddle when you need coordinates, confidence scores, or a full page-by-page OCR pipeline.
