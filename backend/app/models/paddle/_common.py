"""PaddleOCR-specific device selection helpers."""

from __future__ import annotations

from app.models.base import Device
from app.models.device import paddle_supports_gpu


def resolve_paddle_device(device: Device) -> str:
    """Map an OCRFlow ``Device`` to a PaddleOCR ``device`` string.

    PaddlePaddle 3.x GPU wheels are NVIDIA CUDA only. MPS, MLX, and ROCm all
    run on CPU; ``cuda`` on an NVIDIA host uses the GPU build.
    """
    if paddle_supports_gpu(device):
        return "gpu"
    return "cpu"
