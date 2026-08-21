---
title: Use the canvas
description: Palette, test runs, branches, saving, and how the project canvas differs from pipelines.
---

The canvas is the product. Keyboard habits from other node editors mostly apply; the important OCRFlow-specific pieces are **typed wires**, **offline providers**, and **branch satellites**.

## Open a canvas

- **Project:** `/app/projects/{id}/canvas` — free-form, loaders allowed.
- **Pipeline:** `/app/pipelines/{id}/canvas` — bounded I/O, no file loaders.

Both use the same node renderer. The palette on the left is grouped by provider. Offline engines show a status dot and greyed models until you [start the service](/documentation/connect-models).

## Place and configure

1. Drag a node onto the board (or click it in the palette).
2. Select it to open the detail panel — params, docs/guide, and output tabs.
3. Loaders need an uploaded asset. Other nodes take their data from inbound wires.

In-product **node guides** walk through input → output for layout, OCR, and similar tasks. They are the visual twin of these docs.

## Test one node

Use **test run** on a selected node. OCRFlow executes that node (and whatever it needs from upstream) without committing a full project run. Use this to inspect regions, lines, and JSON before you batch anything.

## Run the graph

Project **Run** starts a `ProjectRun`. Watch node borders: Pulse Violet marks the active stage (the same language as the Segment mark). Status colors follow the design system: green running/success, amber queued, red failed.

Cancel in-flight runs from the run UI or `POST /api/v1/projects/{id}/runs/{runId}/cancel`.

## Branches

After layout, select-page, captioning, or convert nodes finish, satellites may appear. Treat them as extra handles, not as extra models you would search in the palette. See [Nodes & wires](/documentation/nodes).

## Save

Graphs persist with the project or pipeline document. There is no separate "compile" step. Duplicate a project if you want a fork; promote a selection to a [pipeline](/documentation/create-pipeline) when the chain is worth reusing.

## Bottom controls

Zoom, fit view, and related controls sit in the lower left. They do not change the graph — only the viewport.
