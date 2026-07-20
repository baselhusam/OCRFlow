"""Internal provider service app: forwards to local runners, maps errors."""

from __future__ import annotations

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

import app.internal_service.app as internal_app
from app.models.errors import ModelLoadError
from app.schemas.artifacts import LayoutLabel, Region
from app.schemas.models.paddle._meta import InferenceMeta
from app.schemas.models.paddle.doclayout import DocLayoutInput, DocLayoutOutput


class _FakeRunner:
    async def run(self, payload: DocLayoutInput) -> DocLayoutOutput:
        assert isinstance(payload, DocLayoutInput)
        return DocLayoutOutput(
            page_index=payload.page.page_index,
            regions=[
                Region(
                    id="r1",
                    label=LayoutLabel.paragraph,
                    bbox=[0.1, 0.2, 0.9, 0.8],
                    confidence=0.9,
                )
            ],
            meta=InferenceMeta(model_id="paddle/doclayout-s", latency_ms=1.0),
        )


def _app():
    return internal_app.create_internal_app()


async def _post(app, path, json):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://svc") as client:
        return await client.post(path, json=json)


async def test_infer_forwards_to_local_runner(monkeypatch, sample_page_image):
    async def fake_get_cached_runner(model_id, config):
        assert model_id == "paddle/doclayout-s"
        return _FakeRunner()

    monkeypatch.setattr(internal_app, "get_cached_runner", fake_get_cached_runner)

    payload = DocLayoutInput(page=sample_page_image).model_dump(mode="json")
    response = await _post(_app(), "/internal/models/paddle/doclayout-s", payload)

    assert response.status_code == 200
    body = response.json()
    assert body["page_index"] == 0
    assert body["regions"][0]["id"] == "r1"


async def test_infer_unknown_model_returns_404(sample_page_image):
    payload = DocLayoutInput(page=sample_page_image).model_dump(mode="json")
    response = await _post(_app(), "/internal/models/nope/not-real", payload)
    assert response.status_code == 404
    assert response.json()["error_code"] == "model_not_found"


async def test_load_error_maps_to_503(monkeypatch, sample_page_image):
    async def fake_get_cached_runner(model_id, config):
        raise ModelLoadError("deps missing")

    monkeypatch.setattr(internal_app, "get_cached_runner", fake_get_cached_runner)

    payload = DocLayoutInput(page=sample_page_image).model_dump(mode="json")
    response = await _post(_app(), "/internal/models/paddle/doclayout-s", payload)
    assert response.status_code == 503
    assert response.json()["error_code"] == "model_load"


async def test_internal_health_ok():
    transport = ASGITransport(app=_app())
    async with AsyncClient(transport=transport, base_url="http://svc") as client:
        response = await client.get("/internal/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
