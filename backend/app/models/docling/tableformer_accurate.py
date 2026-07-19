from __future__ import annotations

import time

from docling.datamodel.base_models import LayoutPrediction
from docling.datamodel.pipeline_options import TableFormerMode, TableStructureOptions
from docling.models.stages.table_structure.table_structure_model import TableStructureModel

from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.docling._accelerator import artifacts_path, build_accelerator_options
from app.models.docling._common import page_image_to_pil, run_sync
from app.models.docling._conversion import build_conversion_page
from app.models.docling._mappers import bbox_input_to_cluster, table_to_structure
from app.models.errors import ModelLoadError
from app.schemas.models.docling._meta import InferenceMeta
from app.schemas.models.docling.table_structure import (
    TableStructureInput,
    TableStructureOutput,
)


class DoclingTableformerAccurateRunner(
    BaseRunner[TableStructureInput, TableStructureOutput]
):
    model_id = "docling/tableformer-accurate"

    def __init__(self) -> None:
        super().__init__()
        self._model: TableStructureModel | None = None

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            options = TableStructureOptions(
                mode=TableFormerMode.ACCURATE,
                do_cell_matching=True,
            )
            self._model = TableStructureModel(
                enabled=True,
                artifacts_path=artifacts_path(config),
                options=options,
                accelerator_options=build_accelerator_options(config),
            )
        except Exception as exc:
            raise ModelLoadError(f"Failed to load docling/tableformer-accurate: {exc}") from exc

    async def _run_impl(self, input: TableStructureInput) -> TableStructureOutput:
        if self._model is None:
            raise ModelLoadError("TableFormer model not loaded")

        start = time.perf_counter()
        pil = await page_image_to_pil(input.page)
        conv_res, page = await build_conversion_page(input.page, pil)

        clusters = [
            bbox_input_to_cluster(table.bbox, pil.width, pil.height, index)
            for index, table in enumerate(input.tables)
        ]
        page.predictions.layout = LayoutPrediction(clusters=clusters)

        def _run():
            self._model.predict_tables(conv_res, [page])
            return page

        page = await run_sync(_run)
        tables = []
        if page.predictions.tablestructure and page.predictions.tablestructure.table_map:
            for index, table in enumerate(page.predictions.tablestructure.table_map.values()):
                table_id = input.tables[index].id if index < len(input.tables) else f"t{index + 1}"
                tables.append(table_to_structure(table, table_id, pil.width, pil.height))

        latency_ms = (time.perf_counter() - start) * 1000
        return TableStructureOutput(
            page_index=input.page.page_index,
            tables=tables,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _unload_impl(self) -> None:
        self._model = None
