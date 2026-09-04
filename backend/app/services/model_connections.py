"""Connection validation, secure storage, and request routing for LLM/VLM APIs."""

from __future__ import annotations

import base64
import hashlib
from datetime import datetime, timezone
from typing import Any

import httpx
from cryptography.fernet import Fernet
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.engine_url import EngineUrlSafetyError, assert_safe_engine_url
from app.db.models.model_connection import ModelConnection
from app.schemas.model_connection import (
    ModelConnection as ModelConnectionSchema,
    ModelConnectionCreate,
    ModelConnectionUpdate,
    ModelConnectionValidation,
    ModelConnectionValidationRequest,
)

_TIMEOUT = 8.0


def _cipher() -> Fernet:
    key = base64.urlsafe_b64encode(hashlib.sha256(get_settings().secret_key.encode()).digest())
    return Fernet(key)


def _encrypt(value: str | None) -> str | None:
    return _cipher().encrypt(value.encode()).decode() if value else None


def _decrypt(value: str | None) -> str | None:
    return _cipher().decrypt(value.encode()).decode() if value else None


def _headers(api_key: str | None, protocol: str) -> dict[str, str]:
    if not api_key:
        return {"Content-Type": "application/json"}
    headers = {"Content-Type": "application/json", "x-api-key": api_key} if protocol.startswith("anthropic") else {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
    if protocol.startswith("anthropic"):
        headers["anthropic-version"] = "2023-06-01"
    return headers


def _as_schema(connection: ModelConnection) -> ModelConnectionSchema:
    return ModelConnectionSchema(
        id=connection.id, name=connection.name, protocol=connection.protocol,
        base_url=connection.base_url, has_api_key=bool(connection.encrypted_api_key),
        text_model=connection.text_model, vision_model=connection.vision_model, enabled=connection.enabled,
        last_validation=ModelConnectionValidation.model_validate(connection.last_validation) if connection.last_validation else None,
        last_checked_at=connection.last_checked_at, created_at=connection.created_at, updated_at=connection.updated_at,
    )


def _models_url(base_url: str, protocol: str) -> str:
    return f"{base_url}/v1/models" if protocol.startswith("anthropic") else f"{base_url}/models"


async def validate_connection(payload: ModelConnectionValidationRequest) -> ModelConnectionValidation:
    try:
        base_url = await assert_safe_engine_url(payload.base_url)
    except EngineUrlSafetyError as exc:
        return ModelConnectionValidation(status="blocked", detail=str(exc))
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=False, trust_env=False) as client:
            response = await client.get(_models_url(base_url, payload.protocol), headers=_headers(payload.api_key, payload.protocol))
    except httpx.HTTPError as exc:
        return ModelConnectionValidation(status="unreachable", detail=f"Could not reach the provider: {exc.__class__.__name__}.")
    if response.status_code in {401, 403}:
        return ModelConnectionValidation(status="authentication_required", detail="The provider rejected the API key or requires credentials.", authentication_required=True)
    if not response.is_success:
        return ModelConnectionValidation(status="incompatible", detail=f"The endpoint did not expose a compatible models API (HTTP {response.status_code}).")
    try:
        body = response.json()
    except ValueError:
        body = {}
    items = body.get("data", []) if isinstance(body, dict) else []
    models = [str(item.get("id")) for item in items if isinstance(item, dict) and item.get("id")][:50]
    return ModelConnectionValidation(status="ready", detail=(f"Connected. Discovered {len(models)} model(s)." if models else "Connected to a compatible provider. Configure model names on the connection."), discovered_models=models)


async def list_connections(db: AsyncSession) -> list[ModelConnectionSchema]:
    result = await db.execute(select(ModelConnection).order_by(ModelConnection.created_at.desc()))
    return [_as_schema(item) for item in result.scalars()]


