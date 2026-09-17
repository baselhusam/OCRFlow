import uuid

import pytest

from app.models.runner_factory import RUNNER_FACTORIES
from app.schemas.artifacts import PageArtifact, PageImage, Region, TextLine
from app.schemas.models.docling._meta import InferenceMeta
from app.schemas.models.loader.pdf import ImageLoaderInput, ImageLoaderOutput
from app.schemas.models.paddle._meta import InferenceMeta as PaddleInferenceMeta
from app.schemas.models.paddle.doclayout import DocLayoutInput, DocLayoutOutput
from app.schemas.models.paddle.ocr import PaddleOcrInput, PaddleOcrOutput
from app.services.pipeline_execution.executor import PipelineExecutor
from app.services.pipeline_execution.readiness import get_pipeline_readiness
from app.services.pipeline_execution.registry import (
    MODEL_EXECUTION_SPECS,
    build_model_input,
)
from app.services.pipeline_execution.schemas import (
    NodeCachedOutput,
    PipelineNodeRecord,
    parse_pipeline_graph,
)
from app.services.pipeline_execution.upstream import UpstreamContext
from app.services.pipeline_wire_kinds import MODEL_WIRE_KINDS


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


class FakePaddleLayoutRunner:
    async def run(self, input: DocLayoutInput) -> DocLayoutOutput:
        assert input.page.page_index == 0
        return DocLayoutOutput(
            page_index=0,
            regions=[
                Region(
                    id="r1",
                    label="paragraph",
                    bbox=[0.0, 0.0, 1.0, 1.0],
                    confidence=0.99,
                )
            ],
            meta=PaddleInferenceMeta(
                model_id="paddle/doclayout-s",
                latency_ms=1.0,
            ),
        )


class FakePaddleOcrRunner:
    async def run(self, input: PaddleOcrInput) -> PaddleOcrOutput:
        assert input.page.page_index == 0
        assert [region.id for region in input.regions] == ["r1"]
        return PaddleOcrOutput(
            page_index=0,
            lines=[
                TextLine(
                    id="l1",
                    bbox=[0.0, 0.0, 1.0, 1.0],
                    text="Invoice total: $42.00",
                    confidence=0.98,
                )
            ],
            meta=PaddleInferenceMeta(
                model_id="paddle/ocr-v6-small",
                latency_ms=1.0,
            ),
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


def test_every_registered_runner_has_pipeline_contracts():
    runner_ids = set(RUNNER_FACTORIES)
    assert runner_ids <= set(MODEL_EXECUTION_SPECS)
    assert runner_ids <= set(MODEL_WIRE_KINDS)


def test_structured_extract_builds_typed_input_from_ocr_lines():
    node = PipelineNodeRecord(
        id="extract",
        modelId="ollama/structured-extract",
        config={
            "prompt": "Extract invoice fields",
            "model": "qwen3:0.6b",
            "json_schema": (
                '{"type":"object","properties":{"total":{"type":"number"}},'
                '"required":["total"]}'
            ),
        },
    )
    upstream = UpstreamContext(
        node_id="ocr",
        output=NodeCachedOutput(
            kind="lines",
            raw={"lines": [{"text": "Invoice total 42.00 USD"}]},
        ),
        source_handle="output",
        edge=None,
    )

    model_input = build_model_input(
        project_id="project-1",
        node=node,
        upstream=upstream,
    )

    assert model_input.text == "Invoice total 42.00 USD"
    assert model_input.prompt == "Extract invoice fields"
    assert model_input.json_schema["required"] == ["total"]


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


@pytest.mark.asyncio(loop_scope="session")
async def test_pipeline_executor_runs_paddle_layout_to_ocr(monkeypatch):
    runners = {
        "loader/image": FakeImageLoaderRunner(),
        "paddle/doclayout-s": FakePaddleLayoutRunner(),
        "paddle/ocr-v6-small": FakePaddleOcrRunner(),
    }

    async def fake_get_cached_runner(model_id, config):
        return runners[model_id]

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
                    "config": {"assetId": "asset-1", "format": "image"},
                },
                {"id": "layout", "modelId": "paddle/doclayout-s"},
                {"id": "ocr", "modelId": "paddle/ocr-v6-small"},
            ],
            "edges": [
                {"id": "e1", "source": "loader", "target": "layout"},
                {"id": "e2", "source": "layout", "target": "ocr"},
            ],
        }
    )

    assert result.completed_count == 3
    assert result.final_output is not None
    assert result.final_output.kind == "lines"
    assert result.final_output.raw["lines"][0]["text"] == "Invoice total: $42.00"
    assert result.graph.nodes[1].runtime is not None
    assert result.graph.nodes[1].runtime.cachedOutput is not None
    assert result.graph.nodes[1].runtime.cachedOutput.preview["pageImage"]["page_index"] == 0


