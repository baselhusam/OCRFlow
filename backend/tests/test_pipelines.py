"""Pipeline API integration tests."""

import io
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.pipeline_boundary import derive_pipeline_boundary_io

VALID_GRAPH = {
    "nodes": [
        {
            "id": "entry-1",
            "modelId": "surya/layout",
            "position": {"x": 0, "y": 0},
        },
        {
            "id": "exit-1",
            "modelId": "surya/text-detection",
            "position": {"x": 200, "y": 0},
        },
    ],
    "edges": [
        {
            "id": "e1",
            "source": "entry-1",
            "target": "exit-1",
        }
    ],
}


@pytest.fixture(scope="session")
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as http_client:
        yield http_client


async def _register_and_login(
    client: AsyncClient,
    email: str,
    password: str = "password123",
) -> str:
    register_response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "Pipeline User"},
    )
    assert register_response.status_code == 201
    return register_response.json()["access_token"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio(loop_scope="session")
async def test_pipeline_crud_and_boundary_validation(client: AsyncClient):
    email = f"pipelines-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)
    headers = _auth_headers(token)

    create_response = await client.post(
        "/api/v1/pipelines",
        json={"name": "Layout stack", "description": "Test pipeline"},
        headers=headers,
    )
    assert create_response.status_code == 201
    pipeline = create_response.json()
    pipeline_id = pipeline["id"]
    assert pipeline["name"] == "Layout stack"
    assert pipeline["input_wire_kind"] is None

    invalid_patch = await client.patch(
        f"/api/v1/pipelines/{pipeline_id}",
        json={"graph": {"nodes": [], "edges": []}},
        headers=headers,
    )
    assert invalid_patch.status_code == 422

    valid_patch = await client.patch(
        f"/api/v1/pipelines/{pipeline_id}",
        json={"graph": VALID_GRAPH},
        headers=headers,
    )
    assert valid_patch.status_code == 200
    updated = valid_patch.json()
    assert updated["input_wire_kind"] == "page_artifact"
    assert updated["output_wire_kind"] == "text_line_array"

    list_response = await client.get("/api/v1/pipelines", headers=headers)
    assert list_response.status_code == 200
    assert len(list_response.json()["items"]) == 1

    get_response = await client.get(
        f"/api/v1/pipelines/{pipeline_id}",
        headers=headers,
    )
    assert get_response.status_code == 200

    delete_response = await client.delete(
        f"/api/v1/pipelines/{pipeline_id}",
        headers=headers,
    )
    assert delete_response.status_code == 204


@pytest.mark.asyncio(loop_scope="session")
async def test_create_pipeline_with_graph(client: AsyncClient):
    email = f"pipelines-graph-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)
    headers = _auth_headers(token)

    create_response = await client.post(
        "/api/v1/pipelines",
        json={"name": "From canvas", "graph": VALID_GRAPH},
        headers=headers,
    )
    assert create_response.status_code == 201
    pipeline = create_response.json()
    assert pipeline["input_wire_kind"] == "page_artifact"
    assert pipeline["output_wire_kind"] == "text_line_array"
    assert len(pipeline["graph"]["nodes"]) == 2

    invalid = await client.post(
        "/api/v1/pipelines",
        json={"name": "Bad graph", "graph": {"nodes": [], "edges": []}},
        headers=headers,
    )
    assert invalid.status_code == 422


INVOICE_TEMPLATE_GRAPH = {
    "nodes": [
        {
            "id": "layout-heron-1",
            "modelId": "docling/layout-heron",
            "position": {"x": 48, "y": 110},
        },
        {
            "id": "text-detection-2",
            "modelId": "surya/text-detection",
            "position": {"x": 348, "y": 110},
        },
        {
            "id": "text-recognition-3",
            "modelId": "surya/text-recognition",
            "position": {"x": 648, "y": 110},
        },
    ],
    "edges": [
        {"id": "e-1", "source": "layout-heron-1", "target": "text-detection-2"},
        {"id": "e-2", "source": "text-detection-2", "target": "text-recognition-3"},
    ],
}


@pytest.mark.asyncio(loop_scope="session")
async def test_create_pipeline_from_invoice_template_graph(client: AsyncClient):
    email = f"pipelines-invoice-template-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)
    headers = _auth_headers(token)

    create_response = await client.post(
        "/api/v1/pipelines",
        json={
            "name": "Invoice extraction",
            "description": "Parse vendor invoices.",
            "accent_color": "#5B2EEF",
            "graph": INVOICE_TEMPLATE_GRAPH,
        },
        headers=headers,
    )
    assert create_response.status_code == 201
    pipeline = create_response.json()
    assert pipeline["name"] == "Invoice extraction"
    assert pipeline["input_wire_kind"] == "page_artifact"
    assert pipeline["output_wire_kind"] == "text_line_array"

    other_email = f"pipelines-invoice-other-{uuid.uuid4()}@example.com"
    other_token = await _register_and_login(client, other_email)
    other_list = await client.get(
        "/api/v1/pipelines",
        headers=_auth_headers(other_token),
    )
    assert other_list.status_code == 200
    assert other_list.json()["items"] == []


def _chain(model_ids: list[str]) -> dict:
    nodes = [
        {
            "id": f"node-{index}",
            "modelId": model_id,
            "position": {"x": index * 300, "y": 0},
        }
        for index, model_id in enumerate(model_ids)
    ]
    edges = [
        {"id": f"e-{index}", "source": f"node-{index}", "target": f"node-{index + 1}"}
        for index in range(len(model_ids) - 1)
    ]
    return {"nodes": nodes, "edges": edges}


def test_catalog_template_graphs_are_valid():
    chains = [
        ["docling/layout-heron", "surya/text-detection", "surya/text-recognition"],
        ["surya/layout", "surya/text-detection", "surya/text-recognition"],
        ["docling/layout-heron", "docling/tableformer-accurate"],
        ["docling/ocr-auto", "surya/text-recognition"],
        ["surya/layout", "surya/reading-order"],
        ["surya/layout", "surya/latex-ocr"],
        [
            "surya/layout",
            "docling/picture-classifier-v2.5",
            "docling/picture-description-smolvlm",
        ],
    ]
    for models in chains:
        result = derive_pipeline_boundary_io(_chain(models))
        assert result.valid is True, f"{models}: {result.errors}"


@pytest.mark.asyncio(loop_scope="session")
async def test_pipeline_logo_upload(client: AsyncClient):
    email = f"pipeline-logo-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)
    headers = _auth_headers(token)

    create_response = await client.post(
        "/api/v1/pipelines",
        json={"name": "Logo pipeline"},
        headers=headers,
    )
    pipeline_id = create_response.json()["id"]

    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
        b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
        b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
        b"\x0d\n\x2d\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    upload_response = await client.post(
        f"/api/v1/pipelines/{pipeline_id}/logo",
        headers=headers,
        files={"file": ("logo.png", io.BytesIO(png_bytes), "image/png")},
    )
    assert upload_response.status_code == 204

    logo_response = await client.get(
        f"/api/v1/pipelines/{pipeline_id}/logo",
        headers=headers,
    )
    assert logo_response.status_code == 200
    assert logo_response.headers["content-type"] == "image/png"


