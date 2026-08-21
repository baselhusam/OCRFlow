---
title: Run a job
description: Pick a ready pipeline, upload documents, watch the per-file trace, and cancel if needed.
---

Jobs are how OCRFlow does production volume: one pipeline, many files, one trace.

## Before you start

- Pipeline is **ready** and not archived — [Create a pipeline](/documentation/create-pipeline).
- The OCR providers that graph needs are **running** — [Connect OCR models](/documentation/connect-models).
- A Celery **worker** is up (`make be-worker` or the Docker `worker` service). Without a worker, runs may fall back to a subprocess executor; that is for hybrid dev, not a busy queue.

## Composer

1. **Jobs** → **New job**.
2. Select the pipeline. Only ready pipelines appear.
3. Upload up to **50** PDFs or images.
4. Create job.

Uploads use the pipeline batch-asset endpoint. The job endpoint then fan-outs one `PipelineRun` per asset.

## While it runs

The trace page polls ~1.5s. Each document row shows status and node progress. Open a run to inspect artifacts the same way you would on the canvas (JSON, overlays) depending on what the UI exposes for that run.

**Cancel** requests `POST /api/v1/jobs/{jobId}/cancel`. Documents not yet started should stop; the current inference may finish the node it is in.

## Failures

Typical causes:

- Provider went down mid-batch (`models/runtime` now `running: false`).
- Asset path mismatch in hybrid Docker (file-not-found inside the OCR container).
- Graph expected a page artifact and the adapter could not build one from that file type.
- Worker lost Redis.

Fix the cause and create a **new** job for the remaining files; cancelled/failed documents in the original job stay in that trace for audit.

## API shape

See [API](/documentation/api) for `POST /pipelines/{id}/jobs`, `GET /jobs/{id}`, and cancel. The UI is a client of those routes via the Next.js BFF.
