"""ModelRunner protocol and shared configuration types."""

from __future__ import annotations

from enum import StrEnum
from pathlib import Path
from typing import Any, ClassVar, Generic, Protocol, TypeVar

from pydantic import BaseModel, Field

InputT = TypeVar("InputT")
OutputT = TypeVar("OutputT")


class ComputeTier(StrEnum):
    cpu = "cpu"
    gpu_low = "gpu-low"
    gpu_mid = "gpu-mid"
    api = "api"


class Device(StrEnum):
    cpu = "cpu"
    cuda = "cuda"
    rocm = "rocm"
    mps = "mps"
    mlx = "mlx"
    auto = "auto"


class ModelConfig(BaseModel):
    device: Device = Device.cpu
    model_cache_dir: Path = Path.home() / ".cache" / "ocrflow"
    timeout_seconds: float = 120.0
    max_image_dimension: int = 4096
    extra: dict[str, Any] = Field(default_factory=dict)


class ModelHealth(BaseModel):
    model_id: str
    loaded: bool
    device: Device | None = None
    message: str | None = None


class ModelRunner(Protocol, Generic[InputT, OutputT]):
    model_id: ClassVar[str]

    async def load(self, config: ModelConfig) -> None: ...

    async def run(self, input: InputT) -> OutputT: ...

    async def health(self) -> ModelHealth: ...

    async def unload(self) -> None: ...
