"""Generic Surya model route factory."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.v1.models.multipart import parse_json_or_multipart
from app.api.v1.models.register_routes import register_model_routes as _register_model_routes


def register_model_routes(
    router: APIRouter,
    *,
    path: str,
    model_id: str,
    input_schema: type[BaseModel],
    output_schema: type[BaseModel],
) -> None:
    _register_model_routes(
        router,
        path=path,
        model_id=model_id,
        input_schema=input_schema,
        output_schema=output_schema,
        tags=["models", "surya"],
        parse_payload=parse_json_or_multipart,
    )
