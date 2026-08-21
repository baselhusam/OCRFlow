#!/usr/bin/env bash
# Install PaddlePaddle + PaddleOCR for the paddle service image.
#
# Paddle 3.x publishes CPU and NVIDIA CUDA wheels. There is no 3.x ROCm wheel
# and no Apple GPU build — those hosts keep the CPU package.
#
# Usage: install-paddle.sh <cpu|cuda|rocm>

set -euo pipefail

ACCEL="${1:-cpu}"
PADDLE_CUDA_INDEX="${PADDLE_CUDA_INDEX:-https://www.paddlepaddle.org.cn/packages/stable/cu126/}"

python -m pip install --upgrade pip
python -m pip install -r requirements-paddle.txt

case "$ACCEL" in
  cpu|rocm)
    if [ "$ACCEL" = rocm ]; then
      echo "PaddlePaddle 3.x has no ROCm wheel; this image keeps CPU Paddle."
      echo "Docling/Surya in the AMD overlay still use the GPU via PyTorch ROCm."
    fi
    ;;
  cuda)
    echo "Replacing CPU paddlepaddle with GPU wheels from ${PADDLE_CUDA_INDEX}"
    python -m pip uninstall -y paddlepaddle paddlepaddle-gpu >/dev/null 2>&1 || true
    python -m pip install "paddlepaddle-gpu>=3.0.0" -i "$PADDLE_CUDA_INDEX"
    ;;
  *)
    echo "Unknown ACCELERATOR='$ACCEL' (use cpu|cuda|rocm)" >&2
    exit 1
    ;;
esac
