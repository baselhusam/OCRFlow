#!/usr/bin/env bash
# Detect host OS/arch and the best OCR accelerator for Compose / Make.
#
# Usage:
#   scripts/detect-accelerator.sh                 # human-readable report
#   scripts/detect-accelerator.sh accelerator     # nvidia | amd | mlx | cpu
#   scripts/detect-accelerator.sh device          # cuda | mps | cpu
#   scripts/detect-accelerator.sh serve-mode      # docker | host
#   scripts/detect-accelerator.sh overlay         # compose overlay path or ""
#   scripts/detect-accelerator.sh paddle-device   # cuda | cpu
#   scripts/detect-accelerator.sh paddle-platform # linux/amd64 or ""
#   scripts/detect-accelerator.sh os              # darwin | linux | wsl | windows
#   scripts/detect-accelerator.sh arch            # x86_64 | arm64 | ...
#
# Override detection with ACCELERATOR=cpu|nvidia|amd|mlx (or OCRFLOW_ACCELERATOR).
# Force serve mode with OCR_SERVE=docker|host.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

uname_s="$(uname -s 2>/dev/null || echo unknown)"
uname_m="$(uname -m 2>/dev/null || echo unknown)"

case "$uname_s" in
  Darwin) OS=darwin ;;
  Linux) OS=linux ;;
  MINGW*|MSYS*|CYGWIN*|Windows_NT) OS=windows ;;
  *) OS="$(printf '%s' "$uname_s" | tr '[:upper:]' '[:lower:]')" ;;
esac

if [ "$OS" = linux ] && grep -qi microsoft /proc/version 2>/dev/null; then
  OS=wsl
fi

case "$uname_m" in
  x86_64|amd64) ARCH=x86_64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) ARCH="$uname_m" ;;
esac

has_nvidia() {
  if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi -L >/dev/null 2>&1; then
    return 0
  fi
  if command -v nvidia-smi.exe >/dev/null 2>&1 && nvidia-smi.exe -L >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

has_amd() {
  if [ -e /dev/kfd ]; then
    return 0
  fi
  if command -v rocminfo >/dev/null 2>&1 && rocminfo >/dev/null 2>&1; then
    return 0
  fi
  if command -v rocm-smi >/dev/null 2>&1 && rocm-smi >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

is_apple_silicon() {
  [ "$OS" = darwin ] && [ "$ARCH" = arm64 ]
}

REQUESTED="${ACCELERATOR:-${OCRFLOW_ACCELERATOR:-}}"
case "$REQUESTED" in
  "")
    if has_nvidia; then
      DETECTED=nvidia
    elif has_amd && [ "$OS" != darwin ]; then
      DETECTED=amd
    elif is_apple_silicon; then
      DETECTED=mlx
    else
      DETECTED=cpu
    fi
    ;;
  nvidia|cuda) DETECTED=nvidia ;;
  amd|rocm) DETECTED=amd ;;
  mlx|mps|apple) DETECTED=mlx ;;
  cpu) DETECTED=cpu ;;
  *)
    echo "Unknown ACCELERATOR='$REQUESTED' (use cpu|nvidia|amd|mlx)" >&2
    exit 1
    ;;
esac

OVERLAY=""
DEVICE=cpu
SERVE_MODE=docker
PADDLE_DEVICE=cpu
PADDLE_PLATFORM=""

case "$DETECTED" in
  nvidia)
    DEVICE=cuda
    SERVE_MODE=docker
    OVERLAY="backend/docker/docker-compose.nvidia.yml"
    PADDLE_DEVICE=cuda
    ;;
  amd)
    DEVICE=cuda
    SERVE_MODE=docker
    OVERLAY="backend/docker/docker-compose.amd.yml"
    # PaddlePaddle 3.x has no ROCm wheel — CPU Paddle, GPU Docling/Surya.
    PADDLE_DEVICE=cpu
    ;;
  mlx)
    DEVICE=mps
    # Apple GPU (Metal/MLX) is not exposed to Linux Docker VMs.
    SERVE_MODE=host
    OVERLAY=""
    PADDLE_DEVICE=cpu
    ;;
  cpu)
    DEVICE=cpu
    SERVE_MODE=docker
    OVERLAY=""
    PADDLE_DEVICE=cpu
    ;;
esac

if [ -n "${OCR_SERVE:-}" ]; then
  SERVE_MODE="$OCR_SERVE"
fi

# Paddle wheels are x86_64. On Apple Silicon, run that service under emulation.
if [ "$OS" = darwin ] && [ "$ARCH" = arm64 ]; then
  PADDLE_PLATFORM=linux/amd64
fi

# Host mode still uses Docker for Paddle on Mac (no ARM GPU Paddle).
if [ "$DETECTED" = mlx ]; then
  PADDLE_SERVE=docker
else
  PADDLE_SERVE="$SERVE_MODE"
fi

query="${1:-}"
case "$query" in
  "")
    cat <<EOF
OCRFlow accelerator detection
  OS:              ${OS}
  Arch:            ${ARCH}
  Accelerator:     ${DETECTED}
  Device:          ${DEVICE}
  Serve mode:      ${SERVE_MODE}
  Compose overlay: ${OVERLAY:-"(none)"}
  Paddle device:   ${PADDLE_DEVICE}
  Paddle serve:    ${PADDLE_SERVE}
  Paddle platform: ${PADDLE_PLATFORM:-"(native)"}
  Repo:            ${ROOT}

Override:  make ocr-up ACCELERATOR=cpu|nvidia|amd|mlx
Docs:      backend/docs/CONTAINERIZED_SERVING.md
EOF
    ;;
  accelerator) printf '%s\n' "$DETECTED" ;;
  device) printf '%s\n' "$DEVICE" ;;
  serve-mode) printf '%s\n' "$SERVE_MODE" ;;
  overlay) printf '%s\n' "$OVERLAY" ;;
  paddle-device) printf '%s\n' "$PADDLE_DEVICE" ;;
  paddle-platform) printf '%s\n' "$PADDLE_PLATFORM" ;;
  paddle-serve) printf '%s\n' "$PADDLE_SERVE" ;;
  os) printf '%s\n' "$OS" ;;
  arch) printf '%s\n' "$ARCH" ;;
  *)
    echo "Unknown query '$query'" >&2
    echo "Use: accelerator|device|serve-mode|overlay|paddle-device|paddle-platform|paddle-serve|os|arch" >&2
    exit 1
    ;;
esac
