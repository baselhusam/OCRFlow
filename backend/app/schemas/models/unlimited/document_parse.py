"""Typed inputs and outputs for the local Unlimited-OCR (MLX) provider."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.artifacts import DocumentArtifact, DocumentInput, PageImage

DEFAULT_MODEL_REPO = "mlx-community/Unlimited-OCR-8bit"

#: Unlimited-OCR's decoder context. Prompt (page tokens) + generation must fit.
MAX_CONTEXT_TOKENS = 32_768
#: Each page costs 273 prompt tokens in multi-page (1024px, uncropped) mode.
TOKENS_PER_MULTI_PAGE = 273
#: Upstream reads up to 16 pages in one generation.
MAX_PAGES_PER_PASS = 16

PageMode = Literal["detail", "fast"]


class UnlimitedPageOptions(BaseModel):
    """Single-page generation controls.

    ``detail`` is upstream's "gundam" view (1024px global view + 640px tiles),
    best for small print and dense pages. ``fast`` is the single 1024px view.
    """

    mode: PageMode = "detail"
    max_tokens: int = Field(default=8192, ge=256, le=16_384)
    include_furniture: bool = Field(
        default=False,
        description="Keep page headers, footers, and page numbers in the markdown.",
    )


class UnlimitedDocumentParseInput(BaseModel):
    page: PageImage
    options: UnlimitedPageOptions = Field(default_factory=UnlimitedPageOptions)


class UnlimitedMultiPageOptions(BaseModel):
    project_id: str | None = Field(
        default=None,
        description="Project id required when document.source uses asset:{id}",
    )
    dpi: int = Field(default=200, ge=72, le=300)
    pages_per_pass: int = Field(default=8, ge=1, le=MAX_PAGES_PER_PASS)
    max_pages: int = Field(default=64, ge=1, le=500)
    include_furniture: bool = False


class UnlimitedMultiPageParseInput(BaseModel):
    document: DocumentInput
    options: UnlimitedMultiPageOptions = Field(default_factory=UnlimitedMultiPageOptions)


class UnlimitedParseMeta(BaseModel):
    model: str = DEFAULT_MODEL_REPO
    mode: str
    page_count: int = Field(ge=0)
    passes: int = Field(default=1, ge=0)
    prompt_tokens: int = Field(default=0, ge=0)
    generation_tokens: int = Field(default=0, ge=0)
    generation_tps: float | None = None
    peak_memory_gb: float | None = None
    latency_ms: float | None = None
    truncated_pages: int = Field(
        default=0,
        ge=0,
        description="Pages beyond options.max_pages that were not read.",
    )
    warnings: list[str] = Field(default_factory=list)


class UnlimitedParseOutput(BaseModel):
    """A parsed document: structured pages, readable markdown, and raw model text.

    ``document.pages[*]`` carries normalized regions, text blocks, tables (HTML),
    formulas (LaTeX), figures, and reading order. ``markdown`` is the readable
    rendering used by previews and downstream text/LLM nodes.
    """

    document: DocumentArtifact
    markdown: str
    raw_text: str
    meta: UnlimitedParseMeta
