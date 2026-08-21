---
title: Introduction
description: Composable OCR pipelines you own — how these docs are organized, and where to start.
---

OCRFlow is a self-hostable platform for building **document-understanding pipelines** on a visual canvas. You drag OCR, layout, table, and structuring models onto a node graph, wire their typed inputs and outputs, and run the flow — interactively, or headless through the API.

The product is built around one idea: **canvas ↔ API parity**. Anything you compose visually is the same graph that jobs, analytics, and REST calls execute.

## What you can do

- Compose pipelines from Docling, Surya, Paddle, and loader nodes.
- Connect GPUs (NVIDIA CUDA, AMD ROCm, Apple Metal) or run CPU-only.
- Promote a project canvas into a reusable pipeline, then batch it as a job.
- Deploy on-prem or fully air-gapped — no cloud OCR required.
- Inspect analytics for your workspace, or the whole instance if you are an admin.

## How to read these docs

| Section | Start here if you want to… |
| --- | --- |
| [Get started](/documentation/quick-start) | Install, detect GPUs, and bring up OCR engines. |
| [Concepts](/documentation/concepts) | Understand projects, pipelines, jobs, nodes, and layouts. |
| [Models](/documentation/models) | See what each OCR provider does and how to connect it. |
| [Guides](/documentation/canvas) | Walk through canvas, jobs, analytics, and admin. |
| [Reference](/documentation/commands) | Copy make targets, API routes, and environment variables. |

Use the sidebar to move between pages. The right rail lists headings on the current page. Press **⌘K** (or **Ctrl+K**) to search every topic.

## A mental model

Think of OCRFlow as three layers:

1. **Control plane** — frontend, API gateway, Celery worker, PostgreSQL, Redis.
2. **Data plane** — optional OCR microservices (Surya on `:8101`, Docling on `:8102`, Paddle on `:8103`).
3. **Graphs** — projects for experimentation, pipelines for reuse, jobs for production batches.

`make up` starts the control plane with **no OCR loaded**. You opt into engines when you need them. The canvas palette greys out offline providers until their service is running.

## Brand of the product

OCRFlow's identity is the **Segment mark**: three arcs (detect, recognize, extract) with one Pulse Violet node for the active stage. The same language shows up in the UI — graphite structure, a single accent for the running node, IBM Plex Mono for anything the machine says.

These docs follow that system: Hanken Grotesk for prose, Plex Mono for commands and wire types, Pulse Violet `#5B2EEF` for navigation and links.
