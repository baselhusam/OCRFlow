import uuid

import pytest

from app.schemas.artifacts import PageArtifact, PageImage
from app.schemas.models.docling._meta import InferenceMeta
from app.schemas.models.loader.pdf import ImageLoaderInput, ImageLoaderOutput
from app.services.pipeline_execution.executor import PipelineExecutor
from app.services.pipeline_execution.readiness import get_pipeline_readiness
from app.services.pipeline_execution.schemas import parse_pipeline_graph


class FakeImageLoaderRunner:
    async def run(self, input: ImageLoaderInput) -> ImageLoaderOutput:
        assert input.document.source == "asset:asset-1"
        return ImageLoaderOutput(
            pages=[
                PageArtifact(
                    page_index=0,
                    page=PageImage(
                        page_index=0,
                        width=1,
                        height=1,
                        image_base64="dGVzdA==",
                    ),
                )
            ],
            meta=InferenceMeta(model_id="loader/image", latency_ms=1.0),
        )


def test_pipeline_readiness_orders_nodes():
    graph = parse_pipeline_graph(
        {
            "nodes": [
                {"id": "a", "modelId": "loader/image", "position": {"x": 0, "y": 0}},
                {"id": "b", "modelId": "loader/page-at", "position": {"x": 1, "y": 0}},
            ],
            "edges": [{"id": "e1", "source": "a", "target": "b"}],
        }
    )

    readiness = get_pipeline_readiness(graph)

    assert readiness.ready is True
    assert readiness.ordered_node_ids == ["a", "b"]


@pytest.mark.asyncio(loop_scope="session")
async def test_pipeline_executor_updates_node_runtime(monkeypatch):
    async def fake_get_cached_runner(model_id, config):
        assert model_id == "loader/image"
        return FakeImageLoaderRunner()

    monkeypatch.setattr(
        "app.services.pipeline_execution.executor.get_cached_runner",
        fake_get_cached_runner,
    )

    executor = PipelineExecutor(
        project_id=uuid.uuid4(),
        owner_id=uuid.uuid4(),
        db=None,  # type: ignore[arg-type]
    )

    result = await executor.execute(
        {
            "nodes": [
                {
                    "id": "loader",
                    "modelId": "loader/image",
                    "position": {"x": 0, "y": 0},
                    "config": {"assetId": "asset-1", "format": "image"},
                }
            ],
            "edges": [],
        }
    )

    node = result.graph.nodes[0]
    assert node.runtime is not None
    assert node.runtime.runStatus == "success"
    assert node.runtime.cachedOutput is not None
    assert node.runtime.cachedOutput.kind == "pages"
    assert result.completed_count == 1
    assert result.total_count == 1
