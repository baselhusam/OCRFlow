"""Unlimited-OCR runners: one page per call, or whole documents in one-pass chunks."""

from __future__ import annotations

import time

import pypdfium2 as pdfium
from PIL import Image

from app.core.config import get_settings
from app.models._image_utils import page_image_to_pil, run_sync
from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.errors import ModelInferenceError
from app.models.loader._rasterize import (
    document_source_to_bytes,
    image_bytes_to_page_image,
    rasterize_pdf,
)
from app.models.unlimited._engine import (
    UnlimitedEngine,
    acquire_engine,
    multi_page_token_budget,
    release_engine,
    resolve_model_repo,
)
from app.models.unlimited._parse import (
    ParsedPage,
    join_page_markdown,
    parse_page,
    split_pages,
    strip_special_tokens,
)
from app.schemas.artifacts import DocumentArtifact, PageImage
from app.schemas.models.unlimited.document_parse import (
    UnlimitedDocumentParseInput,
    UnlimitedMultiPageParseInput,
    UnlimitedParseMeta,
    UnlimitedParseOutput,
)


def _pdf_page_count(pdf_bytes: bytes, page_range: tuple[int, int] | None) -> int:
    try:
        pdf = pdfium.PdfDocument(pdf_bytes)
    except Exception as exc:
        raise ModelInferenceError(f"Failed to open PDF: {exc}") from exc
    total = len(pdf)
    pdf.close()
    if page_range is None:
        return total
    start, end = page_range
    return max(0, min(end, total - 1) - start + 1)


class _UnlimitedRunner(BaseRunner[object, UnlimitedParseOutput]):
    def __init__(self) -> None:
        super().__init__()
        self._engine: UnlimitedEngine | None = None

    async def _load_impl(self, config: ModelConfig) -> None:
        self._engine = await acquire_engine(
            resolve_model_repo(), config.model_cache_dir / "unlimited"
        )

    async def _unload_impl(self) -> None:
        if self._engine is not None:
            await release_engine(self._engine)
        self._engine = None

    @property
    def engine(self) -> UnlimitedEngine:
        if self._engine is None:
            raise ModelInferenceError("Unlimited-OCR model is not loaded")
        return self._engine


class UnlimitedDocumentParseRunner(_UnlimitedRunner):
    model_id = "unlimited/document-parse"

    async def _run_impl(self, input: UnlimitedDocumentParseInput) -> UnlimitedParseOutput:
        start = time.perf_counter()
        image = await page_image_to_pil(input.page)
        result = await self.engine.generate(
            [image],
            multi_page=False,
            mode=input.options.mode,
            max_tokens=input.options.max_tokens,
        )
        page = parse_page(
            result.text,
            page_index=input.page.page_index,
            include_furniture=input.options.include_furniture,
        )
        warnings = []
        if result.generation_tokens >= input.options.max_tokens:
            warnings.append("output reached max_tokens and may be cut off")
        return UnlimitedParseOutput(
            document=DocumentArtifact(
                pages=[page.artifact],
                metadata={"provider": "unlimited", "model": self.engine.repo},
            ),
            markdown=page.markdown,
            raw_text=strip_special_tokens(result.text),
            meta=UnlimitedParseMeta(
                model=self.engine.repo,
                mode=input.options.mode,
                page_count=1,
                passes=1,
                prompt_tokens=result.prompt_tokens,
                generation_tokens=result.generation_tokens,
                generation_tps=result.generation_tps,
                peak_memory_gb=result.peak_memory_gb,
                latency_ms=round((time.perf_counter() - start) * 1000, 1),
                warnings=warnings,
            ),
        )


class UnlimitedMultiPageParseRunner(_UnlimitedRunner):
    model_id = "unlimited/multi-page-parse"

    async def _load_pages(self, input: UnlimitedMultiPageParseInput) -> tuple[list[PageImage], int]:
        settings = get_settings()
        options = input.options
        if input.document.source.startswith("asset:") and not options.project_id:
            raise ModelInferenceError("project_id is required when document.source uses asset:{id}")
        raw = await run_sync(
            document_source_to_bytes,
            input.document,
            upload_dir=settings.upload_dir,
            project_id=options.project_id,
        )
        if input.document.format == "pdf":
            available = await run_sync(_pdf_page_count, raw, input.document.page_range)
            pages = await run_sync(
                rasterize_pdf,
                raw,
                dpi=options.dpi,
                page_range=input.document.page_range,
                max_pages=options.max_pages,
            )
            return pages, max(0, available - len(pages))
        return [image_bytes_to_page_image(raw, page_index=0)], 0

    async def _run_impl(self, input: UnlimitedMultiPageParseInput) -> UnlimitedParseOutput:
        start = time.perf_counter()
        options = input.options
        pages, truncated = await self._load_pages(input)
        if not pages:
            raise ModelInferenceError("Document has no pages")

        parsed: list[ParsedPage] = []
        raw_chunks: list[str] = []
        warnings: list[str] = []
        prompt_tokens = generation_tokens = 0
        tps: list[float] = []
        peak: float | None = None

        for offset in range(0, len(pages), options.pages_per_pass):
            chunk = pages[offset : offset + options.pages_per_pass]
            images: list[Image.Image] = [await page_image_to_pil(page) for page in chunk]
            budget = multi_page_token_budget(len(images))
            result = await self.engine.generate(images, multi_page=True, max_tokens=budget)
            page_texts, split_warnings = split_pages(result.text, len(chunk))
            label = f"pages {chunk[0].page_index + 1}–{chunk[-1].page_index + 1}"
            warnings.extend(f"{label}: {warning}" for warning in split_warnings)
            if result.generation_tokens >= budget:
                warnings.append(f"{label}: output reached the context limit and may be cut off")
            parsed.extend(
                parse_page(text, page_index=page.page_index, include_furniture=options.include_furniture)
                for page, text in zip(chunk, page_texts, strict=True)
            )
            raw_chunks.append(strip_special_tokens(result.text))
            prompt_tokens += result.prompt_tokens
            generation_tokens += result.generation_tokens
            if result.generation_tps is not None:
                tps.append(result.generation_tps)
            if result.peak_memory_gb is not None:
                peak = max(peak or 0.0, result.peak_memory_gb)

        if truncated:
            warnings.append(f"read the first {options.max_pages} pages; raise max_pages to read more")
        return UnlimitedParseOutput(
            document=DocumentArtifact(
                pages=[page.artifact for page in parsed],
                metadata={
                    "provider": "unlimited",
                    "model": self.engine.repo,
                    "pipeline": f"Unlimited-OCR · {len(parsed)} pages · {len(raw_chunks)} pass(es)",
                },
            ),
            markdown=join_page_markdown(parsed),
            raw_text="\n".join(raw_chunks),
            meta=UnlimitedParseMeta(
                model=self.engine.repo,
                mode="multi_page",
                page_count=len(parsed),
                passes=len(raw_chunks),
                prompt_tokens=prompt_tokens,
                generation_tokens=generation_tokens,
                generation_tps=round(sum(tps) / len(tps), 1) if tps else None,
                peak_memory_gb=peak,
                latency_ms=round((time.perf_counter() - start) * 1000, 1),
                truncated_pages=truncated,
                warnings=warnings,
            ),
        )
