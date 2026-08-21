"""Accelerator and Docling option helpers."""

from __future__ import annotations

from pathlib import Path

from docling.datamodel.accelerator_options import AcceleratorDevice, AcceleratorOptions

from app.models.base import ModelConfig
from app.models.device import device_to_torch


def build_accelerator_options(config: ModelConfig) -> AcceleratorOptions:
    return AcceleratorOptions(
        device=AcceleratorDevice(device_to_torch(config.device)),
        num_threads=4,
    )


def artifacts_path(config: ModelConfig) -> Path:
    path = config.model_cache_dir
    path.mkdir(parents=True, exist_ok=True)
    return path
