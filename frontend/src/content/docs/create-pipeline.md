---
title: Create a pipeline
description: Promote a project subgraph into a ready pipeline with a validated I/O boundary.
---

Prototype on a [project](/documentation/projects). When the chain works, promote it so [jobs](/documentation/jobs) and the API can reuse it.

## From the canvas

1. Open the project canvas.
2. Select the nodes that should ship (Shift-click or drag-select). Include layout → OCR → … Exclude the PDF/image loader unless you want the wizard to strip it.
3. Open **Create pipeline from canvas**.
4. Name it. Confirm the derived input and output kinds look right.
5. Save. You land on the pipeline canvas with that graph.

Loaders are stripped so the pipeline's input is a document/page artifact, not "whatever file happened to be on this project."

## From scratch

**Pipelines** → **Create pipeline** opens an empty bounded canvas. Drop nodes that already assume a typed input. Save until both wire kinds exist — the pipeline is then **ready**.

## Ready checklist

- Graph is non-empty.
- `input_wire_kind` and `output_wire_kind` are set (automatic on a valid save).
- Not archived.
- No blocked satellite-only models that belong on project canvases.

The Pipelines list **Ready** tab is this checklist. Jobs refuse anything else.

## Nested use

On another project, drag the pipeline from the palette as a composite node. Its handles match the boundary. Inside, the original graph is unchanged.

## Logos and library

Upload a logo on the pipeline so cards and composite nodes are recognizable. Duplicate when you want a variant (for example "invoices, layout-heron" vs "invoices, doclayout-s") without mutating the production graph.
