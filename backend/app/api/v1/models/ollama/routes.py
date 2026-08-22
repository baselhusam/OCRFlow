"""Authenticated Ollama text and vision inference endpoints."""

from fastapi import APIRouter

from app.api.v1.models.multipart import parse_json_or_multipart
from app.api.v1.models.register_routes import register_model_routes
from app.schemas.models.ollama.generation import (
    OllamaStructuredInput,
    OllamaStructuredOutput,
    OllamaTextInput,
    OllamaTextOutput,
    OllamaVisionInput,
    OllamaVisionStructuredInput,
)

router = APIRouter()

register_model_routes(
    router,
    path="/text-prompt",
    model_id="ollama/text-prompt",
    input_schema=OllamaTextInput,
    output_schema=OllamaTextOutput,
    tags=["models", "ollama"],
    parse_payload=parse_json_or_multipart,
)
register_model_routes(
    router,
    path="/structured-extract",
    model_id="ollama/structured-extract",
    input_schema=OllamaStructuredInput,
    output_schema=OllamaStructuredOutput,
    tags=["models", "ollama"],
    parse_payload=parse_json_or_multipart,
)
register_model_routes(
    router,
    path="/vision-prompt",
    model_id="ollama/vision-prompt",
    input_schema=OllamaVisionInput,
    output_schema=OllamaTextOutput,
    tags=["models", "ollama"],
    parse_payload=parse_json_or_multipart,
)
register_model_routes(
    router,
    path="/vision-structured-extract",
    model_id="ollama/vision-structured-extract",
    input_schema=OllamaVisionStructuredInput,
    output_schema=OllamaStructuredOutput,
    tags=["models", "ollama"],
    parse_payload=parse_json_or_multipart,
)
