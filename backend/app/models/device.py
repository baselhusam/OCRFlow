"""Device resolution and accelerator mapping.

OCRFlow ``Device`` values are user-facing. Frameworks disagree on names:

* PyTorch CUDA **and** ROCm both use the ``cuda`` device string.
* Apple Silicon is Metal via PyTorch ``mps`` (Docling/Surya). There is no
  official MLX backend in those packages; ``mlx`` is accepted as an alias.
* PaddlePaddle 3.x ships NVIDIA GPU wheels only — no MPS, and no 3.x ROCm
  wheel — so Apple/AMD hosts run Paddle on CPU.
"""

from __future__ import annotations

import os
import platform
import shutil
from pathlib import Path

from app.models.base import Device

_TORCH_DEVICE_MAP: dict[Device, str] = {
    Device.cpu: "cpu",
    Device.cuda: "cuda",
    Device.rocm: "cuda",
    Device.mps: "mps",
    Device.mlx: "mps",
}


def detect_available_device() -> Device:
    """Pick the best accelerator available in *this* process.

    Prefers a live PyTorch probe when torch is installed (provider images).
    Falls back to host tooling so the gateway can report a device without
    importing ML stacks.
    """
    try:
        import torch

        if torch.cuda.is_available():
            return Device.cuda
        mps = getattr(torch.backends, "mps", None)
        if mps is not None and mps.is_available():
            return Device.mps
    except Exception:
        pass

    if shutil.which("nvidia-smi") or shutil.which("nvidia-smi.exe"):
        return Device.cuda
    if Path("/dev/kfd").exists():
        return Device.rocm
    if platform.system() == "Darwin" and platform.machine().lower() in {
        "arm64",
        "aarch64",
    }:
        return Device.mps
    return Device.cpu


def resolve_device(device: Device) -> Device:
    """Resolve ``auto``; leave explicit selections unchanged."""
    if device == Device.auto:
        return detect_available_device()
    return device


def device_to_torch(device: Device) -> str:
    """Map an OCRFlow device to a PyTorch / Docling device string."""
    resolved = resolve_device(device)
    return _TORCH_DEVICE_MAP.get(resolved, "cpu")


def paddle_supports_gpu(device: Device) -> bool:
    """PaddlePaddle 3.x GPU builds exist for NVIDIA CUDA only."""
    return resolve_device(device) == Device.cuda and not _looks_like_rocm()


def _looks_like_rocm() -> bool:
    if os.environ.get("ROCM_PATH") or os.environ.get("HIP_VISIBLE_DEVICES"):
        return True
    return Path("/dev/kfd").exists()
