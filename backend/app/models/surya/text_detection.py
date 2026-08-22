"""Surya text detection runner."""

from __future__ import annotations

import time

from PIL import Image

from app.models._image_utils import (
    denormalize_bbox_to_pixels,
    page_image_to_pil,
    run_sync,
)
from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.errors import ModelLoadError
from app.models.surya._mappers import image_bbox_dimensions, offset_text_line, polygon_box_to_text_line
from app.models.surya.text_detection_validate import keep_valid_text_lines, validate_text_lines
from app.schemas.models.surya._meta import InferenceMeta
from app.schemas.models.surya.text_detection import TextDetectionInput, TextDetectionOutput


class SuryaTextDetectionRunner(BaseRunner[TextDetectionInput, TextDetectionOutput]):
    model_id = "surya/text-detection"

    def __init__(self) -> None:
        super().__init__()
        self._det_predictor = None

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            from surya.detection import DetectionPredictor

            from app.models.surya._foundation import _configure_surya_env

            _configure_surya_env(config)
            self._det_predictor = await run_sync(DetectionPredictor)
        except ImportError as exc:
            raise ModelLoadError(
                "surya-ocr is not installed. Install with: pip install -r requirements-surya.txt"
            ) from exc
        except Exception as exc:
            raise ModelLoadError(f"Failed to load surya/text-detection: {exc}") from exc

    async def _detect_on_image(self, image: Image.Image) -> tuple[list, int, int]:
        assert self._det_predictor is not None
        results = await run_sync(self._det_predictor, [image])
        result = results[0]
        width, height = image_bbox_dimensions(result.image_bbox, image.width, image.height)
        return result.bboxes, width, height

    async def _run_impl(self, input: TextDetectionInput) -> TextDetectionOutput:
        if self._det_predictor is None:
            raise ModelLoadError("Surya detection predictor not loaded")

        start = time.perf_counter()
        pil = await page_image_to_pil(input.page)
        lines = []
        line_index = 1

        if input.regions:
            for region in input.regions:
                left, top, right, bottom = denormalize_bbox_to_pixels(
                    region.bbox, pil.width, pil.height
                )
                crop = pil.crop((left, top, right, bottom))
                boxes, crop_width, crop_height = await self._detect_on_image(crop)
                for box in boxes:
                    line = polygon_box_to_text_line(
                        box, f"l{line_index}", crop_width, crop_height
                    )
                    try:
                        lines.append(
                            offset_text_line(
                                line,
                                left,
                                top,
                                pil.width,
                                pil.height,
                                source_width=crop_width,
                                source_height=crop_height,
                            )
                        )
                    except ValueError:
                        continue
                    line_index += 1
        else:
            boxes, width, height = await self._detect_on_image(pil)
            for box in boxes:
                lines.append(
                    polygon_box_to_text_line(box, f"l{line_index}", width, height)
                )
                line_index += 1

        lines = keep_valid_text_lines(lines)
        validate_text_lines(lines)
        latency_ms = (time.perf_counter() - start) * 1000
        return TextDetectionOutput(
            page_index=input.page.page_index,
            lines=lines,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _unload_impl(self) -> None:
        self._det_predictor = None
