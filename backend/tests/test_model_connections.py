"""Connection probes for OpenAI- and Anthropic-compatible providers."""
import httpx
from types import SimpleNamespace
from app.schemas.model_connection import ModelConnectionValidationRequest
from app.services import model_connections


def _client(handler):
    real_client = httpx.AsyncClient
    def factory(*_args, **_kwargs): return real_client(transport=httpx.MockTransport(handler))
    return factory


async def _allow(value: str) -> str: return value.rstrip("/")


async def test_openai_compatible_connection_discovers_models(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/models"
        assert request.headers["authorization"] == "Bearer secret"
        return httpx.Response(200, json={"data":[{"id":"qwen2.5-vl"},{"id":"llama-3"}]})
    monkeypatch.setattr(model_connections.httpx, "AsyncClient", _client(handler))
    monkeypatch.setattr(model_connections, "assert_safe_engine_url", _allow)
    result = await model_connections.validate_connection(ModelConnectionValidationRequest(name="On prem", protocol="openai-compatible", base_url="https://models.internal/v1", api_key="secret"))
    assert result.status == "ready"
    assert result.discovered_models == ["qwen2.5-vl", "llama-3"]


async def test_anthropic_connection_reports_missing_credentials(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/models"
        return httpx.Response(401, json={"error":{"message":"key required"}})
    monkeypatch.setattr(model_connections.httpx, "AsyncClient", _client(handler))
    monkeypatch.setattr(model_connections, "assert_safe_engine_url", _allow)
    result = await model_connections.validate_connection(ModelConnectionValidationRequest(name="Claude", protocol="anthropic", base_url="https://api.anthropic.com", api_key=""))
    assert result.status == "authentication_required"


async def test_runtime_statuses_include_unconfigured_language_providers():
    class Result:
        def scalars(self): return []
    class Session:
        async def execute(self, _query): return Result()
    statuses = await model_connections.get_connection_runtime_statuses(Session())
    assert {item["provider"]: item["running"] for item in statuses} == {
        "openai": False, "anthropic": False,
        "openai-compatible": False, "anthropic-compatible": False,
    }


async def test_runtime_statuses_marks_validated_compatible_connection_online():
    connection = SimpleNamespace(
        protocol="openai-compatible", enabled=True,
        last_validation={"status": "ready"},
    )
    class Result:
        def scalars(self): return [connection]
    class Session:
        async def execute(self, _query): return Result()
    statuses = await model_connections.get_connection_runtime_statuses(Session())
    assert next(item for item in statuses if item["provider"] == "openai-compatible")["running"] is True
