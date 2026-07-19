"""CPU-only loader runner base with no model weights."""

from __future__ import annotations

from typing import TypeVar

from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner

InputT = TypeVar("InputT")
OutputT = TypeVar("OutputT")


class LoaderRunner(BaseRunner[InputT, OutputT]):
    async def _load_impl(self, config: ModelConfig) -> None:
        return None

    async def _unload_impl(self) -> None:
        return None
