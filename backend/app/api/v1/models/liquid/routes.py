"""Authenticated Liquid LFM2.5-VL inference endpoints."""

from fastapi import APIRouter

from app.api.v1.models.multipart import parse_json_or_multipart
from app.api.v1.models.register_routes import register_model_routes
from app.schemas.models.liquid.generation import (
    LiquidStructuredOutput,
    LiquidVisionInput,
    LiquidVisionStructuredInput,
    LiquidTextOutput,
)

router = APIRouter()

register_model_routes(
    router,
    path="/vision-prompt",
    model_id="liquid/vision-prompt",
    input_schema=LiquidVisionInput,
    output_schema=LiquidTextOutput,
    tags=["models", "liquid"],
    parse_payload=parse_json_or_multipart,
)
register_model_routes(
    router,
    path="/vision-structured-extract",
    model_id="liquid/vision-structured-extract",
    input_schema=LiquidVisionStructuredInput,
    output_schema=LiquidStructuredOutput,
    tags=["models", "liquid"],
    parse_payload=parse_json_or_multipart,
)
