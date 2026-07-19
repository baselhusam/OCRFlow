from __future__ import annotations

import time

from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.docling._converter import build_vlm_options, convert_document_async
from app.models.errors import ModelLoadError
from app.schemas.artifacts import DocumentArtifact, PageArtifact
from app.schemas.models.docling._meta import InferenceMeta
from app.schemas.models.docling.vlm_convert import VlmConvertInput, VlmConvertOutput


class DoclingVlmGraniteDoclingRunner(BaseRunner[VlmConvertInput, VlmConvertOutput]):
    model_id = "docling/vlm-granite-docling"

    def __init__(self) -> None:
        super().__init__()
        self._loaded = False

    async def _load_impl(self, config: ModelConfig) -> None:
        self._loaded = True

    async def _run_impl(self, input: VlmConvertInput) -> VlmConvertOutput:
        if not self._loaded or self._config is None:
            raise ModelLoadError("VLM runner not loaded")

        start = time.perf_counter()
        preset = input.options.preset or "granite_docling"
        vlm_options = build_vlm_options(preset)
        result = await convert_document_async(
            input.document,
            self._config,
            vlm_options=vlm_options,
            project_id=input.options.project_id,
        )

        markdown = None
        json_data = None
        doctags = None
        if hasattr(result, "document"):
            try:
                markdown = result.document.export_to_markdown()
            except Exception:
                markdown = None
            try:
                json_data = result.document.export_to_dict()
            except Exception:
                json_data = None

        if "doctags" in input.options.export and hasattr(result, "document"):
            try:
                doctags = result.document.export_to_doctags()
            except Exception:
                doctags = None

        latency_ms = (time.perf_counter() - start) * 1000
        return VlmConvertOutput(
            document=DocumentArtifact(
                pages=[PageArtifact(page_index=0)],
                metadata={"preset": preset},
            ),
            doctags=doctags,
            markdown=markdown,
            json_data=json_data,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _unload_impl(self) -> None:
        self._loaded = False
