"""Accelerator and Docling option helpers."""

from __future__ import annotations

from pathlib import Path

from docling.datamodel.accelerator_options import AcceleratorDevice, AcceleratorOptions

from app.models.base import Device, ModelConfig


def build_accelerator_options(config: ModelConfig) -> AcceleratorOptions:
    device_map = {
        Device.cpu: AcceleratorDevice.CPU,
        Device.cuda: AcceleratorDevice.CUDA,
        Device.mps: AcceleratorDevice.MPS,
    }
    return AcceleratorOptions(
        device=device_map.get(config.device, AcceleratorDevice.CPU),
        num_threads=4,
    )


def artifacts_path(config: ModelConfig) -> Path:
    path = config.model_cache_dir
    path.mkdir(parents=True, exist_ok=True)
    return path
