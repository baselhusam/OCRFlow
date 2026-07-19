# OCRFlow Frontend

Composable OCR pipelines, fully under your control.

## What this repo is

The OCRFlow **web frontend** — landing page plus the node-based pipeline canvas application.

## Sibling directories

| Path | Purpose |
|------|---------|
| `../backend/` | FastAPI backend, SDK/API, pipeline execution |
| `../branding/` | Logo, color palette, fonts, brand guidelines |

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page. The app lives at `/app`.

## Product context

OCRFlow is "ComfyUI for documents": a visual canvas where each node is a model or transform (layout detection, OCR, tables, figure description, LLM post-processing). Pipelines are serializable code, version-controllable, and runnable headless.

Primary persona: **developers and ML engineers** who self-host and need swappable pipeline stages.
