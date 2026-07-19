"""Surya LaTeX OCR runner."""

from __future__ import annotations

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
from app.models.surya.latex_ocr_validate import validate_formulas
from app.schemas.artifacts import Formula
from app.schemas.models.surya._meta import InferenceMeta
from app.schemas.models.surya.latex_ocr import FormulaRegionInput, LatexOcrInput, LatexOcrOutput


class SuryaLatexOcrRunner(BaseRunner[LatexOcrInput, LatexOcrOutput]):
    model_id = "surya/latex-ocr"

    def __init__(self) -> None:
        super().__init__()
        self._rec_predictor = None

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            from surya.common.surya.schema import TaskNames
            from surya.recognition import RecognitionPredictor

            foundation = await get_foundation_predictor(config)
            self._rec_predictor = RecognitionPredictor(foundation)
            self._task_name = TaskNames.block_without_boxes
        except ImportError as exc:
            raise ModelLoadError(
                "surya-ocr is not installed. Install with: pip install -r requirements-surya.txt"
            ) from exc
        except Exception as exc:
            raise ModelLoadError(f"Failed to load surya/latex-ocr: {exc}") from exc

    async def _run_impl(self, input: LatexOcrInput) -> LatexOcrOutput:
        if self._rec_predictor is None:
            raise ModelLoadError("Surya recognition predictor not loaded")

        start = time.perf_counter()
        pil = await page_image_to_pil(input.page)
        formula_regions: list[FormulaRegionInput] = input.formulas or [
            FormulaRegionInput(id="f1", bbox=[0.0, 0.0, 1.0, 1.0])
        ]

        formulas: list[Formula] = []
        for formula_region in formula_regions:
            left, top, right, bottom = denormalize_bbox_to_pixels(
                formula_region.bbox, pil.width, pil.height
            )
            crop = pil.crop((left, top, right, bottom))
            bboxes = [[0, 0, crop.width, crop.height]]
            results = await run_sync(
                self._rec_predictor,
                [crop],
                [self._task_name],
                bboxes=[bboxes],
                math_mode=True,
            )
            text_lines = results[0].text_lines
            latex = text_lines[0].text if text_lines else ""
            formulas.append(
                Formula(
                    id=formula_region.id,
                    bbox=formula_region.bbox,
                    latex=latex,
                    inline=False,
                )
            )

        validate_formulas(formulas)
        latency_ms = (time.perf_counter() - start) * 1000
        return LatexOcrOutput(
            page_index=input.page.page_index,
            formulas=formulas,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _unload_impl(self) -> None:
        self._rec_predictor = None