@pytest.mark.asyncio(loop_scope="session")
async def test_pipeline_asset_upload_and_preview(client: AsyncClient):
    email = f"pipeline-asset-{uuid.uuid4()}@example.com"
    token = await _register_and_login(client, email)
    headers = _auth_headers(token)

    create_response = await client.post(
        "/api/v1/pipelines",
        json={"name": "Asset preview pipeline"},
        headers=headers,
    )
    pipeline_id = create_response.json()["id"]
    document = b"%PDF-1.4\n% OCRFlow pipeline test\n"

    upload_response = await client.post(
        f"/api/v1/pipelines/{pipeline_id}/assets",
        headers=headers,
        files={"file": ("invoice.pdf", io.BytesIO(document), "application/pdf")},
    )
    assert upload_response.status_code == 201
    asset_id = upload_response.json()["asset_id"]

    preview_response = await client.get(
        f"/api/v1/pipelines/{pipeline_id}/assets/{asset_id}",
        headers=headers,
    )
    assert preview_response.status_code == 200
    assert preview_response.content == document
    assert preview_response.headers["content-type"] == "application/pdf"


def test_derive_pipeline_boundary_io_valid():
    result = derive_pipeline_boundary_io(VALID_GRAPH)
    assert result.valid is True
    assert result.input_wire_kind == "page_artifact"
    assert result.output_wire_kind == "text_line_array"


