"""Runtime availability of the model-serving backends.

The static catalog status (``ModelStatus.done`` etc.) says what the platform
*supports* at build time. This module answers a different, runtime question:
which provider backends are actually reachable right now?

* In ``local`` mode everything runs in-process, so every remote provider is
  reported as running.
* In ``remote`` mode the gateway probes each provider service's health endpoint
  and reports what responds.

The frontend uses this to gate canvas nodes: offline providers are shown but
disabled with a "start the service" hint.
"""

from __future__ import annotations

import asyncio

import httpx
from pydantic import BaseModel

from app.core.config import RunnerMode, Settings
from app.models.servable import REMOTE_PROVIDERS


class ProviderRuntime(BaseModel):
    provider: str
    running: bool
    mode: str
    detail: str | None = None


class RuntimeAvailability(BaseModel):
    mode: str
    providers: list[ProviderRuntime]


_HEALTH_PATH = "/internal/health"


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
    url = f"{base_url.rstrip('/')}{_HEALTH_PATH}"
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
    providers = sorted(REMOTE_PROVIDERS)

    if settings.runner_mode != RunnerMode.remote:
        return RuntimeAvailability(
            mode=RunnerMode.local.value,
            providers=[
                ProviderRuntime(
                    provider=provider,
                    running=True,
                    mode=RunnerMode.local.value,
                    detail="in-process",
                )
                for provider in providers
            ],
        )

    timeout = settings.runtime_health_timeout_seconds
    async with httpx.AsyncClient(timeout=timeout) as client:
        results = await asyncio.gather(
            *(_probe_provider(provider, settings, client) for provider in providers)
        )
    return RuntimeAvailability(mode=RunnerMode.remote.value, providers=list(results))
