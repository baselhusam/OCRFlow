"""Dependencies for model inference routes."""

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.runner_factory import get_cached_runner


def get_model_config(settings: Settings = Depends(get_settings)) -> ModelConfig:
    return settings.build_model_config()


async def get_runner(model_id: str, config: ModelConfig = Depends(get_model_config)) -> BaseRunner:
    return await get_cached_runner(model_id, config)
