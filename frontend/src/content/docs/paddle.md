---
title: Paddle
description: PP-DocLayout-S, OCR v6 small, and PP-Structure as isolated PaddleOCR services.
---

PaddleOCR runs in its own image because its stack does not coexist with Docling or Surya. The service listens on **port 8103**.

```bash
make ocr-paddle
```

On Apple Silicon, Paddle stays in an emulated **linux/amd64** container on CPU — there is no ARM64 GPU wheel for PaddlePaddle 3.x. On NVIDIA Linux, the CUDA overlay uses `paddlepaddle-gpu`. On AMD ROCm, Paddle is CPU-only.

## Tasks

| ID | Category | What you get |
| --- | --- | --- |
| `paddle/doclayout-s` | layout detection | Regions via PP-DocLayout-S |
| `paddle/ocr-v6-small` | text recognition | Lines + text, compact model |
| `paddle/pp-structure` | table / structure | Page artifact with regions, lines, and tables |

`pp-structure` is the "do more in one node" option. `doclayout-s` + `ocr-v6-small` is the composable pair.

## Wiring

```
loader/image → paddle/doclayout-s → paddle/ocr-v6-small
```

or

```
loader/pdf → paddle/pp-structure
```

Layout output is the same `PageArtifact + regions` wire kind as Docling/Surya, so you can mix providers (Paddle layout → Surya recognition) when kinds match. That is a supported experiment, not a requirement.

## Ops notes

- First run pulls Paddle models into the provider volume.
- CPU Paddle is fine for demos; production volume wants NVIDIA.
- Keep `/internal/*` private. The gateway is the only caller.
