import asyncio

import pytest

from app.models.base import ModelConfig
from app.models.cache import RunnerCache
from tests.models.mock_runner import MockRunner


@pytest.mark.asyncio
async def test_cache_unload_removes_runner():
    cache = RunnerCache()
    config = ModelConfig()

    runner = await cache.get_or_load("mock/echo", MockRunner, config)
    assert runner.is_loaded

    await cache.unload("mock/echo")
    assert await cache.get("mock/echo") is None
    assert runner.unload_count == 1


@pytest.mark.asyncio
async def test_cache_unload_all():
    cache = RunnerCache()
    config = ModelConfig()

    await cache.get_or_load("mock/echo", MockRunner, config)
    await cache.unload_all()
    assert await cache.get("mock/echo") is None


@pytest.mark.asyncio
async def test_cache_concurrent_load_single_instance():
    cache = RunnerCache()
    config = ModelConfig()
    factory_calls = 0

    def factory() -> MockRunner:
        nonlocal factory_calls
        factory_calls += 1
        return MockRunner()

    async def load_once() -> MockRunner:
        return await cache.get_or_load("mock/echo", factory, config)

    runners = await asyncio.gather(load_once(), load_once(), load_once())
    assert len({id(runner) for runner in runners}) == 1
    assert factory_calls == 1

    await cache.unload_all()
