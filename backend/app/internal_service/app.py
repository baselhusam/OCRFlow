"""Internal per-provider inference service.

This is the slim FastAPI app that runs inside each provider image (paddle,
docling, surya). It exposes just enough to let the gateway forward inference:
no auth, no database, no analytics — those stay in the gateway. Model runners
are reused verbatim through the local runner factory.

Only reachable on the private compose network; it binds no public ports.
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.api.v1.models.errors import register_model_exception_handlers
from app.core.config import get_settings
from app.models.registry import ModelNotFoundError
from app.models.runner_factory import build_runner, get_cached_runner
from app.models.servable import get_servable_model


def _resolve_servable(model_id: str):
    servable = get_servable_model(model_id)
    if servable is None:
        raise ModelNotFoundError(f"No servable model for id: {model_id}")

    settings = get_settings()
    provider = settings.service_provider
    if provider and servable.provider != provider:
        raise ModelNotFoundError(
            f"Model {model_id} is not served by the {provider} service"
        )
    return servable


def create_internal_app() -> FastAPI:
    settings = get_settings()
    provider = settings.service_provider or "internal"
    app = FastAPI(title=f"OCRFlow {provider} service", version="0.1.0")

    register_model_exception_handlers(app)

    @app.exception_handler(ValidationError)
    async def _validation_handler(_: Request, exc: ValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"detail": str(exc), "error_code": "model_validation"},
        )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "provider": settings.service_provider or ""}

    @app.get("/internal/health")
    async def internal_health() -> dict[str, str]:
        return {"status": "ok", "provider": settings.service_provider or ""}

    @app.get("/internal/models/{model_id:path}/health")
    async def model_health(model_id: str) -> JSONResponse:
        _resolve_servable(model_id)
        runner = build_runner(model_id)
        result = await runner.health()
        return JSONResponse(result.model_dump())

    @app.post("/internal/models/{model_id:path}")
    async def infer(model_id: str, request: Request) -> JSONResponse:
        servable = _resolve_servable(model_id)
        body = await request.json()
        payload = servable.input_schema.model_validate(body)

        config = settings.build_model_config()
        runner = await get_cached_runner(model_id, config)
        result = await runner.run(payload)
        return JSONResponse(result.model_dump(mode="json", by_alias=True))

    return app


app = create_internal_app()
