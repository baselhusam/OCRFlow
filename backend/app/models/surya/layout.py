"""Surya layout detection runner."""

from __future__ import annotations

import time

from app.models._image_utils import page_image_to_pil, run_sync
from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.errors import ModelLoadError
from app.models.surya._foundation import get_layout_predictor
from app.models.surya._mappers import image_bbox_dimensions
from app.models.surya.layout_validate import layout_box_to_region, validate_layout_regions
from app.schemas.models.surya._meta import InferenceMeta
from app.schemas.models.surya.layout import LayoutDetectionInput, LayoutDetectionOutput


class SuryaLayoutRunner(BaseRunner[LayoutDetectionInput, LayoutDetectionOutput]):
    model_id = "surya/layout"

    def __init__(self) -> None:
        super().__init__()
        self._layout_predictor = None

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            self._layout_predictor = await get_layout_predictor(config)
        except ImportError as exc:
            raise ModelLoadError(
                "surya-ocr is not installed. Install with: pip install -r requirements-surya.txt"
            ) from exc
        except Exception as exc:
            raise ModelLoadError(f"Failed to load surya/layout: {exc}") from exc

    async def _run_impl(self, input: LayoutDetectionInput) -> LayoutDetectionOutput:
        if self._layout_predictor is None:
            raise ModelLoadError("Surya layout predictor not loaded")

        start = time.perf_counter()
        pil = await page_image_to_pil(input.page)
        results = await run_sync(self._layout_predictor, [pil])
        layout_result = results[0]
        width, height = image_bbox_dimensions(
            layout_result.image_bbox, pil.width, pil.height
        )

        regions = []
        for index, box in enumerate(layout_result.bboxes):
            region = layout_box_to_region(
                box,
                f"r{index + 1}",
                width,
                height,
                confidence_threshold=input.options.confidence_threshold,
            )
            if region is not None:
                regions.append(region)

        validate_layout_regions(regions)
        latency_ms = (time.perf_counter() - start) * 1000
        return LayoutDetectionOutput(
            page_index=input.page.page_index,
            regions=regions,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _unload_impl(self) -> None:
        self._layout_predictor = None
