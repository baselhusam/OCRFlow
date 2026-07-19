"""Abstract base runner with logging, timeout, and image-dimension guards."""

from __future__ import annotations

import asyncio
import logging
import time
from abc import ABC, abstractmethod
from typing import Any, Generic, TypeVar

from app.models.base import Device, ModelConfig, ModelHealth
from app.models.errors import ModelInferenceError
from app.schemas.artifacts import PageImage

InputT = TypeVar("InputT")
OutputT = TypeVar("OutputT")

logger = logging.getLogger(__name__)


class BaseRunner(ABC, Generic[InputT, OutputT]):
    model_id: str

    def __init__(self) -> None:
        self._config: ModelConfig | None = None
        self._loaded = False

    @abstractmethod
    async def _load_impl(self, config: ModelConfig) -> None: ...

    @abstractmethod
    async def _run_impl(self, input: InputT) -> OutputT: ...

    @abstractmethod
    async def _unload_impl(self) -> None: ...

    async def load(self, config: ModelConfig) -> None:
        start = time.perf_counter()
        await self._load_impl(config)
        self._config = config
        self._loaded = True
        latency_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "model loaded",
            extra={
                "model_id": self.model_id,
                "device": config.device.value,
                "latency_ms": round(latency_ms, 2),
            },
        )

    async def run(self, input: InputT) -> OutputT:
        if not self._loaded or self._config is None:
            raise ModelInferenceError(f"Model {self.model_id} is not loaded")

        self._validate_page_image_input(input)
        config = self._config
        start = time.perf_counter()

        try:
            result = await asyncio.wait_for(
                self._run_impl(input),
                timeout=config.timeout_seconds,
            )
        except asyncio.TimeoutError as exc:
            raise ModelInferenceError(
                f"Model {self.model_id} timed out after {config.timeout_seconds}s"
            ) from exc

        latency_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "model inference complete",
            extra={
                "model_id": self.model_id,
                "device": config.device.value,
                "latency_ms": round(latency_ms, 2),
            },
        )
        return result

    async def health(self) -> ModelHealth:
        device = self._config.device if self._config else None
        return ModelHealth(
            model_id=self.model_id,
            loaded=self._loaded,
            device=device,
            message=None if self._loaded else "not loaded",
        )

    async def unload(self) -> None:
        if not self._loaded:
            return
        await self._unload_impl()
        self._loaded = False
        self._config = None
        logger.info("model unloaded", extra={"model_id": self.model_id})

    def _validate_page_image_input(self, input: InputT) -> None:
        page = self._extract_page_image(input)
        if page is None:
            return

        max_dim = self._config.max_image_dimension if self._config else 4096
        if page.width > max_dim or page.height > max_dim:
            raise ModelInferenceError(
                f"Image dimensions {page.width}x{page.height} exceed "
                f"max_image_dimension={max_dim}"
            )

    def _extract_page_image(self, input: InputT) -> PageImage | None:
        if isinstance(input, PageImage):
            return input

        page = getattr(input, "page", None)
        if isinstance(page, PageImage):
            return page

        return None

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def config(self) -> ModelConfig | None:
        return self._config

    @property
    def device(self) -> Device | None:
        return self._config.device if self._config else None
