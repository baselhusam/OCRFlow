"""Process-wide lazy-load cache for model runners."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from typing import TypeVar

from app.models.base import ModelConfig, ModelRunner

RunnerT = TypeVar("RunnerT", bound=ModelRunner)


class RunnerCache:
    """One runner instance per model_id within a process."""

    def __init__(self) -> None:
        self._runners: dict[str, ModelRunner] = {}
        self._locks: dict[str, asyncio.Lock] = {}
        self._global_lock = asyncio.Lock()

    async def _get_lock(self, model_id: str) -> asyncio.Lock:
        async with self._global_lock:
            if model_id not in self._locks:
                self._locks[model_id] = asyncio.Lock()
            return self._locks[model_id]

    async def get_or_load(
        self,
        model_id: str,
        factory: Callable[[], RunnerT],
        config: ModelConfig,
    ) -> RunnerT:
        if model_id in self._runners:
            runner = self._runners[model_id]
            return runner  # type: ignore[return-value]

        lock = await self._get_lock(model_id)
        async with lock:
            if model_id in self._runners:
                return self._runners[model_id]  # type: ignore[return-value]

            runner = factory()
            await runner.load(config)
            self._runners[model_id] = runner
            return runner

    async def get(self, model_id: str) -> ModelRunner | None:
        return self._runners.get(model_id)

    async def unload(self, model_id: str) -> None:
        lock = await self._get_lock(model_id)
        async with lock:
            runner = self._runners.pop(model_id, None)
            if runner is not None:
                await runner.unload()

    async def unload_all(self) -> None:
        model_ids = list(self._runners.keys())
        for model_id in model_ids:
            await self.unload(model_id)


_default_cache: RunnerCache | None = None


def get_runner_cache() -> RunnerCache:
    global _default_cache
    if _default_cache is None:
        _default_cache = RunnerCache()
    return _default_cache


async def reset_runner_cache() -> None:
    """Clear the process-wide cache (primarily for tests)."""
    global _default_cache
    if _default_cache is not None:
        await _default_cache.unload_all()
    _default_cache = None
