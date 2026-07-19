"""Docling layout inference via LayoutPredictor (atomic stage, Option A)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from docling.datamodel.accelerator_options import AcceleratorDevice, AcceleratorOptions
from docling.datamodel.base_models import Cluster, Page
from docling.datamodel.layout_model_specs import LayoutModelConfig
from docling.datamodel.pipeline_options import LayoutOptions
from docling.models.stages.layout.layout_model import LayoutModel
from docling.utils.layout_postprocessor import LayoutPostprocessor
from docling_core.types.doc import DocItemLabel
from PIL import Image

from app.models.base import ModelConfig
from app.models.docling._accelerator import artifacts_path
from app.models.docling._common import device_to_torch, run_sync
from app.schemas.models.docling.layout_heron import LayoutDetectionOptions


def _layout_weights_path(cache_root: Path, model_spec: LayoutModelConfig) -> Path:
    model_dir = cache_root / model_spec.model_repo_folder
    if model_spec.model_path:
        model_dir = model_dir / model_spec.model_path
    return model_dir / "model.safetensors"


def ensure_layout_model_artifacts(
    config: ModelConfig,
    model_spec: LayoutModelConfig,
) -> Path:
    """Download layout weights into OCRFLOW_MODEL_CACHE when missing."""
    cache_root = artifacts_path(config)
    if not _layout_weights_path(cache_root, model_spec).is_file():
        LayoutModel.download_models(
            local_dir=cache_root / model_spec.model_repo_folder,
            layout_model_config=model_spec,
        )
    return cache_root


class LayoutEngine:
    """Wraps Docling LayoutModel / LayoutPredictor for single-page inference."""

    def __init__(
        self,
        model_spec: LayoutModelConfig,
        config: ModelConfig,
        options: LayoutDetectionOptions | None = None,
    ) -> None:
        self._model_spec = model_spec
        self._config = config
        self._options = options or LayoutDetectionOptions()
        self._layout_model: LayoutModel | None = None

    def load(self) -> None:
        layout_options = LayoutOptions(
            model_spec=self._model_spec,
            keep_empty_clusters=self._options.keep_empty_clusters,
            skip_cell_assignment=self._options.skip_cell_assignment,
        )
        device = AcceleratorDevice(device_to_torch(self._config.device))
        accelerator = AcceleratorOptions(
            device=device,
            num_threads=4,
        )
        artifacts = ensure_layout_model_artifacts(self._config, self._model_spec)
        self._layout_model = LayoutModel(
            artifacts_path=artifacts,
            accelerator_options=accelerator,
            options=layout_options,
        )

    def unload(self) -> None:
        self._layout_model = None

    def predict(self, pil: Image.Image, page: Page) -> list[Cluster]:
        if self._layout_model is None:
            raise RuntimeError("LayoutEngine is not loaded")

        predictions = self._layout_model.layout_predictor.predict_batch([pil])[0]
        clusters: list[Cluster] = []
        for index, pred in enumerate(predictions):
            label = DocItemLabel(
                pred["label"].lower().replace(" ", "_").replace("-", "_")
            )
            clusters.append(
                Cluster(
                    id=index,
                    label=label,
                    confidence=float(pred["confidence"]),
                    bbox=self._bbox_from_pred(pred),
                    cells=[],
                )
            )

        layout_options = LayoutOptions(
            model_spec=self._model_spec,
            keep_empty_clusters=self._options.keep_empty_clusters,
            skip_cell_assignment=self._options.skip_cell_assignment,
        )
        processed_clusters, _ = LayoutPostprocessor(page, clusters, layout_options).postprocess()
        return processed_clusters

    @staticmethod
    def _bbox_from_pred(pred: dict[str, Any]):
        from docling_core.types.doc import BoundingBox, CoordOrigin

        return BoundingBox(
            l=float(pred["l"]),
            t=float(pred["t"]),
            r=float(pred["r"]),
            b=float(pred["b"]),
            coord_origin=CoordOrigin.TOPLEFT,
        )


async def load_layout_engine(
    model_spec: LayoutModelConfig,
    config: ModelConfig,
    options: LayoutDetectionOptions | None = None,
) -> LayoutEngine:
    engine = LayoutEngine(model_spec, config, options)

    def _load() -> LayoutEngine:
        engine.load()
        return engine

    return await run_sync(_load)
