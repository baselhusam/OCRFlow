"""PDF page loader runner."""

from __future__ import annotations

import time

from app.core.config import get_settings
from app.models.loader._base import LoaderRunner
from app.models.loader._rasterize import (
    document_source_to_bytes,
    page_images_to_artifacts,
    rasterize_pdf,
)
from app.models.loader.pdf_validate import validate_pdf_loader_input
from app.schemas.models.docling._meta import InferenceMeta
from app.schemas.models.loader.pdf import PdfLoaderInput, PdfLoaderOutput


class PdfLoaderRunner(LoaderRunner[PdfLoaderInput, PdfLoaderOutput]):
    model_id = "loader/pdf"

    async def _run_impl(self, input: PdfLoaderInput) -> PdfLoaderOutput:
        validate_pdf_loader_input(input)
        settings = get_settings()

        start = time.perf_counter()
        pdf_bytes = document_source_to_bytes(
            input.document,
            upload_dir=settings.upload_dir,
            project_id=input.options.project_id,
        )
        images = rasterize_pdf(
            pdf_bytes,
            dpi=input.options.dpi,
            page_range=input.document.page_range,
            max_pages=input.options.max_pages,
        )
        pages = page_images_to_artifacts(images)
        latency_ms = (time.perf_counter() - start) * 1000

        return PdfLoaderOutput(
            pages=pages,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )
