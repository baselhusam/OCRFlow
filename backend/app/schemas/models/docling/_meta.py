"""Reusable inference metadata for Docling task outputs."""

from pydantic import BaseModel, Field


class InferenceMeta(BaseModel):
    model_id: str
    latency_ms: float = Field(ge=0.0)
