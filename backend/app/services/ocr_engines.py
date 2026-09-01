"""Discovery, protocol validation, and persistence for remote OCR engines.

The platform intentionally validates the OCRFlow provider-service protocol,
not merely whether a TCP port answers. This prevents a random web server (or a
different model API) from being exposed as a usable canvas node.
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import httpx
from cryptography.fernet import Fernet
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.models.ocr_engine import OcrEngine
from app.db.session import async_session_factory
from app.models.servable import models_for_provider
from app.schemas.ocr_engine import (
    EngineConnection,
    EngineConnectionCreate,
    EngineConnectionUpdate,
    EngineModelCheck,
    EngineValidation,
    EngineValidationRequest,
)

EXPECTED_API_VERSION = "1"
_PROBE_TIMEOUT_SECONDS = 5.0


@dataclass(frozen=True)
class EngineTarget:
    base_url: str
    headers: dict[str, str]


def _cipher() -> Fernet:
    # A deterministic key is scoped to this deployment's existing secret. It
    # keeps configured credentials out of API responses and database dumps.
    secret = get_settings().secret_key.encode("utf-8")
    key = base64.urlsafe_b64encode(hashlib.sha256(secret).digest())
    return Fernet(key)


def _encrypt(secret: str | None) -> str | None:
    return _cipher().encrypt(secret.encode("utf-8")).decode("utf-8") if secret else None


def _decrypt(secret: str | None) -> str | None:
    return _cipher().decrypt(secret.encode("utf-8")).decode("utf-8") if secret else None


def _headers(auth_type: str, api_key: str | None) -> dict[str, str]:
    if not api_key:
        return {}
    if auth_type == "bearer":
        return {"Authorization": f"Bearer {api_key}"}
    if auth_type == "x-api-key":
        return {"X-API-Key": api_key}
    return {}


def _connection_schema(engine: OcrEngine) -> EngineConnection:
    return EngineConnection(
        id=engine.id,
        name=engine.name,
        provider=engine.provider,
        base_url=engine.base_url,
        auth_type=engine.auth_type,
        has_api_key=bool(engine.encrypted_api_key),
        enabled=engine.enabled,
        last_validation=(
            EngineValidation.model_validate(engine.last_validation)
            if engine.last_validation
            else None
        ),
        last_checked_at=engine.last_checked_at,
        created_at=engine.created_at,
        updated_at=engine.updated_at,
    )


async def _get_json(
    client: httpx.AsyncClient, url: str, headers: dict[str, str]
) -> tuple[int, dict[str, Any] | None]:
    response = await client.get(url, headers=headers)
    try:
        body = response.json()
    except ValueError:
        body = None
    return response.status_code, body if isinstance(body, dict) else None


async def validate_engine(payload: EngineValidationRequest) -> EngineValidation:
    """Validate liveness, auth, protocol version, and every provider model."""

    base_url = payload.base_url.rstrip("/")
    unauth_headers: dict[str, str] = {}
    configured_headers = _headers(payload.auth_type, payload.api_key)

    try:
        async with httpx.AsyncClient(
            timeout=_PROBE_TIMEOUT_SECONDS, follow_redirects=False
        ) as client:
            health_status, health = await _get_json(
                client, f"{base_url}/internal/health", unauth_headers
            )
            if health_status in {401, 403}:
                if not configured_headers:
                    return EngineValidation(
                        status="authentication_required",
                        detail="The engine is reachable but requires an API key.",
                        authentication_required=True,
                    )
                health_status, health = await _get_json(
                    client, f"{base_url}/internal/health", configured_headers
                )
                if health_status in {401, 403}:
                    return EngineValidation(
                        status="authentication_required",
                        detail="The engine rejected the configured API key.",
                        authentication_required=True,
                    )
            elif health_status >= 400:
                detail = "The endpoint does not expose OCRFlow's engine health API."
                if health_status == 404:
                    return EngineValidation(status="incompatible", detail=detail)
                return EngineValidation(
                    status="unreachable", detail=f"Engine health check returned HTTP {health_status}."
                )

            if not health or health.get("status") != "ok":
                return EngineValidation(
                    status="incompatible",
                    detail="The endpoint responded, but not with an OCRFlow engine health payload.",
                )

            reported_provider = health.get("provider")
            if reported_provider != payload.provider:
                return EngineValidation(
                    status="incompatible",
                    detail=(
                        f"This is a {reported_provider or 'unknown'} engine, not the expected "
                        f"{payload.provider} engine."
                    ),
                    provider=reported_provider,
                    api_version=str(health.get("api_version")) if health.get("api_version") else None,
                    engine_version=str(health.get("engine_version")) if health.get("engine_version") else None,
                )

            api_version = str(health.get("api_version")) if health.get("api_version") else None
            engine_version = (
                str(health.get("engine_version")) if health.get("engine_version") else None
            )
            if api_version != EXPECTED_API_VERSION:
                return EngineValidation(
                    status="incompatible",
                    detail=(
                        f"The engine runs protocol v{api_version or 'unknown'}; "
                        f"OCRFlow requires protocol v{EXPECTED_API_VERSION}."
                    ),
                    provider=reported_provider,
                    api_version=api_version,
                    engine_version=engine_version,
                )

            capability_status, capabilities = await _get_json(
                client, f"{base_url}/internal/capabilities", configured_headers
            )
            if capability_status != 200 or not capabilities:
                return EngineValidation(
                    status="incompatible",
                    detail="The engine is protocol v1 but does not expose its capability API.",
                    provider=reported_provider,
                    api_version=api_version,
                    engine_version=engine_version,
                )
            advertised_models = set(capabilities.get("models", []))
            required_models = [model.model_id for model in models_for_provider(payload.provider)]

            async def check_model(model_id: str) -> EngineModelCheck:
                if model_id not in advertised_models:
                    return EngineModelCheck(
                        model_id=model_id, available=False, message="not advertised by engine"
                    )
                status, body = await _get_json(
                    client,
                    f"{base_url}/internal/models/{model_id}/health",
                    configured_headers,
                )
                if status != 200:
                    return EngineModelCheck(
                        model_id=model_id, available=False, message=f"health check returned HTTP {status}"
                    )
                if not body or body.get("model_id") != model_id:
                    return EngineModelCheck(
                        model_id=model_id,
                        available=False,
                        message="returned an invalid model health payload",
                    )
                return EngineModelCheck(model_id=model_id, available=True)

            checks = await asyncio.gather(*(check_model(model_id) for model_id in required_models))
    except httpx.HTTPError as exc:
        return EngineValidation(
            status="unreachable",
            detail=f"Could not reach the engine: {exc.__class__.__name__}.",
        )

    available_count = sum(check.available for check in checks)
    if not available_count:
        status = "incompatible"
        detail = "The engine does not expose any of the required OCRFlow model APIs."
    elif available_count < len(checks):
        status = "partial"
        detail = (
            f"{available_count} of {len(checks)} required model APIs passed. "
            "Unavailable capabilities will stay disabled in the canvas."
        )
    else:
        status = "ready"
        detail = f"All {available_count} supported {payload.provider} model APIs are available."
    return EngineValidation(
        status=status,
        detail=detail,
        provider=reported_provider,
        api_version=api_version,
        engine_version=engine_version,
        model_checks=list(checks),
    )


async def list_engines(db: AsyncSession) -> list[EngineConnection]:
    result = await db.execute(select(OcrEngine).order_by(OcrEngine.created_at.desc()))
    return [_connection_schema(engine) for engine in result.scalars()]


async def create_engine(
    db: AsyncSession, payload: EngineConnectionCreate
) -> EngineConnection:
    validation = await validate_engine(EngineValidationRequest.model_validate(payload.model_dump()))
    engine = OcrEngine(
        name=payload.name,
        provider=payload.provider,
        base_url=payload.base_url,
        auth_type=payload.auth_type,
        encrypted_api_key=_encrypt(payload.api_key),
        enabled=payload.enabled,
        last_validation=validation.model_dump(mode="json"),
        last_checked_at=datetime.now(timezone.utc),
    )
    db.add(engine)
    await db.commit()
    await db.refresh(engine)
    return _connection_schema(engine)


async def revalidate_engine(db: AsyncSession, engine_id: str) -> EngineConnection:
    engine = await db.get(OcrEngine, engine_id)
    if engine is None:
        raise LookupError("OCR engine not found")
    validation = await validate_engine(
        EngineValidationRequest(
            provider=engine.provider,
            base_url=engine.base_url,
            auth_type=engine.auth_type,
            api_key=_decrypt(engine.encrypted_api_key),
        )
    )
    engine.last_validation = validation.model_dump(mode="json")
    engine.last_checked_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(engine)
    return _connection_schema(engine)


async def update_engine(
    db: AsyncSession, engine_id: str, payload: EngineConnectionUpdate
) -> EngineConnection:
    engine = await db.get(OcrEngine, engine_id)
    if engine is None:
        raise LookupError("OCR engine not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(engine, key, value)
    await db.commit()
    await db.refresh(engine)
    return _connection_schema(engine)


async def delete_engine(db: AsyncSession, engine_id: str) -> None:
    engine = await db.get(OcrEngine, engine_id)
    if engine is None:
        raise LookupError("OCR engine not found")
    await db.delete(engine)
    await db.commit()


async def resolve_engine_target(provider: str, model_id: str) -> EngineTarget | None:
    """Return the newest enabled, validated external service for a model.

    Remote runners call this immediately before forwarding work. If no stored
    engine covers the model, callers retain their environment-configured
    provider URL as the safe backwards-compatible fallback.
    """
    try:
        async with async_session_factory() as db:
            result = await db.execute(
                select(OcrEngine)
                .where(OcrEngine.provider == provider, OcrEngine.enabled.is_(True))
                .order_by(OcrEngine.last_checked_at.desc().nullslast())
            )
            for engine in result.scalars():
                validation = engine.last_validation or {}
                if validation.get("status") not in {"ready", "partial"}:
                    continue
                model_checks = validation.get("model_checks", [])
                if not any(
                    check.get("model_id") == model_id and check.get("available")
                    for check in model_checks
                    if isinstance(check, dict)
                ):
                    continue
                return EngineTarget(
                    base_url=engine.base_url.rstrip("/"),
                    headers=_headers(engine.auth_type, _decrypt(engine.encrypted_api_key)),
                )
    except Exception:
        # Engine routing must not turn a temporarily unavailable configuration
        # database into an outage for an already configured service URL.
        return None
    return None


async def get_live_engine_capabilities() -> dict[str, tuple[str, EngineValidation]]:
    """Current capability snapshots for enabled external engines, by provider.

    The runtime endpoint uses these live probes to drive canvas availability.
    A connection is only eligible when it has at least one model that passed;
    failed connections remain visible in Configuration, but never make a node
    look usable.
    """
    try:
        async with async_session_factory() as db:
            result = await db.execute(
                select(OcrEngine)
                .where(OcrEngine.enabled.is_(True))
                .order_by(OcrEngine.last_checked_at.desc().nullslast())
            )
            engines = list(result.scalars())
        validations = await asyncio.gather(
            *(
                validate_engine(
                    EngineValidationRequest(
                        provider=engine.provider,
                        base_url=engine.base_url,
                        auth_type=engine.auth_type,
                        api_key=_decrypt(engine.encrypted_api_key),
                    )
                )
                for engine in engines
            ),
            return_exceptions=True,
        )
    except Exception:
        return {}

    capabilities: dict[str, tuple[str, EngineValidation]] = {}
    for engine, validation in zip(engines, validations, strict=True):
        if not isinstance(validation, EngineValidation):
            continue
        if validation.status not in {"ready", "partial"}:
            continue
        # Newer connections win for a provider, matching runtime routing.
        capabilities.setdefault(engine.provider, (engine.name, validation))
    return capabilities
