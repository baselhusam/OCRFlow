---
title: Analytics
description: Workspace KPIs, model usage, pipeline library stats, exports, and how admin analytics differ.
---

**Analytics** (`/app/analytics`) is scoped to **you** — runs, projects, and pipelines you own. Platform-wide numbers live under [Admin](/documentation/admin).

## Filters

- Range: **7d / 30d / 90d**
- Optional **project** filter

All charts and tables honor those filters.

## Core KPIs

The top grid shows:

- Pages processed
- Pipeline runs
- Success rate
- Average latency

Each tile includes a period-over-period delta so a bad deploy shows up as a red success-rate drop, not just a raw count.

## Performance

- **Activity deep dive** — runs, pages, errors, and active projects per day
- **Top pipelines** — five pipelines by run count
- **Run outcomes** — done / failed / running
- **Run kind** — `test_run` vs `pipeline_run` vs `inference_run`
- **Model usage** — counts, latency, success rate per model id
- **Recent runs** — last twenty

## Pipeline library

Totals for pipelines you own: active vs all, average node count, common I/O labels. This is about definitions, not just executions.

## Breakdown tables

Tabs for **Projects**, **Nodes**, **Models**, and **Documents** list the same underlying facts in tabular form — useful when a chart spike needs a row-level culprit.

## Export

`GET /api/v1/analytics/export` downloads CSV for the current filter. The UI **Export** control uses that route through the BFF.

## What analytics is not

It is not a live GPU dashboard. For "is Surya up?" use `GET /api/v1/models/runtime` and the canvas chips. Analytics answers "what ran, how often, how well" after the fact.
