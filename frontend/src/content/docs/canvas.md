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

1. Drag a node onto the board (or click it in the palette). An empty canvas offers **Image loader** / **PDF loader** shortcuts to get started.
2. Select it to open the detail panel. It is a single scroll: a **connections strip** (from → to, expandable), **setup** (document, parameters, model details), then **preview** (input / output).
3. Loaders need an uploaded asset — drop a file straight onto the node. Other nodes take their data from inbound wires.

Nodes on the board stay lean: name, wire types, a few key parameter chips, and a **Run · Preview** footer. Editing happens in the detail panel.

In-product **node guides** walk through input → output for layout, OCR, and similar tasks. They are the visual twin of these docs.

## Run and preview one node

**Run** in a node's footer executes that node (and whatever it needs from upstream) without committing a full project run. Loaders show **Load** instead; Select Page has nothing to run.

**Preview** opens a card next to the node that renders the output for its kind — pages with a thumbnail strip, layout regions as colored boxes with a label legend, text lines with confidence, tables as grids, formulas as crops + LaTeX, figures as a crop gallery, documents as rendered Markdown / JSON. Before a node has run, the card shows the input it will receive. The card keeps screen size at any zoom and can open the page full-size.

The detail panel's preview section shows the same renderer with the raw payload on demand.

## Run the graph

Project **Run** starts a `ProjectRun`. Watch node borders: Pulse Violet marks the active stage (the same language as the Segment mark). Status colors follow the design system: green running/success, amber queued, red failed.

Cancel in-flight runs from the run UI or `POST /api/v1/projects/{id}/runs/{runId}/cancel`.

## Apply to all pages

A page model runs on the page it is looking at — fast enough to try three layout models on one page and compare. Once you like one, open the **▾** next to **Run** and choose **Apply to all N pages**. The node runs once per page, shows `37/100` progress with a stop button, and keeps every page's result: the preview card and inspector get a page switcher, and downstream nodes wired to a page (or applied to all pages themselves) receive that page's result. Page models upstream that have not been applied yet are applied first, so a whole chain (layout → OCR) goes end to end.

## Items: fan a collection out

Every output is a collection — pages, regions, lines, tables, figures, formulas. After a layout or select-page node finishes, its preview card offers **Expand to node**, which spawns an **Items** node: a scrollable, filterable list of every item with **one output handle per item**. Wire page 1 to model A, page 2 to model B and page 9 back to model A. Tick several items and a **group handle** appears that carries them as one input. On a node applied to all pages, the Items node browses items page by page and each handle remembers its page.

**Show item ports on node** opens the same per-item handles on the anchor itself. Treat both as extra handles, not as extra models you would search in the palette. See [Nodes & wires](/documentation/nodes).

## Save

Graphs persist with the project or pipeline document. There is no separate "compile" step. Duplicate a project if you want a fork; promote a selection to a [pipeline](/documentation/create-pipeline) when the chain is worth reusing.

## Bottom controls

Zoom, fit view, and related controls sit in the lower left. They do not change the graph — only the viewport.
