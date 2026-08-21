---
title: Layouts
description: Semantic regions on a page — labels, bounding boxes, and per-region branching.
---

**Layout detection** finds structure on a page image: titles, paragraphs, tables, figures, headers, formulas, and the rest. The output enriches a `PageArtifact` with a `regions[]` array. Downstream nodes then work on those boxes instead of the whole page.

## Why it matters

Without layout, OCR is a bag of words. With layout you can:

- Visualize document structure on the canvas.
- Branch **per region** (table vs body vs header).
- Feed table structure, figure classification, formula OCR, and reading order only the boxes they need.

## Region schema

Each region has:

- `id` — stable within the page
- `label` — a normalized `LayoutLabel`
- `bbox` — `[x0, y0, x1, y1]` in **0..1** page coordinates
- `confidence`
- optional `docling_label` / `provider_label` — the native string before mapping

## Labels

Normalized labels include `paragraph`, `title`, `section_header`, `table`, `figure`, `picture`, `list`, `list_item`, `caption`, `formula`, `code`, `header`, `footer`, `page_header`, `page_footer`, and `other`.

The canvas colors them consistently (for example title in violet, table in green, formula in magenta) so a scan of the overlay is enough to see structure.

Providers map their own tag sets onto this enum in validation. You should branch on **normalized** labels, not on `provider_label`, if you want graphs that swap `surya/layout` for `docling/layout-heron`.

## Layout models

| Model | Provider | Notes |
| --- | --- | --- |
| `docling/layout-heron` | Docling | Default Docling layout, modest GPU |
| `surya/layout` | Surya | Alternative stack, good multilingual pages |
| `paddle/doclayout-s` | Paddle | PP-DocLayout-S |

Wire output kind: `page_artifact_regions` (`PageArtifact + regions`).

## Region Branch

After a layout node runs, a **Region Branch** companion appears. Each region becomes an edge handle (`p.N` plus `regionId · label`). Drag from a table region into `docling/tableformer-accurate`; drag from a paragraph into text detection.

Connection rules require the branch to stay parented to its layout anchor. You cannot wire a foreign region's handle into another page's layout node.

## Guides on the canvas

Selecting a layout node opens an in-product guide: input page → detected regions → branch outputs. Those scenes match this page; use them when you want the visual, not the reference table.
