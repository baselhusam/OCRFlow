---
title: Nodes & wires
description: Categories, runnable models, branch satellites, and why some connections refuse to stick.
---

Every canvas node is a **model task** with a category, a provider, params, and typed handles. You cannot connect a table structure output to a page loader input. The edge simply will not complete.

## Categories

| Category | Typical input → output |
| --- | --- |
| Page loader | `DocumentInput` → `PageArtifact[]` |
| Layout detection | `PageArtifact` → `PageArtifact + regions` |
| Text detection | page + regions → `TextLine[]` |
| Text recognition | `TextLine[]` → `TextLine[]` with text |
| Reading order | page + regions → `reading_order` |
| Table structure | page + regions → `TableStructure[]` |
| Formula recognition | regions → `Formula[]` with LaTeX |
| Figure classification | regions → `Figure[]` |
| Figure captioning | `Figure[]` → captions |
| VLM convert | `DocumentInput` → `DocumentArtifact` + markdown |
| Assembler | pages / document → `DocumentArtifact` |
| Text & prompt | recognized text / tables → text |
| LLM extract | recognized text / tables → schema-validated JSON |
| Vision language | `PageArtifact` → text or schema-validated JSON |
| Export / preprocess | planned |

Planned categories still appear in the palette so the information architecture is stable; they are not runnable until a model ships.

## Runnable providers

- **Loaders** — always in-process on the gateway.
- **Docling** — `:8102`
- **Surya** — `:8101`
- **Paddle** — `:8103`
- **Ollama** — `:11434` for local text and vision models

Full task lists live in [Model catalog](/documentation/models). Offline providers stay visible but greyed until you [connect them](/documentation/connect-models).

## Source nodes

`loader/pdf` and `loader/image` have **no upstream**. They are where files enter a **project** graph. Pipelines do not embed them; their boundary replaces the loader.

## Branch satellites

These nodes are **not** in the palette. They spawn beside an anchor after a run:

| Satellite | Anchor | Purpose |
| --- | --- | --- |
| `loader/page-branch` | Select Page | One handle per page |
| `layout/region-branch` | Layout models | One handle per region (`p.N`, label) |
| `figure/caption-branch` | SmolVLM captioning | Per-caption outputs |
| `docling/document-branch` | Convert / Granite VLM | Per-page document output |

They are project-canvas UX. Reusable pipelines block most of them (`BLOCKED_PIPELINE_MODELS`) so a job's graph stays a single bounded flow.

## Custom pipeline nodes

A saved pipeline can sit on a project canvas as `custom-pipeline/{id}`. Handles use the pipeline's derived wire kinds. Internally the executor runs that subgraph as a unit.

## Why a connection fails

- Wire kinds are incompatible (see [Input & output](/documentation/input-output)).
- You tried to wire a branch handle to the wrong parent.
- The target is a source loader.
- The provider is offline — you can still place the node, but a run will fail until the service is up.

Hover the rejected edge: the canvas explains the mismatch rather than failing silently.
