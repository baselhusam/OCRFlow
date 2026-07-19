"""Surya reading order runner."""

from __future__ import annotations

import time

from app.models._image_utils import page_image_to_pil, run_sync
from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.errors import ModelLoadError
from app.models.surya._foundation import get_foundation_predictor
from app.models.surya._mappers import image_bbox_dimensions
from app.models.surya.reading_order_match import match_regions_to_positions
from app.models.surya.reading_order_validate import validate_reading_order
from app.schemas.artifacts import ReadingOrder
from app.schemas.models.surya._meta import InferenceMeta
from app.schemas.models.surya.reading_order import ReadingOrderInput, ReadingOrderOutput


class SuryaReadingOrderRunner(BaseRunner[ReadingOrderInput, ReadingOrderOutput]):
    model_id = "surya/reading-order"

    def __init__(self) -> None:
        super().__init__()
        self._layout_predictor = None

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            from surya.layout import LayoutPredictor

            foundation = await get_foundation_predictor(config)
            self._layout_predictor = LayoutPredictor(foundation)
        except ImportError as exc:
            raise ModelLoadError(
                "surya-ocr is not installed. Install with: pip install -r requirements-surya.txt"
            ) from exc
        except Exception as exc:
            raise ModelLoadError(f"Failed to load surya/reading-order: {exc}") from exc

    async def _run_impl(self, input: ReadingOrderInput) -> ReadingOrderOutput:
        if self._layout_predictor is None:
            raise ModelLoadError("Surya layout predictor not loaded")

        start = time.perf_counter()
        pil = await page_image_to_pil(input.page)
        results = await run_sync(self._layout_predictor, [pil])
        layout_result = results[0]
        width, height = image_bbox_dimensions(
            layout_result.image_bbox, pil.width, pil.height
        )

        positions = match_regions_to_positions(
            input.regions,
            layout_result.bboxes,
            width,
            height,
            iou_threshold=input.options.iou_threshold,
        )

        ordered_regions = sorted(input.regions, key=lambda region: positions[region.id])
        ordered_ids = [region.id for region in ordered_regions]
        validate_reading_order(ordered_regions, ordered_ids)

        latency_ms = (time.perf_counter() - start) * 1000
        return ReadingOrderOutput(
            page_index=input.page.page_index,
            reading_order=ReadingOrder(ordered_ids=ordered_ids),
            regions=ordered_regions,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _unload_impl(self) -> None:
        self._layout_predictor = None
