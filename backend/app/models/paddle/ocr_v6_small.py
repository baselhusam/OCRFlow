"""PaddleOCR small/mobile text recognition runner (PP-OCR det+rec).

Bound to model id ``paddle/ocr-v6-small``; the concrete weights are PaddleOCR's current
small/mobile det+rec pipeline (PP-OCRv5 mobile until PP-OCRv6 ships).
"""

from __future__ import annotations

import time

from app.models._image_utils import (
    denormalize_bbox_to_pixels,
    page_image_to_pil,
    pil_to_temp_path,
    run_sync,
)
from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.errors import ModelLoadError
from app.models.paddle._common import resolve_paddle_device
from app.models.paddle._mappers import iter_ocr_items, paddle_ocr_to_text_line
from app.models.paddle.ocr_validate import validate_recognized_lines
from app.schemas.artifacts import TextLine, validate_bbox
from app.schemas.models.paddle._meta import InferenceMeta
from app.schemas.models.paddle.ocr import PaddleOcrInput, PaddleOcrOutput

_INSTALL_HINT = (
    "paddleocr is not installed. Install with: pip install -r requirements-paddle.txt"
)


class PaddleOcrV6SmallRunner(BaseRunner[PaddleOcrInput, PaddleOcrOutput]):
    model_id = "paddle/ocr-v6-small"

    def __init__(self) -> None:
        super().__init__()
        self._ocr = None

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            from paddleocr import PaddleOCR

            device = resolve_paddle_device(config.device)
            self._ocr = await run_sync(
                lambda: PaddleOCR(
                    lang="en",
                    use_textline_orientation=True,
                    device=device,
                ),
            )
        except ImportError as exc:
            raise ModelLoadError(_INSTALL_HINT) from exc
        except Exception as exc:
            raise ModelLoadError(f"Failed to load paddle/ocr-v6-small: {exc}") from exc

    async def _predict_path(self, path: str):
        return await run_sync(self._ocr.predict, path)

    async def _run_impl(self, input: PaddleOcrInput) -> PaddleOcrOutput:
        if self._ocr is None:
            raise ModelLoadError("PaddleOCR recognition pipeline not loaded")

        start = time.perf_counter()
        pil = await page_image_to_pil(input.page)

        if input.regions:
            lines = await self._recognize_regions(input, pil)
        else:
            lines = await self._recognize_full_page(pil)

        validate_recognized_lines(
            lines, confidence_threshold=input.options.confidence_threshold
        )
        latency_ms = (time.perf_counter() - start) * 1000
        return PaddleOcrOutput(
            page_index=input.page.page_index,
            lines=lines,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _recognize_full_page(self, pil) -> list[TextLine]:
        tmp_path = await pil_to_temp_path(pil)
        try:
            results = await self._predict_path(str(tmp_path))
        finally:
            tmp_path.unlink(missing_ok=True)

        result = results[0] if results else {}
        return [
            paddle_ocr_to_text_line(poly, text, score, f"l{index + 1}", pil.width, pil.height)
            for index, (poly, text, score) in enumerate(iter_ocr_items(result))
        ]

    async def _recognize_regions(self, input: PaddleOcrInput, pil) -> list[TextLine]:
        lines: list[TextLine] = []
        for index, region in enumerate(input.regions):
            validate_bbox(region.bbox)
            left, top, right, bottom = denormalize_bbox_to_pixels(
                region.bbox, pil.width, pil.height
            )
            crop = pil.crop((left, top, right, bottom))
            tmp_path = await pil_to_temp_path(crop)
            try:
                results = await self._predict_path(str(tmp_path))
            finally:
                tmp_path.unlink(missing_ok=True)

            result = results[0] if results else {}
            items = iter_ocr_items(result)
            text = " ".join(str(t) for _, t, _ in items if t).strip()
            scores = [float(s) for _, _, s in items if s is not None]
            confidence = sum(scores) / len(scores) if scores else None
            lines.append(
                TextLine(
                    id=f"l{index + 1}",
                    bbox=region.bbox,
                    text=text or None,
                    confidence=confidence,
                )
            )
        return lines

    async def _unload_impl(self) -> None:
        self._ocr = None
