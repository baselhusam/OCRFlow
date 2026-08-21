---
title: Input & output
description: Wire kinds, shared artifacts, and which tasks produce what.
---

OCRFlow pipes **artifacts**, not files, between nodes. A PDF becomes pages; pages gain regions; regions gain lines, tables, or formulas; an assembler (or VLM convert) emits a document.

## Core artifacts

| Type | Meaning |
| --- | --- |
| `DocumentInput` | PDF path/bytes/URL or a list of images |
| `PageImage` | Raster + dimensions + `page_index` |
| `PageArtifact` | Page plus optional regions, lines, tables, formulas, figures, reading order |
| `Region` | Labeled layout box |
| `TextLine` | Text box, optionally filled after recognition |
| `TableStructure` | Rows, columns, cells |
| `Formula` | Bbox + optional LaTeX |
| `Figure` | Bbox + optional caption |
| `ReadingOrder` | Ordered region/line ids |
| `DocumentArtifact` | `pages[]` plus metadata (and often markdown from VLMs) |
| `DoclingDocumentRef` | Opaque Docling-native document for Docling-only stages |

Coordinates are normalized **0..1** unless a schema says otherwise. Validation rejects boxes outside that range.

## Typical producer → consumer

| Producer | Wire output | Typical consumers |
| --- | --- | --- |
| PDF / image loader | pages (`PageArtifact[]`) | Layout, VLM, select-page |
| Select page | single `PageArtifact` | Layout, OCR |
| Layout detection | `PageArtifact + regions` | Reading order, text det, tables, figures |
| Text detection | `TextLine[]` | Text recognition |
| Text recognition | `TextLine[]` with text | Assembler |
| Table structure | `TableStructure[]` | Cell OCR (planned), assembler |
| VLM convert | `DocumentArtifact` + markdown | Export, LLM extract |
| Assembler / convert-pipeline | `DocumentArtifact` | Export, LLM |

## Pipeline boundary

When you save a pipeline, OCRFlow walks the graph and records:

- **input_wire_kind** — what a job or API run must supply (usually a document or page artifact)
- **output_wire_kind** — what the last node emits

Jobs upload files; the gateway **adapts** each asset into the pipeline's declared input kind (rasterize PDF, wrap as `DocumentInput`, and so on) before the worker executes.

## Node params vs wires

Params (`dpi`, `max_pages`, `page_index`, language, device) are **configuration**. Wires are **data**. Changing `dpi` on a PDF loader changes the page rasters that flow downstream; it does not change the wire *kind*.

## Inspecting outputs

On the canvas, open a node after a test run:

- Page and region overlays
- Line lists
- Table previews
- Formula / LaTeX
- JSON tree of the full artifact

That JSON is the same shape the API returns for headless runs. There is no second schema for "UI only" results.
