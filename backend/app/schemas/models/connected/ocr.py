"""Page OCR through a hosted vision model on a configured connection."""

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.artifacts import DocumentArtifact, PageImage

DEFAULT_OCR_PROMPT = (
    "Transcribe this document page into clean Markdown. Keep the reading order, "
    "headings, lists, and paragraph breaks. Render tables as Markdown tables and "
    "formulas as LaTeX between $ delimiters. Do not summarize, translate, or add "
    "commentary. Return only the page content."
)


class ConnectedOcrOptions(BaseModel):
    connection_id: str = Field(min_length=1)
    model: str = Field(min_length=1, max_length=256)
    prompt: str = Field(default=DEFAULT_OCR_PROMPT, min_length=1, max_length=20_000)
    temperature: float = Field(default=0, ge=0, le=2)
    max_tokens: int = Field(default=8192, ge=256, le=32_768)
    provider_protocol: Literal["openrouter"] | None = None


class ConnectedOcrInput(BaseModel):
    page: PageImage
    options: ConnectedOcrOptions


class ConnectedOcrOutput(BaseModel):
    kind: Literal["document"] = "document"
    document: DocumentArtifact
    markdown: str
    model: str
    provider: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    warnings: list[str] = Field(default_factory=list)
