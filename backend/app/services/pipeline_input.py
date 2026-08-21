"""Adapt uploaded assets into a pipeline's declared input wire kind."""

from __future__ import annotations

from uuid import UUID

from app.core.config import get_settings
from app.models.runner_factory import get_cached_runner
from app.schemas.models.loader.pdf import ImageLoaderInput, PdfLoaderInput
from app.services.asset_storage import load_asset_meta
from app.services.pipeline_execution.registry import extract_model_output
from app.services.pipeline_execution.schemas import NodeCachedOutput


async def materialize_pipeline_input(
    *,
    asset_id: str,
    asset_project_id: str,
    input_wire_kind: str | None,
) -> NodeCachedOutput:
    """Turn a stored asset into the ``NodeCachedOutput`` entry nodes expect.

    Reusable pipelines forbid embedded file loaders. This adapter runs the
    appropriate loader (or builds a document handle) so ``POST /pipelines/.../runs``
    can supply the graph's declared input wire kind.
    """
    settings = get_settings()
    meta = load_asset_meta(settings.upload_dir, asset_project_id, asset_id)
    config = settings.build_model_config()
    kind = input_wire_kind or "page_artifact_array"

    if kind in {"document_input", "file"}:
        return NodeCachedOutput(
            kind="document",
            raw={
                "document": {
                    "source": f"asset:{asset_id}",
                    "format": meta.format,
                },
                "options": {"project_id": asset_project_id},
            },
            preview={"filename": meta.filename, "format": meta.format},
        )

    # page_artifact / page_artifact_array / unknown page-oriented inputs
    model_id = "loader/pdf" if meta.format == "pdf" else "loader/image"
    if meta.format == "pdf":
        payload = PdfLoaderInput(
            document={"source": f"asset:{asset_id}", "format": "pdf"},
            options={"project_id": asset_project_id},
        )
    else:
        payload = ImageLoaderInput(
            document={"source": f"asset:{asset_id}", "format": "image"},
            options={"project_id": asset_project_id},
        )

    runner = await get_cached_runner(model_id, config)
    result = await runner.run(payload)
    return extract_model_output(model_id, result)


def resolve_asset_project_id(
    *,
    pipeline_id: UUID,
    explicit_project_id: UUID | None,
) -> str:
    if explicit_project_id is not None:
        return str(explicit_project_id)
    # Assets uploaded for headless pipeline runs live under a stable namespace.
    return f"pipeline-{pipeline_id}"
