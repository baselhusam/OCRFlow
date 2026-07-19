from __future__ import annotations

import time

from docling.datamodel.pipeline_options import OcrAutoOptions
from docling.models.stages.ocr.auto_ocr_model import OcrAutoModel

from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.docling._accelerator import artifacts_path, build_accelerator_options
from app.models.docling._common import page_image_to_pil, run_sync
from app.models.docling._conversion import build_conversion_page
from app.models.docling._mappers import text_cell_to_line
from app.models.errors import ModelLoadError
from app.schemas.models.docling._meta import InferenceMeta
from app.schemas.models.docling.ocr import OcrRecognitionInput, OcrRecognitionOutput


class DoclingOcrAutoRunner(BaseRunner[OcrRecognitionInput, OcrRecognitionOutput]):
    model_id = "docling/ocr-auto"

    def __init__(self) -> None:
        super().__init__()
        self._model: OcrAutoModel | None = None

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            options = OcrAutoOptions(force_full_page_ocr=True)
            self._model = OcrAutoModel(
                enabled=True,
                artifacts_path=artifacts_path(config),
                options=options,
                accelerator_options=build_accelerator_options(config),
            )
            if self._model._engine is None:
                raise ModelLoadError("No OCR engine available for docling/ocr-auto")
        except ModelLoadError:
            raise
        except Exception as exc:
            raise ModelLoadError(f"Failed to load docling/ocr-auto: {exc}") from exc

    async def _run_impl(self, input: OcrRecognitionInput) -> OcrRecognitionOutput:
        if self._model is None:
            raise ModelLoadError("OCR model not loaded")

        start = time.perf_counter()
        pil = await page_image_to_pil(input.page)
        conv_res, page = await build_conversion_page(input.page, pil)

        def _run():
            list(self._model(conv_res, [page]))
            return page

        page = await run_sync(_run)
        lines = [
            text_cell_to_line(cell, f"l{index + 1}", pil.width, pil.height)
            for index, cell in enumerate(page.cells)
            if cell.text and cell.text.strip()
        ]
        latency_ms = (time.perf_counter() - start) * 1000
        return OcrRecognitionOutput(
            page_index=input.page.page_index,
            lines=lines,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _unload_impl(self) -> None:
        self._model = None
