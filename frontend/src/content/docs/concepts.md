---
title: How OCRFlow works
description: Control plane, data plane, typed wires, and canvas ↔ API parity.
---

OCRFlow is a **node graph** for document AI. Each node is one atomic task with a typed input and a typed output. Edges are only allowed when the upstream output **satisfies** the downstream input. Invalid pipelines fail at connect-time, not at 80% through a batch job.

## Architecture

```
frontend  ──HTTP──►  API gateway (FastAPI)
                       │
                       ├── PostgreSQL  (projects, pipelines, jobs, users)
                       ├── Redis       (Celery broker)
                       ├── Celery worker
                       └── RemoteModelRunner ──HTTP──►  Surya / Docling / Paddle
```

The **frontend** is Next.js. The pipeline canvas is React Flow. The **gateway** never needs to import PyTorch when `OCRFLOW_RUNNER_MODE=remote`; it forwards typed JSON to the provider that owns the model.

## Canvas ↔ API parity

Anything you can build on the canvas is serializable JSON:

- Node ids, model ids, params
- Edges with source/target handles
- Derived pipeline `input_wire_kind` / `output_wire_kind`

The same graph runs as:

| Surface | When |
| --- | --- |
| Node **test run** | Interactive, one node |
| **Project run** | Full canvas, including loaders |
| **Pipeline run** | Headless, one asset against a ready pipeline |
| **Job** | Many pipeline runs, one per uploaded document |

There is no separate "production compiler." The graph you see is the graph that executes.

## Three product objects

| Object | Purpose | Graph |
| --- | --- | --- |
| [Project](/documentation/projects) | Design and test | Free-form; loaders live on the canvas |
| [Pipeline](/documentation/pipelines) | Reuse | Bounded I/O; no embedded file loaders |
| [Job](/documentation/jobs) | Produce | Snapshot of a ready pipeline × N assets |

A saved pipeline can also appear as a **custom pipeline node** on a project canvas, so large flows compose.

## Typed wires

Shared artifacts live in the backend schemas (`PageArtifact`, `Region`, `TextLine`, `TableStructure`, `Formula`, `Figure`, `DocumentArtifact`, …). Frontend `WireKind` values mirror those types. Compatibility is a table, not a guess — see [Input & output](/documentation/input-output).

## Atomic tasks

Libraries like Docling and Surya bundle many capabilities. OCRFlow **splits them**: one HTTP endpoint = one task. `docling/layout-heron` is not the same node as `docling/ocr-auto`. That is what makes graphs composable and testable.

## Adapter, don't fork

Runners wrap upstream inference. Weights, licenses, and model cards stay with the provider. OCRFlow adds registry metadata, validation, lazy load, and a stable JSON schema so you can swap `surya/layout` for `paddle/doclayout-s` without rewriting the rest of the graph — as long as the wire kinds still match.
