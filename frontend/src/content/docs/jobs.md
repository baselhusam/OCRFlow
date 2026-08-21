---
title: Jobs
description: Apply a ready pipeline to many documents with per-file tracing and cancel.
---

A **job** takes one **ready pipeline** and N uploaded documents (up to **50** PDFs or images). OCRFlow creates a `PipelineJob` plus one `PipelineRun` per asset, executed by Celery.

## When to use a job

| Use a job | Use a project run |
| --- | --- |
| Graph is stable and ready | You are still wiring nodes |
| Many files, same pipeline | One file, interactive inspect |
| You need a trace per document | You need node-level test runs |

## Create a job

1. Open **Jobs** → **New job** (`/app/jobs/new`).
2. Pick a ready, non-archived pipeline.
3. Upload documents (batch endpoint on the pipeline).
4. Submit. You land on `/app/jobs/{jobId}`.

That flow calls `POST /api/v1/pipelines/{pipelineId}/jobs` with the asset ids.

## Trace view

The job page polls about every **1.5 seconds**. For each document you see:

- Run status (queued, running, done, failed, cancelled)
- Node-level progress when the worker reports it
- The ability to **cancel** the job (`POST /api/v1/jobs/{id}/cancel`)

Cancel is cooperative: in-flight inference may finish the current node, then the remaining documents stop.

## List page

`/app/jobs` lists your jobs with status badges, pipeline name, document counts, and timestamps. Open any row for the trace.

## Analytics

Job runs count as **pipeline runs** in [Analytics](/documentation/analytics). They are not a separate KPI series; filter by range (and project, when the run is tied to one) to see volume and failures.

## Headless equivalent

If you are integrating without the UI, upload assets then create runs yourself — see [API](/documentation/api). Jobs are the productized batch wrapper around that pattern.
