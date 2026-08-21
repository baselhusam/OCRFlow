---
title: Loaders
description: PDF and image source nodes, select-page, and the page-branch satellite.
---

Loaders turn files into **page artifacts**. They run **in-process** on the gateway — they are not Docling/Surya/Paddle services.

## PDF Loader — `loader/pdf`

Source node. Upload a PDF onto the project (or pick an existing asset). Params:

- `dpi` — rasterization resolution
- `max_pages` — cap for huge documents

Output is a list of `PageArtifact`s (one per page). Downstream layout/OCR usually wants either the full list (batch-style nodes) or a single page via Select Page.

## Image Loader — `loader/image`

Source node for PNG/JPEG (and similar). One file → one page artifact. Use this for scans and screenshots.

## Select Page — `loader/page-at`

Input: `PageArtifact[]`. Param: `page_index`. Output: a single `PageArtifact`. This is how you point layout at page 0 while still keeping the full PDF on the canvas.

After it runs, a **Page Branch** satellite may spawn so each page is an explicit handle (`loader/page-branch`). That satellite is project-canvas UX and is blocked from reusable pipeline graphs.

## Pipelines and jobs

Reusable pipelines **do not** start with a file loader. The pipeline boundary *is* the input. When a [job](/documentation/jobs) or API run supplies an asset, the gateway adapts the file into that wire kind (rasterize, wrap as `DocumentInput`, etc.).

If you prototype with `loader/pdf` on a project, **Create pipeline from canvas** strips the loader automatically.

## Asset storage

Uploads land in `OCRFLOW_UPLOAD_DIR`. In all-Docker mode that is the `ocrflow_uploads` volume (`/data/uploads`). Hybrid host+container setups must share that path — see [Air-gapped deploy](/documentation/air-gapped).
