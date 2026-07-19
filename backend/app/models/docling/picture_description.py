from __future__ import annotations

import time

from docling.datamodel.pipeline_options import PictureDescriptionVlmEngineOptions
from docling.models.stages.picture_description.picture_description_vlm_engine_model import (
    PictureDescriptionVlmEngineModel,
)

from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.docling._accelerator import build_accelerator_options
from app.models.docling._hf_artifacts import ensure_vlm_model_spec_artifacts
from app.models.docling._common import page_image_to_pil, run_sync
from app.models.errors import ModelLoadError
from app.schemas.artifacts import Figure, TextLine
from app.schemas.models.docling._meta import InferenceMeta
from app.schemas.models.docling.picture_description import (
    PictureDescriptionInput,
    PictureDescriptionOutput,
)


class DoclingPictureDescriptionRunner(
    BaseRunner[PictureDescriptionInput, PictureDescriptionOutput]
):
    model_id = "docling/picture-description-smolvlm"

    def __init__(self) -> None:
        super().__init__()
        self._model: PictureDescriptionVlmEngineModel | None = None

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            options = PictureDescriptionVlmEngineOptions.from_preset("smolvlm")
            artifacts = ensure_vlm_model_spec_artifacts(config, options.model_spec)
            self._model = PictureDescriptionVlmEngineModel(
                enabled=True,
                enable_remote_services=False,
                artifacts_path=artifacts,
                options=options,
                accelerator_options=build_accelerator_options(config),
            )
        except Exception as exc:
            raise ModelLoadError(
                f"Failed to load docling/picture-description-smolvlm: {exc}"
            ) from exc

    async def _run_impl(self, input: PictureDescriptionInput) -> PictureDescriptionOutput:
        if self._model is None or self._model.engine is None:
            raise ModelLoadError("Picture description model not loaded")

        start = time.perf_counter()
        pil = await page_image_to_pil(input.page)
        figures_in = input.figures or [Figure(id="f1", bbox=[0.0, 0.0, 1.0, 1.0])]
        results: list[TextLine] = []

        for figure in figures_in:
            x0, y0, x1, y1 = figure.bbox
            crop = pil.crop(
                (
                    int(x0 * pil.width),
                    int(y0 * pil.height),
                    int(x1 * pil.width),
                    int(y1 * pil.height),
                )
            )

            def _describe() -> str:
                from docling.models.inference_engines.vlm import VlmEngineInput

                output = self._model.engine.predict(
                    VlmEngineInput(
                        image=crop,
                        prompt="Describe this figure.",
                    )
                )
                return output.text or ""

            description = await run_sync(_describe)
            text = (
                description
                or figure.description
                or figure.caption
                or ""
            ).strip()
            results.append(
                TextLine(
                    id=figure.id,
                    bbox=figure.bbox,
                    text=text or None,
                )
            )

        latency_ms = (time.perf_counter() - start) * 1000
        return PictureDescriptionOutput(
            page_index=input.page.page_index,
            lines=results,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _unload_impl(self) -> None:
        self._model = None
