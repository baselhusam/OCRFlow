---
title: Docling
description: Layout-heron, OCR-auto, TableFormer, figures, formulas, Granite VLM, and convert-pipeline.
---

Docling is the default high-quality stack in OCRFlow. Each task is a separate node and HTTP route. The provider service listens on **port 8102**.

Start it with `make ocr-docling` (or `make be-ocr-docling` on the host).

## Layout — `docling/layout-heron`

Detects regions on a `PageArtifact`. Output: the same page plus `regions[]` with normalized `LayoutLabel`s. This is the usual first OCR node after a loader or select-page.

## OCR — `docling/ocr-auto`

Recognizes text on a page (engine auto-select inside Docling). Output: `TextLine[]` with text and boxes. Pair with layout if you only want certain regions; otherwise it can run on the full page.

## Tables — `docling/tableformer-accurate`

Consumes a page with table regions and emits `TableStructure[]`. Wire it from a [Region Branch](/documentation/layouts) table handle for best results.

## Figures

- `docling/picture-classifier-v2.5` — classifies figure-like regions into `Figure[]`.
- `docling/picture-description-smolvlm` — captions figures. Spawns a **caption branch** satellite for per-caption wiring.

SmolVLM is heavier than layout-heron. Prefer GPU.

## Formulas — `docling/code-formula-v2`

Recognizes code/formula regions into `Formula[]` (LaTeX when the model provides it).

## End-to-end convert

Two "shortcut" nodes skip assembling a modular graph:

| ID | Role |
| --- | --- |
| `docling/convert-pipeline` | Docling's full convert → `DocumentArtifact` |
| `docling/vlm-granite-docling` | Granite Docling VLM → document + markdown |

They take document input, not a hand-wired layout→OCR chain. Use them when you want one node; use modular nodes when you need to inspect or branch on layout.

Both can spawn a **document branch** satellite on the project canvas for per-page outputs.

## License and ops

Docling tasks in the default catalog are Apache-licensed. First run downloads weights into the Docling cache volume. Keep `OCRFLOW_RUNNER_MODE=remote` so those dependencies stay inside the Docling image, not the gateway.
