<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="branding/logo-svg/horizontal-reversed.svg">
  <source media="(prefers-color-scheme: light)" srcset="branding/logo-svg/horizontal-primary.svg">
  <img alt="OCRFlow" src="branding/logo-svg/horizontal-primary.svg" width="420">
</picture>

### Composable OCR pipelines, fully under your control.

<p>
  <a href="#license"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-5B2EEF.svg?style=flat-square"></a>
  <img alt="Python 3.11+" src="https://img.shields.io/badge/Python-3.11+-141225.svg?style=flat-square&logo=python&logoColor=white">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-141225.svg?style=flat-square&logo=fastapi&logoColor=white">
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-141225.svg?style=flat-square&logo=nextdotjs&logoColor=white">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-141225.svg?style=flat-square&logo=react&logoColor=61DAFB">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-141225.svg?style=flat-square&logo=typescript&logoColor=white">
  <br>
  <img alt="Self-host first" src="https://img.shields.io/badge/self--host-first-5B2EEF.svg?style=flat-square">
  <img alt="Status: WIP" src="https://img.shields.io/badge/status-in%20development-EDE9FE.svg?style=flat-square&labelColor=5B2EEF">
  <a href="#contributing"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-5B2EEF.svg?style=flat-square"></a>
</p>

<p>
  <a href="#-overview">Overview</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="#-getting-started">Getting Started</a> ·
  <a href="#-project-structure">Structure</a> ·
  <a href="#-roadmap">Roadmap</a>
</p>

</div>

---

## 🔎 Overview

**OCRFlow** is a self-hostable platform for building **composable document-understanding pipelines** on a visual canvas. Drag OCR, layout-detection, table-extraction, and structuring models onto a node graph, wire their typed inputs and outputs together, and run the whole flow — either interactively on the canvas or headless through the API.

The guiding idea is **canvas ↔ API parity**: anything you can build on the canvas runs the same way headless via the API/SDK, so a pipeline you prototype visually is the same one that ships to production.

> **Why OCRFlow?** Most document-AI tooling is either a closed SaaS or a pile of one-off scripts. OCRFlow wraps best-in-class open models (Docling, Surya, and more) behind a typed, composable interface you own and run on your own infrastructure.

---

## ✨ Features

- **🧩 Visual pipeline builder** — compose OCR stages as a node graph powered by React Flow.
- **🔌 Typed wires** — nodes only connect when an output type satisfies the next input type, so invalid pipelines are caught before they run.
- **⚛️ Atomic tasks** — one HTTP endpoint = one task, even when a library bundles many (each Docling/Surya task gets its own API, schemas, validation, and tests).
- **🧠 Adapter, don't fork** — model runners wrap upstream inference (Docling, Surya, …) instead of reimplementing it.
- **🏠 Self-host first** — the default model catalog is Apache/MIT-licensed and runs fully on-prem.
- **⚡ Lazy model loading** — weights load on first request (or explicit warm-up) and are shared as a per-process singleton.
- **🖥️ Canvas ↔ API parity** — everything on the canvas is runnable headless via the API/SDK.

---

## 🏗️ Architecture

```
┌──────────────────────────────┐        ┌───────────────────────────────────────┐
│           frontend           │        │                backend                │
│  Next.js 16 · React 19       │  HTTP  │  FastAPI · async SQLAlchemy           │
│  React Flow canvas           │ ─────► │  Model runners (Docling, Surya, …)   │
│  Tailwind v4 · shadcn/ui     │  REST  │  Celery + Redis  ·  PostgreSQL       │
└──────────────────────────────┘        └───────────────────────────────────────┘
```

**Backend** — a FastAPI service exposing one endpoint per model task. A model registry describes each model (id, category, deps, compute), and a `ModelRunner` protocol (`load` / `run` / `health`) standardizes inference behind a cached, lazy-loaded runner. Long-running jobs are dispatched to Celery workers backed by Redis; metadata and pipeline state live in PostgreSQL with Alembic migrations.

**Frontend** — a Next.js App Router app where the pipeline canvas is built on React Flow (`@xyflow/react`), styled with Tailwind v4 and shadcn/ui, animated with Framer Motion.

### Tech stack

| Layer        | Technologies                                                                 |
|--------------|------------------------------------------------------------------------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, React Flow, Framer Motion, Recharts |
| **Backend**  | FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic, Celery, Redis              |
| **Data**     | PostgreSQL (asyncpg)                                                          |
| **Models**   | Docling, Surya (adapter-based runners, catalog-driven)                        |
| **Auth**     | JWT (python-jose) + bcrypt                                                    |

