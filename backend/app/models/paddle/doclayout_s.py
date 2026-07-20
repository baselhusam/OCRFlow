"""PaddleOCR PP-DocLayout-S layout detection runner."""

from __future__ import annotations

import time

from app.models._image_utils import page_image_to_pil, pil_to_temp_path, run_sync
from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.errors import ModelLoadError
from app.models.paddle._common import resolve_paddle_device
from app.models.paddle._mappers import iter_layout_boxes, paddle_layout_box_to_region
from app.models.paddle.doclayout_validate import validate_layout_regions
from app.schemas.models.paddle._meta import InferenceMeta
from app.schemas.models.paddle.doclayout import DocLayoutInput, DocLayoutOutput

_INSTALL_HINT = (
    "paddleocr is not installed. Install with: pip install -r requirements-paddle.txt"
)


class PaddleDocLayoutSRunner(BaseRunner[DocLayoutInput, DocLayoutOutput]):
    model_id = "paddle/doclayout-s"

    def __init__(self) -> None:
        super().__init__()
        self._model = None

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            from paddleocr import LayoutDetection

            device = resolve_paddle_device(config.device)
            self._model = await run_sync(
                lambda: LayoutDetection(model_name="PP-DocLayout-S", device=device),
            )
        except ImportError as exc:
            raise ModelLoadError(_INSTALL_HINT) from exc
        except Exception as exc:
            raise ModelLoadError(f"Failed to load paddle/doclayout-s: {exc}") from exc

    async def _run_impl(self, input: DocLayoutInput) -> DocLayoutOutput:
        if self._model is None:
            raise ModelLoadError("PP-DocLayout-S model not loaded")

        start = time.perf_counter()
        pil = await page_image_to_pil(input.page)
        tmp_path = await pil_to_temp_path(pil)
        try:
            results = await run_sync(self._model.predict, str(tmp_path))
        finally:
            tmp_path.unlink(missing_ok=True)

        result = results[0] if results else {}
        regions = []
        for index, box in enumerate(iter_layout_boxes(result)):
            region = paddle_layout_box_to_region(
                box["coordinate"],
                box["label"],
                box["score"],
                f"r{index + 1}",
                pil.width,
                pil.height,
                confidence_threshold=input.options.confidence_threshold,
            )
            if region is not None:
                regions.append(region)

        validate_layout_regions(regions)
        latency_ms = (time.perf_counter() - start) * 1000
        return DocLayoutOutput(
            page_index=input.page.page_index,
            regions=regions,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _unload_impl(self) -> None:
        self._model = None
