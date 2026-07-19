import pytest

from app.models.base import ModelConfig
from app.models.cache import RunnerCache, reset_runner_cache
from app.models.errors import ModelInferenceError
from app.schemas.artifacts import PageImage
from tests.models.mock_runner import EchoInput, MockRunner


@pytest.fixture(autouse=True)
async def clear_cache():
    await reset_runner_cache()
    yield
    await reset_runner_cache()


@pytest.mark.asyncio
async def test_mock_runner_lifecycle():
    runner = MockRunner()
    config = ModelConfig()

    health = await runner.health()
    assert health.loaded is False

    await runner.load(config)
    assert runner.load_count == 1

    result = await runner.run(EchoInput(value="hello"))
    assert result.value == "hello"
    assert runner.run_count == 1

    health = await runner.health()
    assert health.loaded is True
    assert health.model_id == "mock/echo"

    await runner.unload()
    assert runner.unload_count == 1


@pytest.mark.asyncio
async def test_runner_raises_when_not_loaded():
    runner = MockRunner()
    with pytest.raises(ModelInferenceError, match="not loaded"):
        await runner.run(EchoInput(value="x"))


@pytest.mark.asyncio
async def test_runner_rejects_oversized_page_image():
    runner = MockRunner()
    config = ModelConfig(max_image_dimension=100)
    await runner.load(config)

    page = PageImage(page_index=0, width=200, height=50, image_url="http://example.com/a.png")
    with pytest.raises(ModelInferenceError, match="exceed"):
        await runner.run(EchoInput(value="x", page=page))


@pytest.mark.asyncio
async def test_cache_get_or_load_singleton():
    cache = RunnerCache()
    config = ModelConfig()
    factory_calls = 0

    def factory() -> MockRunner:
        nonlocal factory_calls
        factory_calls += 1
        return MockRunner()

    runner1 = await cache.get_or_load("mock/echo", factory, config)
    runner2 = await cache.get_or_load("mock/echo", factory, config)

    assert runner1 is runner2
    assert factory_calls == 1
    assert runner1.load_count == 1

    await cache.unload_all()
