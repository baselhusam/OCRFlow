"""Runtime availability of the model-serving backends.

The static catalog status (``ModelStatus.done`` etc.) says what the platform
*supports* at build time. This module answers a different, runtime question:
which provider backends are actually reachable right now?

* In ``remote`` mode the gateway probes each provider service's health endpoint
  and reports what responds. OCR providers are optional microservices — if the
  user has not started them, they show as offline.
* In ``local`` mode models run in-process. Availability is based on whether the
  provider's Python package is importable (so missing extras are not reported
  as running). Prefer ``remote`` mode for the microservice / enterprise layout.

The frontend uses this to gate canvas nodes: offline providers are hidden from
the default palette (with an optional reveal) and disabled if shown.
"""

from __future__ import annotations

import asyncio
import importlib.util

import httpx
from pydantic import BaseModel

from app.core.config import RunnerMode, Settings
from app.models.servable import REMOTE_PROVIDERS

#: Importable top-level modules that indicate a provider stack is installed
#: for in-process (``local``) mode. Mirrors the optional requirements-*.txt
#: extras. ``paddleocr`` is the public package name; ``paddle`` alone is not
#: enough to run the OCR runners.
_LOCAL_PROVIDER_MODULES: dict[str, tuple[str, ...]] = {
    "docling": ("docling",),
    "surya": ("surya",),
    "paddle": ("paddleocr",),
}

_HEALTH_PATH = "/internal/health"
_RUNTIME_PROVIDERS = frozenset((*REMOTE_PROVIDERS, "ollama"))


class ProviderRuntime(BaseModel):
    provider: str
    running: bool
    mode: str
    detail: str | None = None


class RuntimeAvailability(BaseModel):
    mode: str
    providers: list[ProviderRuntime]


def _local_provider_runtime(provider: str) -> ProviderRuntime:
    modules = _LOCAL_PROVIDER_MODULES.get(provider, ())
    missing = [name for name in modules if importlib.util.find_spec(name) is None]
    if missing:
        return ProviderRuntime(
            provider=provider,
            running=False,
            mode=RunnerMode.local.value,
            detail=f"missing package(s): {', '.join(missing)}",
        )
    return ProviderRuntime(
        provider=provider,
        running=True,
        mode=RunnerMode.local.value,
        detail="in-process",
    )


async def _probe_provider(
    provider: str, settings: Settings, client: httpx.AsyncClient
) -> ProviderRuntime:
    base_url = settings.provider_service_url(provider)
    if not base_url:
        return ProviderRuntime(
            provider=provider,
            running=False,
            mode=RunnerMode.remote.value,
            detail="no service url configured",
        )
    health_path = "/api/tags" if provider == "ollama" else _HEALTH_PATH
    url = f"{base_url.rstrip('/')}{health_path}"
    try:
        response = await client.get(url)
    except httpx.HTTPError as exc:
        return ProviderRuntime(
            provider=provider,
            running=False,
            mode=RunnerMode.remote.value,
            detail=f"unreachable: {exc.__class__.__name__}",
        )
    running = response.is_success
    return ProviderRuntime(
        provider=provider,
        running=running,
        mode=RunnerMode.remote.value,
        detail=None if running else f"status {response.status_code}",
    )


async def get_runtime_availability(settings: Settings) -> RuntimeAvailability:
    providers = sorted(_RUNTIME_PROVIDERS)

    if settings.runner_mode != RunnerMode.remote:
        timeout = settings.runtime_health_timeout_seconds
        async with httpx.AsyncClient(timeout=timeout) as client:
            ollama = await _probe_provider("ollama", settings, client)
        return RuntimeAvailability(
            mode=RunnerMode.local.value,
            providers=[
                *[
                    _local_provider_runtime(provider)
                    for provider in sorted(REMOTE_PROVIDERS)
                ],
                ollama.model_copy(update={"mode": RunnerMode.local.value}),
            ],
        )

    timeout = settings.runtime_health_timeout_seconds
    async with httpx.AsyncClient(timeout=timeout) as client:
        results = await asyncio.gather(
            *(_probe_provider(provider, settings, client) for provider in providers)
        )
    return RuntimeAvailability(mode=RunnerMode.remote.value, providers=list(results))