def test_derive_pipeline_boundary_io_middle_layer():
    graph = {
        "nodes": [
            {
                "id": "layout-1",
                "modelId": "surya/layout",
                "position": {"x": 0, "y": 0},
            },
            {
                "id": "detect-1",
                "modelId": "surya/text-detection",
                "position": {"x": 200, "y": 0},
            },
            {
                "id": "recognize-1",
                "modelId": "surya/text-recognition",
                "position": {"x": 400, "y": 0},
            },
        ],
        "edges": [
            {"id": "e1", "source": "layout-1", "target": "detect-1"},
            {"id": "e2", "source": "detect-1", "target": "recognize-1"},
        ],
    }
    result = derive_pipeline_boundary_io(graph)
    assert result.valid is True
    assert result.input_wire_kind == "page_artifact"
    assert result.output_wire_kind == "text_line_array"


def test_derive_pipeline_boundary_io_accepts_atomic_model():
    graph = {
        "nodes": [
            {
                "id": "vision-1",
                "modelId": "ollama/vision-structured-extract",
                "position": {"x": 0, "y": 0},
            }
        ],
        "edges": [],
    }
    result = derive_pipeline_boundary_io(graph)
    assert result.valid is True
    assert result.input_wire_kind == "page_artifact"
    assert result.output_wire_kind == "json"
    assert result.input_type_label == "PageArtifact"
    assert result.output_type_label == "JSON"


def test_derive_pipeline_boundary_io_allows_mixed_exits():
    graph = {
        "nodes": [
            {
                "id": "layout-1",
                "modelId": "surya/layout",
                "position": {"x": 0, "y": 0},
            },
            {
                "id": "detect-1",
                "modelId": "surya/text-detection",
                "position": {"x": 200, "y": 0},
            },
            {
                "id": "recognize-1",
                "modelId": "surya/text-recognition",
                "position": {"x": 400, "y": 0},
            },
            {
                "id": "extract-1",
                "modelId": "ollama/structured-extract",
                "position": {"x": 600, "y": 0},
            },
            {
                "id": "table-1",
                "modelId": "surya/table-recognition",
                "position": {"x": 200, "y": 200},
            },
        ],
        "edges": [
            {"id": "e1", "source": "layout-1", "target": "detect-1"},
            {"id": "e2", "source": "detect-1", "target": "recognize-1"},
            {"id": "e3", "source": "recognize-1", "target": "extract-1"},
            {"id": "e4", "source": "layout-1", "target": "table-1"},
        ],
    }
    result = derive_pipeline_boundary_io(graph)
    assert result.valid is True
    assert result.input_wire_kind == "page_artifact"
    assert result.output_wire_kind == "json"
    assert result.output_type_label == "JSON + TableStructure[]"
    assert set(result.exit_node_ids) == {"extract-1", "table-1"}


def test_derive_pipeline_boundary_io_rejects_file_loader():
    graph = {
        "nodes": [
            {
                "id": "entry-1",
                "modelId": "loader/pdf",
                "position": {"x": 0, "y": 0},
            }
        ],
        "edges": [],
    }
    result = derive_pipeline_boundary_io(graph)
    assert result.valid is False
    assert "contains_file_loader" in result.errors
