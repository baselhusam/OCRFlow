"""Surya text recognition runner."""

from __future__ import annotations

import os
import time

from app.models._image_utils import (
    denormalize_bbox_to_pixels,
    page_image_to_pil,
    run_sync,
)
from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.errors import ModelLoadError
from app.models.surya._foundation import get_foundation_predictor
from app.models.surya._mappers import image_bbox_dimensions, ocr_line_to_text_line
from app.models.surya.text_recognition_validate import validate_recognized_lines
from app.schemas.models.surya._meta import InferenceMeta
from app.schemas.models.surya.text_recognition import TextRecognitionInput, TextRecognitionOutput


class SuryaTextRecognitionRunner(BaseRunner[TextRecognitionInput, TextRecognitionOutput]):
    model_id = "surya/text-recognition"

    def __init__(self) -> None:
        super().__init__()
        self._rec_predictor = None
        self._det_predictor = None

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            from surya.detection import DetectionPredictor
            from surya.recognition import RecognitionPredictor

            from app.models.surya._foundation import _configure_surya_env

            _configure_surya_env(config)
            os.environ.setdefault("DETECTOR_BATCH_SIZE", "4")
            foundation = await get_foundation_predictor(config)
            self._rec_predictor = RecognitionPredictor(foundation)
            self._det_predictor = await run_sync(DetectionPredictor)
        except ImportError as exc:
            raise ModelLoadError(
                "surya-ocr is not installed. Install with: pip install -r requirements-surya.txt"
            ) from exc
        except Exception as exc:
            raise ModelLoadError(f"Failed to load surya/text-recognition: {exc}") from exc

    async def _run_impl(self, input: TextRecognitionInput) -> TextRecognitionOutput:
        if self._rec_predictor is None:
            raise ModelLoadError("Surya recognition predictor not loaded")

        start = time.perf_counter()
        pil = await page_image_to_pil(input.page)
        task_name = input.options.task_name
        math_mode = not input.options.disable_math

        kwargs: dict = {
            "task_names": [task_name],
            "math_mode": math_mode,
        }

        if input.lines:
            bboxes = []
            for line in input.lines:
                left, top, right, bottom = denormalize_bbox_to_pixels(
                    line.bbox, pil.width, pil.height
                )
                bboxes.append([left, top, right, bottom])
            kwargs["bboxes"] = [bboxes]
        elif input.regions:
            bboxes = []
            for region in input.regions:
                left, top, right, bottom = denormalize_bbox_to_pixels(
                    region.bbox, pil.width, pil.height
                )
                bboxes.append([left, top, right, bottom])
            kwargs["bboxes"] = [bboxes]
        else:
            kwargs["det_predictor"] = self._det_predictor

        results = await run_sync(self._rec_predictor, [pil], **kwargs)
        ocr_result = results[0]
        width, height = image_bbox_dimensions(
            ocr_result.image_bbox, pil.width, pil.height
        )

        lines = [
            ocr_line_to_text_line(line, f"l{index + 1}", width, height)
            for index, line in enumerate(ocr_result.text_lines)
        ]
        validate_recognized_lines(
            lines, confidence_threshold=input.options.confidence_threshold
        )

        latency_ms = (time.perf_counter() - start) * 1000
        return TextRecognitionOutput(
            page_index=input.page.page_index,
            lines=lines,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _unload_impl(self) -> None:
        self._rec_predictor = None
        self._det_predictor = None
