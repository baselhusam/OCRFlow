from __future__ import annotations

import time

from docling.datamodel.picture_classification_options import DocumentPictureClassifierOptions
from docling.models.inference_engines.image_classification import ImageClassificationEngineInput
from docling.models.stages.picture_classifier.document_picture_classifier import (
    DocumentPictureClassifier,
)

from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.docling._accelerator import artifacts_path, build_accelerator_options
from app.models.docling._common import page_image_to_pil, run_sync
from app.models.errors import ModelLoadError
from app.schemas.artifacts import Figure
from app.schemas.models.docling._meta import InferenceMeta
from app.schemas.models.docling.picture_classifier import (
    FigureClassificationInput,
    FigureClassificationOutput,
)


class DoclingPictureClassifierRunner(
    BaseRunner[FigureClassificationInput, FigureClassificationOutput]
):
    model_id = "docling/picture-classifier-v2.5"

    def __init__(self) -> None:
        super().__init__()
        self._model: DocumentPictureClassifier | None = None

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            options = DocumentPictureClassifierOptions.from_preset(
                "document_figure_classifier_v2"
            )
            self._model = DocumentPictureClassifier(
                enabled=True,
                artifacts_path=artifacts_path(config),
                options=options,
                accelerator_options=build_accelerator_options(config),
            )
        except Exception as exc:
            raise ModelLoadError(
                f"Failed to load docling/picture-classifier-v2.5: {exc}"
            ) from exc

    async def _run_impl(self, input: FigureClassificationInput) -> FigureClassificationOutput:
        if self._model is None or self._model.engine is None:
            raise ModelLoadError("Picture classifier not loaded")

        start = time.perf_counter()
        pil = await page_image_to_pil(input.page)
        figures_in = input.figures or [
            Figure(id="f1", bbox=[0.0, 0.0, 1.0, 1.0])
        ]
        results: list[Figure] = []

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
            prediction = await run_sync(
                self._model.engine.predict,
                ImageClassificationEngineInput(image=crop),
            )
            label = "other"
            if prediction.label_ids:
                label_id = prediction.label_ids[0]
                label = self._model.engine.get_label_mapping().get(label_id, "other")
                label = label.lower().replace(" ", "_")
            results.append(
                Figure(
                    id=figure.id,
                    bbox=figure.bbox,
                    category=label,
                    caption=figure.caption,
                    description=figure.description,
                )
            )

        latency_ms = (time.perf_counter() - start) * 1000
        return FigureClassificationOutput(
            page_index=input.page.page_index,
            figures=results,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _unload_impl(self) -> None:
        self._model = None
