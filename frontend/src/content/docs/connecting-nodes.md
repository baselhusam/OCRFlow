---
title: Connect nodes
description: How typed wires validate, what a rejected edge means, and how region handles work.
---

Connecting nodes is the entire type system of OCRFlow. If the edge rejects, the run would have been invalid anyway.

## Drag a wire

Handles sit on the left (input) and right (output) of each node. Drag from an output to a compatible input. A preview edge follows the cursor; incompatible targets refuse the drop.

Compatibility is defined in `WireKind` tables, not by category name. Two layout models both emit `PageArtifact + regions`, so either can feed the same table node.

## Common valid chains

```
PDF Loader → Select Page → Layout → Text detection → Text recognition
                         ↘ Region Branch (table) → Table structure
```

```
Image Loader → paddle/doclayout-s → paddle/ocr-v6-small
```

```
PDF Loader → docling/convert-pipeline
```

## Common invalid chains

- Table structure → PDF Loader (wrong direction, source node).
- `TextLine[]` → layout detection (layout wants a page, not lines).
- Region branch handle from page 2 → layout node that ran on page 0 (parent mismatch).
- Custom pipeline node whose output kind does not satisfy the next input.

## Region and page handles

Layout **Region Branch** handles are labeled `p.N` plus region id and label. Page Branch handles are per `page_index`. Wire the specific handle you care about; the downstream node receives that slice, not the whole page list.

## Custom pipelines

When a pipeline sits on a project canvas, its handles are the **boundary** kinds. You cannot reach inside the composite without opening the pipeline canvas itself.

## Offline providers

You may still draw edges to a greyed Docling node. The graph is valid. A run fails until `GET /api/v1/models/runtime` reports that provider `running: true`. Start the engine; the palette updates without breaking your wires.
