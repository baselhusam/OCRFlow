"""Image page loader runner."""

from __future__ import annotations

import time

from app.core.config import get_settings
from app.models.loader._base import LoaderRunner
from app.models.loader._rasterize import (
    document_source_to_bytes,
    image_bytes_to_page_image,
    page_images_to_artifacts,
)
from app.models.loader.image_validate import validate_image_loader_input
from app.schemas.models.docling._meta import InferenceMeta
from app.schemas.models.loader.pdf import ImageLoaderInput, ImageLoaderOutput


class ImageLoaderRunner(LoaderRunner[ImageLoaderInput, ImageLoaderOutput]):
    model_id = "loader/image"

    async def _run_impl(self, input: ImageLoaderInput) -> ImageLoaderOutput:
        validate_image_loader_input(input)
        settings = get_settings()

        start = time.perf_counter()
        image_bytes = document_source_to_bytes(
            input.document,
            upload_dir=settings.upload_dir,
            project_id=input.options.project_id,
        )
        page_image = image_bytes_to_page_image(image_bytes, page_index=0)
        pages = page_images_to_artifacts([page_image])
        latency_ms = (time.perf_counter() - start) * 1000

        return ImageLoaderOutput(
            pages=pages,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )
