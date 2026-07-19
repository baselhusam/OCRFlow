"""Shared model inference route factory with analytics recording."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import TypeVar

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.v1.models.deps import get_model_config
from app.db.models.user import User
from app.db.session import get_db
from app.models.base import ModelConfig
from app.models.cache import get_runner_cache
from app.models.registry import ModelNotFoundError
from app.models.runner_factory import RUNNER_FACTORIES, get_cached_runner
from app.services.analytics_recorder import record_inference_event

InputT = TypeVar("InputT", bound=BaseModel)
OutputT = TypeVar("OutputT", bound=BaseModel)

ParsePayloadFn = Callable[[Request, type[InputT]], Awaitable[InputT]]


def register_model_routes(
    router: APIRouter,
    *,
    path: str,
    model_id: str,
    input_schema: type[InputT],
    output_schema: type[OutputT],
    tags: list[str],
    parse_payload: ParsePayloadFn[InputT],
) -> None:
    @router.post(path, response_model=output_schema, tags=tags)
    async def infer(
        request: Request,
        config: ModelConfig = Depends(get_model_config),
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> OutputT:
        payload = await parse_payload(request, input_schema)
        runner = await get_cached_runner(model_id, config)
        try:
            result = await runner.run(payload)
        except Exception as exc:
            await record_inference_event(
                db,
                user=user,
                model_id=model_id,
                request=request,
                status="error",
                error_message=str(exc),
            )
            raise

        await record_inference_event(
            db,
            user=user,
            model_id=model_id,
            request=request,
            status="success",
            result=result,
        )
        return result

    @router.post(f"{path}/health", tags=tags)
    async def health(config: ModelConfig = Depends(get_model_config)) -> dict:
        cached = await get_runner_cache().get(model_id)
        if cached is not None:
            result = await cached.health()
            return result.model_dump()
        factory = RUNNER_FACTORIES.get(model_id)
        if factory is None:
            raise ModelNotFoundError(f"No runner registered for model id: {model_id}")
        runner = factory()
        result = await runner.health()
        return result.model_dump()