---

## 🚀 Getting Started

### Prerequisites

- **Python** 3.11+
- **Node.js** 20+
- **PostgreSQL** 14+
- **Redis** 6+

### 1. Clone

```bash
git clone https://github.com/baselhusam/OCRFlow.git
cd OCRFlow
```

### 2. Run the whole stack with Docker (recommended)

The fastest path. Brings up the frontend, API gateway, model-provider services,
Postgres, and Redis together. Requires Docker (with Compose v2) and `make` — no
local Python/Node/Postgres/Redis needed.

```bash
cp backend/docker/.env.example backend/docker/.env   # Postgres creds + gateway config

make up            # build + start core (frontend :3000, API :8000; no OCR)
make detect        # show OS / GPU vendor / compose overlay
make ocr-up        # start Surya + Docling + Paddle (GPU auto-detected)
make db-migrate    # apply database migrations

make logs          # follow logs   ·   make down to stop   ·   make help for all targets
```

`make up-all` or `make gpu-up` starts the core stack **and** every OCR
microservice, using NVIDIA CUDA, AMD ROCm, or Apple Metal/MPS according to the
host. Override with `ACCELERATOR=cpu|nvidia|amd|mlx`. See
[containerized serving](backend/docs/CONTAINERIZED_SERVING.md).

### 3. Backend (manual / host dev)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt          # + requirements-docling.txt / requirements-surya.txt for models

cp .env.example .env                      # then fill in DATABASE_URL, REDIS_URL, secrets, …
alembic upgrade head                      # run migrations

uvicorn app.main:app --reload            # API at http://localhost:8000
```

Start a Celery worker in a second terminal for background jobs:

```bash
celery -A app.celery_app:celery_app worker --loglevel=info
```

### 4. Frontend (manual / host dev)

```bash
cd frontend
npm install
cp .env.local.example .env.local          # point API_URL at the backend

npm run dev                               # app at http://localhost:3000
```

---

## 🧪 Development

Common workflows are wrapped in the root `Makefile` — run `make help` for the
full list. A few highlights:

```bash
make detect                # OS / GPU vendor / compose overlay
make up / make down        # start / stop the core Docker stack
make ocr-up / make gpu-up  # OCR microservices (or full stack) with auto GPU
make db-migrate            # run migrations inside the gateway container
make test                  # backend + frontend test suites
make be-api / make fe-dev  # host-based backend API / frontend dev servers
make be-worker             # Celery worker for background jobs
```

Or run the tools directly:

```bash
# Backend
cd backend && pytest                 # run test suite (add -m "not gpu" to skip GPU tests)

# Frontend
cd frontend && npm run test          # vitest
cd frontend && npm run lint          # eslint
```

---

## 📁 Project Structure

```
OCRFlow/
├── backend/                 # FastAPI service
│   ├── app/                 #   application code (API, models, db, schemas)
│   ├── alembic/             #   database migrations
│   ├── scripts/             #   utility scripts
│   ├── tests/               #   pytest suite
│   ├── docs/                #   model catalog & implementation plan
│   └── requirements*.txt    #   core / dev / docling / surya / paddle deps
├── frontend/                # Next.js app
│   ├── src/
│   │   ├── app/             #   App Router pages
│   │   ├── components/      #   UI components (canvas, nodes, shadcn)
│   │   ├── lib/             #   client libs & helpers
│   │   └── hooks/           #   React hooks
│   └── public/              #   static assets
├── branding/                # logos, brand guidelines & design system
├── scripts/                 # accelerator detection + host OCR helpers
├── docker-compose.yml       # full-stack compose entrypoint
├── LICENSE
└── README.md
```

---

## 🗺️ Roadmap

OCRFlow is under active development. Models are implemented and validated **one at a time** — starting with **Docling**, then **Surya** (per task), then the rest of the catalog. See [`backend/docs/`](backend/docs/) for the living model catalog and implementation plan.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue to discuss substantial changes before submitting a PR. When adding a model, follow the per-model checklist in [`backend/docs/`](backend/docs/) — each task needs its own API, schemas, validation, and tests.

---

## 🎨 Brand

One accent does the talking: **Pulse Violet `#5B2EEF`** marks the active node, links, and key actions — everything else is graphite and paper. Full guidelines and logo variants live in [`branding/`](branding/).

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

<div align="center">
<br>
<sub>Built with ☕ by <a href="https://github.com/baselhusam">Basel Husam</a></sub>
</div>
