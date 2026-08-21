---
title: Surya
description: Layout, text detection, recognition, reading order, tables, and LaTeX OCR.
---

Surya is a modular alternative to Docling. Tasks are split so you can compare stacks on the same page. The provider service listens on **port 8101**.

Start it with `make ocr-surya` (host: `make be-ocr-surya`). On Apple Silicon this is a **host** process so Metal/MPS is available.

## License

Surya is **GPL-3.0**. That is unlike the Apache/MIT default for most of the catalog. If you distribute a proprietary build that links Surya, get legal review. You can run OCRFlow with Docling and Paddle only — just do not start the Surya service.

## Tasks

| ID | Category | Typical wiring |
| --- | --- | --- |
| `surya/layout` | layout detection | After a page loader |
| `surya/text-detection` | text detection | After layout / regions |
| `surya/text-recognition` | text recognition | After text detection |
| `surya/reading-order` | reading order | After layout |
| `surya/table-recognition` | table structure | After table regions |
| `surya/latex-ocr` | formula recognition | After formula regions |

A classic Surya chain:

```
loader/pdf → surya/layout → surya/text-detection → surya/text-recognition
                         ↘ surya/reading-order
                         ↘ surya/table-recognition
```

## When to pick Surya

- You want **detection and recognition as separate nodes** (Docling's `ocr-auto` is more bundled).
- You are comparing layout quality against Heron or PP-DocLayout-S.
- Reading order is a first-class stage in your graph.

VRAM and first-download size are significant. Pre-seed `ocrflow_surya_models` for air-gapped hosts.