def test_upstream_slices_item_and_group_handles() -> None:
    from app.services.pipeline_execution.schemas import NodeCachedOutput
    from app.services.pipeline_execution.upstream import slice_output_by_handle

    regions = NodeCachedOutput(
        kind="regions",
        raw={"page_index": 0, "regions": [{"id": "r1"}, {"id": "r2"}, {"id": "r3"}]},
        preview={"itemCount": 3},
    )
    one = slice_output_by_handle(regions, "item:region:r2")
    assert one is not None and [r["id"] for r in one.raw["regions"]] == ["r2"]
    group = slice_output_by_handle(regions, "items:region:r1,r3")
    assert group is not None and [r["id"] for r in group.raw["regions"]] == ["r1", "r3"]
    assert group.preview["itemCount"] == 2
    assert slice_output_by_handle(regions, "output") is regions

    pages = NodeCachedOutput(
        kind="pages",
        raw={"pages": [{"page_index": i, "page": {"page_index": i, "width": 1, "height": 1}} for i in range(3)]},
    )
    page = slice_output_by_handle(pages, "item:page:1")
    assert page is not None and page.kind == "page" and page.raw["page"]["page_index"] == 1
    subset = slice_output_by_handle(pages, "items:page:0,2")
    assert subset is not None and subset.kind == "pages"
    assert [p["page_index"] for p in subset.raw["pages"]] == [0, 2]


def test_branch_nodes_are_pass_through_and_ready() -> None:
    from app.services.pipeline_execution.readiness import get_pipeline_readiness
    from app.services.pipeline_execution.registry import pass_through_output
    from app.services.pipeline_execution.schemas import NodeCachedOutput, parse_pipeline_graph
    from app.services.pipeline_execution.upstream import UpstreamContext

    graph = parse_pipeline_graph(
        {
            "nodes": [
                {"id": "layout", "modelId": "surya/layout", "config": {}},
                {"id": "branch", "modelId": "layout/region-branch", "config": {}},
                {"id": "ocr", "modelId": "surya/text-detection", "config": {}},
            ],
            "edges": [
                {"id": "e1", "source": "layout", "target": "branch"},
                {"id": "e2", "source": "branch", "target": "ocr", "sourceHandle": "item:region:r2"},
            ],
        }
    )
    readiness = get_pipeline_readiness(graph)
    assert readiness.ready, readiness.issues
    assert readiness.ordered_node_ids == ["layout", "branch", "ocr"]

    branch = next(node for node in graph.nodes if node.id == "branch")
    regions = NodeCachedOutput(kind="regions", raw={"regions": [{"id": "r2"}]})
    forwarded = pass_through_output(
        branch, UpstreamContext(node_id="layout", output=regions, source_handle="output", edge=None)
    )
    assert forwarded is regions


def test_upstream_slices_page_qualified_items_from_mapped_output() -> None:
    from app.services.pipeline_execution.schemas import NodeCachedOutput
    from app.services.pipeline_execution.upstream import slice_output_by_handle

    mapped = NodeCachedOutput(
        kind="regions",
        raw={"page_index": 0, "regions": [{"id": "r1", "p": 0}]},
        mapped=[
            {"page_index": 0, "output": {"kind": "regions", "raw": {"regions": [{"id": "r1", "p": 0}]}}},
            {"page_index": 3, "output": {"kind": "regions", "raw": {"regions": [{"id": "r1", "p": 3}, {"id": "r2", "p": 3}]}}},
        ],
    )
    sliced = slice_output_by_handle(mapped, "item:region:r1@3")
    assert sliced is not None and sliced.raw["regions"] == [{"id": "r1", "p": 3}]
    group = slice_output_by_handle(mapped, "items:region:r1,r2@3")
    assert group is not None and [r["id"] for r in group.raw["regions"]] == ["r1", "r2"]
    assert slice_output_by_handle(mapped, "item:region:r1@9") is None
