---
title: Quick start
description: Clone the repo, start the core stack, migrate the database, and open the canvas.
---

The fastest path is Docker. You do not need a local Python or Node install for the core stack. OCR engines are optional and start in a second step.

## Prerequisites

- Docker with Compose v2
- `make`
- Git

GPU drivers are optional. Without them, OCR still runs on CPU.

## 1. Clone

```bash
git clone https://github.com/baselhusam/OCRFlow.git
cd OCRFlow
```

## 2. Configure the stack

```bash
cp backend/docker/.env.example backend/docker/.env
```

Edit the copied file if you need custom Postgres credentials or gateway settings. The defaults are enough for local development.

## 3. Start the control plane

```bash
make up            # frontend :3000, API :8000; no OCR yet
make db-migrate    # apply Alembic migrations
```

Open [http://localhost:3000](http://localhost:3000). Create an account, then go to **Projects** and open a canvas.

The first user whose email matches `ADMIN_EMAIL` becomes an admin. Everyone else starts as a regular user.

## 4. Start OCR engines

```bash
make detect        # OS, GPU vendor, compose overlay
make ocr-up        # Surya + Docling + Paddle (GPU auto-detected)
```

Or start only what you need:

```bash
make ocr-surya     # :8101
make ocr-docling   # :8102
make ocr-paddle    # :8103
```

Confirm the gateway can see them:

```bash
curl -s http://localhost:8000/api/v1/models/runtime
```

Online providers show `running: true`. On the project canvas, their nodes leave the greyed-out state (the palette also polls about every 10 seconds and on window focus).

## 5. Run a first graph

1. Create a **project**.
2. Drop **PDF Loader** or **Image Loader** onto the canvas and upload a document.
3. Wire a layout node (for example `docling/layout-heron` or `surya/layout`).
4. Click the node **test run**, then inspect regions in the output panel.
5. Select the useful subgraph and **Create pipeline from canvas**.
6. Open **Jobs**, pick that pipeline, upload documents, and watch the trace.

## Useful follow-ups

```bash
make logs          # follow all services
make down          # stop the stack
make help          # every target, plus detected accelerator
```

Next: [Installation](/documentation/installation) for host-based and hybrid setups, or [GPU & accelerators](/documentation/gpu) if you want CUDA, ROCm, or Metal.
