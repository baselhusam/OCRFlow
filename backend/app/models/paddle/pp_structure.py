"""PaddleOCR PP-StructureV3 document-parsing runner.

PP-StructureV3 bundles layout detection, OCR, and table recognition. The runner splits
the pipeline result into a flattened page artifact (regions + lines + tables).
"""

from __future__ import annotations

import time
from typing import Any

from app.models._image_utils import page_image_to_pil, pil_to_temp_path, run_sync
from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.errors import ModelLoadError
from app.models.paddle._common import resolve_paddle_device
from app.models.paddle._mappers import (
    as_result_dict,
    iter_layout_boxes,
    iter_ocr_items,
    paddle_layout_box_to_region,
    paddle_ocr_to_text_line,
    paddle_table_to_structure,
)
from app.models.paddle.pp_structure_validate import validate_page_artifact
from app.schemas.artifacts import Region, TableStructure, TextLine
from app.schemas.models.paddle._meta import InferenceMeta
from app.schemas.models.paddle.pp_structure import PpStructureInput, PpStructureOutput

_INSTALL_HINT = (
    "paddleocr is not installed. Install with: pip install -r requirements-paddle.txt"
)


def _split_pp_structure(
    result: Any, width: int, height: int
) -> tuple[list[Region], list[TextLine], list[TableStructure]]:
    data = as_result_dict(result)

    regions: list[Region] = []
    layout_res = data.get("layout_det_res") or data.get("layout_res") or {}
    for index, box in enumerate(iter_layout_boxes(layout_res)):
        if not box.get("coordinate"):
            continue
        region = paddle_layout_box_to_region(
            box["coordinate"], box["label"], box["score"], f"r{index + 1}", width, height
        )
        if region is not None:
            regions.append(region)

    lines: list[TextLine] = []
    ocr_res = data.get("overall_ocr_res") or data.get("ocr_res") or {}
    for index, (poly, text, score) in enumerate(iter_ocr_items(ocr_res)):
        lines.append(
            paddle_ocr_to_text_line(poly, text, score, f"l{index + 1}", width, height)
        )

    tables: list[TableStructure] = []
    for index, table in enumerate(data.get("table_res_list") or []):
        table_dict = as_result_dict(table)
        html = table_dict.get("pred_html") or table_dict.get("html")
        tables.append(paddle_table_to_structure(html, [0.0, 0.0, 1.0, 1.0], f"t{index + 1}"))

    return regions, lines, tables


class PaddlePpStructureRunner(BaseRunner[PpStructureInput, PpStructureOutput]):
    model_id = "paddle/pp-structure"

    def __init__(self) -> None:
        super().__init__()
        self._pipeline = None

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            from paddleocr import PPStructureV3

            device = resolve_paddle_device(config.device)
            self._pipeline = await run_sync(lambda: PPStructureV3(device=device))
        except ImportError as exc:
            raise ModelLoadError(_INSTALL_HINT) from exc
        except Exception as exc:
            raise ModelLoadError(f"Failed to load paddle/pp-structure: {exc}") from exc

    async def _run_impl(self, input: PpStructureInput) -> PpStructureOutput:
        if self._pipeline is None:
            raise ModelLoadError("PP-StructureV3 pipeline not loaded")

        start = time.perf_counter()
        pil = await page_image_to_pil(input.page)
        tmp_path = await pil_to_temp_path(pil)
        try:
            results = await run_sync(self._pipeline.predict, str(tmp_path))
        finally:
            tmp_path.unlink(missing_ok=True)

        result = results[0] if results else {}
        regions, lines, tables = _split_pp_structure(result, pil.width, pil.height)

        validate_page_artifact(regions, lines, tables)
        latency_ms = (time.perf_counter() - start) * 1000
        return PpStructureOutput(
            page_index=input.page.page_index,
            regions=regions,
            lines=lines,
            tables=tables,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _unload_impl(self) -> None:
        self._pipeline = None