async def get_connection_runtime_statuses(db: AsyncSession) -> list[dict[str, object]]:
    """Safe, compact connection availability for the project palette.

    This intentionally exposes no endpoint, model name, or credential data.
    """
    try:
        result = await db.execute(select(ModelConnection))
        connections = list(result.scalars())
    except SQLAlchemyError:
        # Keep the palette usable while a rolling deployment is waiting for
        # its database migration; the two icons safely remain disconnected.
        connections = []
    statuses: list[dict[str, object]] = []
    for provider in ("openai", "anthropic", "openai-compatible", "anthropic-compatible"):
        matching = [
            item for item in connections
            if item.protocol == provider
        ]
        ready = [
            item for item in matching
            if item.enabled and (item.last_validation or {}).get("status") == "ready"
        ]
        statuses.append({
            "provider": provider,
            "running": bool(ready),
            "mode": "configured",
            "detail": f"{len(ready)} validated connection{'s' if len(ready) != 1 else ''}" if ready else "No validated connection configured",
            "models": [],
        })
    return statuses


async def create_connection(db: AsyncSession, payload: ModelConnectionCreate) -> ModelConnectionSchema:
    base_url = await assert_safe_engine_url(payload.base_url)
    validation = await validate_connection(ModelConnectionValidationRequest.model_validate(payload.model_dump()))
    connection = ModelConnection(name=payload.name, protocol=payload.protocol, base_url=base_url,
        encrypted_api_key=_encrypt(payload.api_key), text_model=payload.text_model, vision_model=payload.vision_model,
        enabled=payload.enabled, last_validation=validation.model_dump(mode="json"), last_checked_at=datetime.now(timezone.utc))
    db.add(connection)
    await db.commit(); await db.refresh(connection)
    return _as_schema(connection)


async def revalidate_connection(db: AsyncSession, connection_id: str) -> ModelConnectionSchema:
    connection = await db.get(ModelConnection, connection_id)
    if connection is None: raise LookupError("Model connection not found")
    validation = await validate_connection(ModelConnectionValidationRequest(name=connection.name, protocol=connection.protocol, base_url=connection.base_url, api_key=_decrypt(connection.encrypted_api_key), text_model=connection.text_model, vision_model=connection.vision_model, enabled=connection.enabled))
    connection.last_validation = validation.model_dump(mode="json"); connection.last_checked_at = datetime.now(timezone.utc)
    await db.commit(); await db.refresh(connection)
    return _as_schema(connection)


async def update_connection(db: AsyncSession, connection_id: str, payload: ModelConnectionUpdate) -> ModelConnectionSchema:
    connection = await db.get(ModelConnection, connection_id)
    if connection is None: raise LookupError("Model connection not found")
    for key, value in payload.model_dump(exclude_unset=True).items(): setattr(connection, key, value)
    await db.commit(); await db.refresh(connection)
    return _as_schema(connection)


async def delete_connection(db: AsyncSession, connection_id: str) -> None:
    connection = await db.get(ModelConnection, connection_id)
    if connection is None: raise LookupError("Model connection not found")
    await db.delete(connection); await db.commit()


async def resolve_connection(connection_id: str) -> tuple[ModelConnection, str] | None:
    from app.db.session import async_session_factory
    try:
        async with async_session_factory() as db:
            connection = await db.get(ModelConnection, connection_id)
            if connection is None:
                # A readable connection name makes the canvas setup practical;
                # UUIDs remain supported for unambiguous automation.
                result = await db.execute(
                    select(ModelConnection)
                    .where(ModelConnection.name == connection_id)
                    .order_by(ModelConnection.created_at.desc())
                )
                connection = result.scalars().first()
            if connection is None or not connection.enabled or (connection.last_validation or {}).get("status") != "ready": return None
            base_url = await assert_safe_engine_url(connection.base_url)
            return connection, base_url
    except Exception:
        return None


def connection_headers(connection: ModelConnection) -> dict[str, str]:
    return _headers(_decrypt(connection.encrypted_api_key), connection.protocol)
