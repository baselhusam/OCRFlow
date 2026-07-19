"""Surya table recognition runner."""

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
from app.models.surya._mappers import image_bbox_dimensions, table_result_to_structure
from app.models.surya.table_recognition_validate import validate_table_structures
from app.schemas.models.surya._meta import InferenceMeta
from app.schemas.models.surya.table_recognition import (
    TableRecognitionInput,
    TableRecognitionOutput,
)


class SuryaTableRecognitionRunner(BaseRunner[TableRecognitionInput, TableRecognitionOutput]):
    model_id = "surya/table-recognition"

    def __init__(self) -> None:
        super().__init__()
        self._table_predictor = None

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            from surya.table_rec import TableRecPredictor

            from app.models.surya._foundation import _configure_surya_env

            _configure_surya_env(config)
            os.environ.setdefault("TABLE_REC_BATCH_SIZE", "4")
            self._table_predictor = await run_sync(TableRecPredictor)
        except ImportError as exc:
            raise ModelLoadError(
                "surya-ocr is not installed. Install with: pip install -r requirements-surya.txt"
            ) from exc
        except Exception as exc:
            raise ModelLoadError(f"Failed to load surya/table-recognition: {exc}") from exc

    async def _run_impl(self, input: TableRecognitionInput) -> TableRecognitionOutput:
        if self._table_predictor is None:
            raise ModelLoadError("Surya table recognition predictor not loaded")

        start = time.perf_counter()
        pil = await page_image_to_pil(input.page)
        images = []
        table_ids: list[str] = []

        if input.tables:
            for index, table in enumerate(input.tables):
                left, top, right, bottom = denormalize_bbox_to_pixels(
                    table.bbox, pil.width, pil.height
                )
                images.append(pil.crop((left, top, right, bottom)))
                table_ids.append(table.id)
        else:
            images = [pil]
            table_ids = ["t1"]

        results = await run_sync(self._table_predictor, images)
        tables = []
        for table_id, result, image in zip(table_ids, results, images, strict=True):
            width, height = image_bbox_dimensions(
                result.image_bbox, image.width, image.height
            )
            structure = table_result_to_structure(result, table_id, width, height)
            if input.tables:
                region = next(item for item in input.tables if item.id == table_id)
                structure = structure.model_copy(update={"bbox": region.bbox})
            tables.append(structure)

        validate_table_structures(tables)
        latency_ms = (time.perf_counter() - start) * 1000
        return TableRecognitionOutput(
            page_index=input.page.page_index,
            tables=tables,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _unload_impl(self) -> None:
        self._table_predictor = None
