"""PaddleOCR-specific device selection helpers."""

from __future__ import annotations

from app.models.base import Device


def resolve_paddle_device(device: Device) -> str:
    """Map an OCRFlow ``Device`` to a PaddleOCR ``device`` string.

    PaddlePaddle has no MPS backend, so ``cpu`` and ``mps`` both run on CPU; only
    ``cuda`` uses the GPU build.
    """
    if device == Device.cuda:
        return "gpu"
    return "cpu"
