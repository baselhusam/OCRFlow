# Uses Docling LayoutPredictor directly (Option A) via LayoutEngine.
# See app/models/docling/_layout_engine.py

from __future__ import annotations

import time

from docling.datamodel.base_models import Page
from docling.datamodel.layout_model_specs import DOCLING_LAYOUT_HERON
from docling_core.types.doc import Size

from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.docling._common import page_image_to_pil, run_sync
from app.models.docling._layout_engine import LayoutEngine
from app.models.docling.layout_heron_validate import cluster_to_region, validate_layout_regions
from app.models.errors import ModelLoadError
from app.schemas.models.docling._meta import InferenceMeta
from app.schemas.models.docling.layout_heron import (
    LayoutDetectionInput,
    LayoutDetectionOutput,
)


class DoclingLayoutHeronRunner(BaseRunner[LayoutDetectionInput, LayoutDetectionOutput]):
    model_id = "docling/layout-heron"

    def __init__(self) -> None:
        super().__init__()
        self._engine: LayoutEngine | None = None

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            engine = LayoutEngine(DOCLING_LAYOUT_HERON, config)
            await run_sync(engine.load)
            self._engine = engine
        except Exception as exc:
            raise ModelLoadError(f"Failed to load docling/layout-heron: {exc}") from exc

    async def _run_impl(self, input: LayoutDetectionInput) -> LayoutDetectionOutput:
        if self._engine is None:
            raise ModelLoadError("Layout engine not loaded")

        start = time.perf_counter()
        pil = await page_image_to_pil(input.page)
        page = Page(
            page_no=input.page.page_index,
            size=Size(width=float(pil.width), height=float(pil.height)),
        )
        page._image_cache[1.0] = pil

        clusters = await run_sync(
            self._engine.predict,
            pil,
            page,
        )
        regions = [
            cluster_to_region(cluster, f"r{index + 1}", pil.width, pil.height)
            for index, cluster in enumerate(clusters)
        ]
        validate_layout_regions(regions)
        latency_ms = (time.perf_counter() - start) * 1000
        return LayoutDetectionOutput(
            page_index=input.page.page_index,
            regions=regions,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _unload_impl(self) -> None:
        if self._engine is not None:
            self._engine.unload()
            self._engine = None
