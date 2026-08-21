---
title: GPU & accelerators
description: Auto-detect NVIDIA, AMD ROCm, or Apple Metal and attach OCR engines to the right device.
---

OCRFlow never assumes a GPU. `make detect` prints the OS, vendor, device string, and which Compose overlay will be used. Override at any time with `ACCELERATOR=cpu|nvidia|amd|mlx`.

## Detect what you have

```bash
make detect
```

Typical output includes:

- **accelerator** — `cpu`, `nvidia`, `amd`, or `mlx`
- **device** — the string passed into runners (`cuda`, `rocm`, `mps`, `cpu`)
- **overlay** — extra compose file for CUDA or ROCm
- **serve-mode** — `docker` vs `host` (Apple Silicon uses host for Docling/Surya)

## Platform matrix

| Host | Docling / Surya | Paddle | GPU |
| --- | --- | --- | --- |
| Linux / Windows (WSL2) + NVIDIA | Docker + CUDA overlay | Docker GPU (`paddlepaddle-gpu`) | CUDA |
| Linux + AMD ROCm | Docker + ROCm overlay | CPU (no Paddle 3.x ROCm wheel) | ROCm for Docling/Surya |
| macOS Apple Silicon | **Host processes** (Metal/MPS) | Docker `linux/amd64`, CPU | MPS for Docling/Surya |
| Anything else | Docker CPU images | Docker CPU | CPU |

Apple GPU is **not** available inside Docker Desktop's Linux VM. That is why MLX/Metal acceleration is host-native.

## Start OCR on the detected GPU

```bash
make ocr-up          # all three engines
make gpu-up          # core stack + OCR, same detection
make nvidia-up       # force CUDA overlay
make amd-up          # force ROCm overlay
ACCELERATOR=cpu make ocr-up
```

Individual engines:

```bash
make ocr-surya       # :8101
make ocr-docling     # :8102
make ocr-paddle      # :8103
make ocr-ps          # status
make ocr-logs        # follow provider logs
make ocr-down        # stop OCR only
```

## How the canvas uses this

The gateway probes each provider's `/internal/health` when `OCRFLOW_RUNNER_MODE=remote`. `GET /api/v1/models/runtime` is the source of truth. The project palette:

- Shows online provider logos with a live status dot.
- Greys out nodes whose service is down, with a "start the service" hint.
- Can reveal offline nodes via **Show offline**.
- Refreshes about every 10 seconds and on window focus — no full reload required.

Light in-process work (PDF/image loaders, page-at) still runs inside the gateway. Only `docling/*`, `surya/*`, and `paddle/*` inference is forwarded.

## Device on each runner

Model configs accept an explicit `device`: `cpu`, `cuda`, `rocm`, `mps`, `mlx`, or `auto`. Containers inherit the overlay's device. Host OCR scripts set Metal/MPS for Apple.

## First-run downloads

The first inference for a model pulls weights into named volumes (`ocrflow_surya_models`, Docling/Paddle caches, Hugging Face hub). On air-gapped hosts, pre-seed those volumes — see [Air-gapped deploy](/documentation/air-gapped).
