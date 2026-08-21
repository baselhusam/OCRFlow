#!/usr/bin/env bash
# Install PyTorch wheels that match the target accelerator.
#
# Used by the Docling and Surya image stages. CPU is a no-op (the provider
# requirements already pull a CPU/macOS torch). CUDA and ROCm *replace* that
# torch with the matching official index so inference can see the GPU.
#
# Usage: install-accelerator.sh <cpu|cuda|rocm>

set -euo pipefail

ACCEL="${1:-cpu}"
# Align CUDA with Paddle's cu126 wheels. Override at build time if needed.
TORCH_CUDA_INDEX="${TORCH_CUDA_INDEX:-https://download.pytorch.org/whl/cu126}"
TORCH_ROCM_INDEX="${TORCH_ROCM_INDEX:-https://download.pytorch.org/whl/rocm6.3}"

python -m pip install --upgrade pip

case "$ACCEL" in
  cpu)
    echo "ACCELERATOR=cpu — keeping the torch wheel from provider requirements."
    ;;
  cuda)
    echo "ACCELERATOR=cuda — installing PyTorch from ${TORCH_CUDA_INDEX}"
    python -m pip install --upgrade torch --index-url "$TORCH_CUDA_INDEX"
    ;;
  rocm)
    echo "ACCELERATOR=rocm — installing PyTorch from ${TORCH_ROCM_INDEX}"
    python -m pip install --upgrade torch --index-url "$TORCH_ROCM_INDEX"
    ;;
  *)
    echo "Unknown ACCELERATOR='$ACCEL' (use cpu|cuda|rocm)" >&2
    exit 1
    ;;
esac
