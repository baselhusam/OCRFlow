---
title: Pipelines
description: Reusable graphs with a single validated input and output for headless runs and jobs.
---

A **pipeline** is a serializable graph with a **bounded I/O**. That boundary is what lets you run it headless, drop it onto another canvas as a composite node, and batch it as a job.

## Ready vs draft

A pipeline is **ready** when it has a non-empty graph **and** both `input_wire_kind` and `output_wire_kind`. The Pipelines page tabs **All / Ready / Archived** use that rule. Jobs only accept ready, non-archived pipelines.

The gateway derives the boundary on save (`pipeline_boundary` service). You do not type wire kinds by hand.

## Two ways to create one

### From the Pipelines page

**Create pipeline** → `POST /api/v1/pipelines` → empty pipeline canvas. Add nodes that already assume a typed input (for example a layout node that consumes `PageArtifact`). Save. When the graph is valid, it becomes ready.

### From a project canvas

Select the nodes you want (or the whole graph). **Create pipeline from canvas** strips file loaders and keeps the remaining chain. The first remaining input and last remaining output become the pipeline boundary.

This is the usual path: prototype with a PDF loader in a project, then promote the OCR chain.

## What pipelines are not

Pipelines are **not** the place to upload fifty invoices. That is [Jobs](/documentation/jobs). A single headless run (`POST /api/v1/pipelines/{id}/runs` with `asset_id` + `project_id`) exists for API/SDK users who want one document at a time.

## Canvas differences

- No source file loaders as the pipeline's own input — the boundary *is* the input.
- Some branch satellites (`loader/page-branch`, region/caption/document branches) are blocked from reusable pipeline graphs; they are project-canvas UX.
- You can upload a **logo** (`POST /api/v1/pipelines/{id}/logo`) so the card is recognizable in the library and as a composite node.

## Using a pipeline as a node

On a **project** canvas, a saved pipeline appears as `custom-pipeline/{pipelineId}`. Its handles use the derived I/O wire kinds. That is how you nest flows without copy-pasting nodes.

## Duplicate, archive, edit

Card menus cover open canvas, archive, and duplicate. Archiving hides a pipeline from jobs and from "ready" lists without destroying run history.
