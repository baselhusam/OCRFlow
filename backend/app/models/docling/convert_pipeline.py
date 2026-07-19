from __future__ import annotations

import time

from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.docling._converter import build_pipeline_options, convert_document_async
from app.models.errors import ModelLoadError
from app.schemas.artifacts import DocumentArtifact, PageArtifact
from app.schemas.models.docling._meta import InferenceMeta
from app.schemas.models.docling.convert_pipeline import (
    ConvertPipelineInput,
    ConvertPipelineOutput,
)


class DoclingConvertPipelineRunner(BaseRunner[ConvertPipelineInput, ConvertPipelineOutput]):
    model_id = "docling/convert-pipeline"

    def __init__(self) -> None:
        super().__init__()
        self._loaded = False

    async def _load_impl(self, config: ModelConfig) -> None:
        self._loaded = True

    async def _run_impl(self, input: ConvertPipelineInput) -> ConvertPipelineOutput:
        if not self._loaded or self._config is None:
            raise ModelLoadError("Convert pipeline runner not loaded")

        start = time.perf_counter()
        opts = input.options
        pipeline_options = build_pipeline_options(
            layout_model=opts.layout_model,
            ocr_engine=opts.ocr_engine,
            tableformer_mode=opts.tableformer_mode,
            do_ocr=True,
            do_table_structure=True,
            do_picture_classification=opts.enrich_pictures,
            do_picture_description=opts.enrich_pictures,
            do_code_formula=opts.enrich_formulas,
        )
        result = await convert_document_async(
            input.document,
            self._config,
            pipeline_options=pipeline_options,
            project_id=input.options.project_id,
        )

        markdown = None
        try:
            markdown = result.document.export_to_markdown()
        except Exception:
            markdown = None

        latency_ms = (time.perf_counter() - start) * 1000
        return ConvertPipelineOutput(
            document=DocumentArtifact(
                pages=[PageArtifact(page_index=0)],
                metadata={"pipeline": "docling/convert-pipeline"},
            ),
            markdown=markdown,
            metadata={"status": str(getattr(result, "status", "success"))},
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _unload_impl(self) -> None:
        self._loaded = False
