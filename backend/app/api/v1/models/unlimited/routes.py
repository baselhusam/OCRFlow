"""Authenticated Unlimited-OCR document parsing endpoints."""

from fastapi import APIRouter

from app.api.v1.models.multipart import parse_json_or_multipart
from app.api.v1.models.register_routes import register_model_routes
from app.schemas.models.unlimited.document_parse import (
    UnlimitedDocumentParseInput,
    UnlimitedMultiPageParseInput,
    UnlimitedParseOutput,
)

router = APIRouter()

register_model_routes(
    router,
    path="/document-parse",
    model_id="unlimited/document-parse",
    input_schema=UnlimitedDocumentParseInput,
    output_schema=UnlimitedParseOutput,
    tags=["models", "unlimited"],
    parse_payload=parse_json_or_multipart,
)
register_model_routes(
    router,
    path="/multi-page-parse",
    model_id="unlimited/multi-page-parse",
    input_schema=UnlimitedMultiPageParseInput,
    output_schema=UnlimitedParseOutput,
    tags=["models", "unlimited"],
    parse_payload=parse_json_or_multipart,
)
