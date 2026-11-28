"""Connection validation, secure storage, and request routing for LLM/VLM APIs."""

from __future__ import annotations

import base64
import hashlib
import re
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
    OcrCatalog,
    OcrCatalogConnection,
    OcrModel,
    ModelConnection as ModelConnectionSchema,
    ModelConnectionCreate,
    ModelConnectionUpdate,
    ModelConnectionValidation,
    ModelConnectionValidationRequest,
)

_TIMEOUT = 8.0
_OPENROUTER_TIMEOUT = 15.0
#: Every protocol the palette reports, in display order.
CONNECTED_PROTOCOLS = ("openai", "anthropic", "openai-compatible", "anthropic-compatible", "openrouter")
_DOCUMENT_HINT = re.compile(
    r"\b(ocr|documents?|handwrit\w*|scann?ed|scans?|pdfs?|receipts?|invoices?|text extraction|charts?)\b",
    re.IGNORECASE,
)


def _cipher() -> Fernet:
    key = base64.urlsafe_b64encode(hashlib.sha256(get_settings().secret_key.encode()).digest())
    return Fernet(key)


def _encrypt(value: str | None) -> str | None:
    return _cipher().encrypt(value.encode()).decode() if value else None


def _decrypt(value: str | None) -> str | None:
    return _cipher().decrypt(value.encode()).decode() if value else None


def _headers(api_key: str | None, protocol: str) -> dict[str, str]:
    if protocol == "openrouter":
        # OpenRouter attributes traffic to an app through the X-Title header.
        headers = {"Content-Type": "application/json", "X-Title": "OCRFlow"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        return headers
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
        enabled_models=enabled_model_ids(connection),
        last_checked_at=connection.last_checked_at, created_at=connection.created_at, updated_at=connection.updated_at,
    )


def _models_url(base_url: str, protocol: str) -> str:
    return f"{base_url}/v1/models" if protocol.startswith("anthropic") else f"{base_url}/models"


def _per_million(value: Any) -> float | None:
    try:
        price = float(value)
    except (TypeError, ValueError):
        return None
    # Routers report -1 ("varies"); keep only real prices.
    return round(price * 1_000_000, 4) if price >= 0 else None


def ocr_models_from_catalog(items: Any) -> list[OcrModel]:
    """Keep the models that read images and answer in text, best OCR fits first.

    OpenRouter has no OCR category: any model whose architecture takes an image
    and returns only text can transcribe a page. Routers (``openrouter/*``) and
    batch-only variants are skipped because they cannot back a canvas node.
    """
    models: list[OcrModel] = []
    seen: set[str] = set()
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict) or not isinstance(item.get("id"), str):
            continue
        model_id = item["id"]
        architecture = item.get("architecture") if isinstance(item.get("architecture"), dict) else {}
        inputs = architecture.get("input_modalities") or []
        outputs = architecture.get("output_modalities") or []
        if "image" not in inputs or list(outputs) != ["text"]:
            continue
        if model_id.startswith(("openrouter/", "~")) or model_id.endswith(":batch") or model_id in seen:
            continue
        seen.add(model_id)
        pricing = item.get("pricing") if isinstance(item.get("pricing"), dict) else {}
        prompt_price = _per_million(pricing.get("prompt"))
        completion_price = _per_million(pricing.get("completion"))
        description = item.get("description") if isinstance(item.get("description"), str) else None
        name = item.get("name") if isinstance(item.get("name"), str) and item.get("name") else model_id
        parameters = item.get("supported_parameters") or []
        context = item.get("context_length")
        models.append(OcrModel(
            id=model_id,
            name=name,
            description=(description[:400] if description else None),
            context_length=context if isinstance(context, int) else None,
            prompt_price=prompt_price,
            completion_price=completion_price,
            structured_outputs="structured_outputs" in parameters or "response_format" in parameters,
            free=model_id.endswith(":free") or (prompt_price == 0 and completion_price == 0),
            document_focused=bool(_DOCUMENT_HINT.search(f"{name} {description or ''}")),
        ))
    models.sort(key=lambda model: (not model.document_focused, model.name.lower()))
    return models


#: How many models to enable when none are described for documents.
_DEFAULT_ENABLED_FALLBACK = 8


def recommended_model_ids(models: list[OcrModel]) -> list[str]:
    """The starting canvas set: models the provider describes for documents."""
    focused = [model.id for model in models if model.document_focused]
    return focused or [model.id for model in models[:_DEFAULT_ENABLED_FALLBACK]]


def _discovered(connection: ModelConnection) -> list[OcrModel]:
    validation = connection.last_validation or {}
    return [OcrModel.model_validate(item) for item in validation.get("ocr_models") or [] if isinstance(item, dict)]


def enabled_model_ids(connection: ModelConnection) -> list[str]:
    """Enabled ids that are still listed; NULL resolves to the recommended set."""
    models = _discovered(connection)
    if not models:
        return []
    chosen = connection.enabled_models
    if chosen is None:
        return recommended_model_ids(models)
    allowed = set(chosen)
    return [model.id for model in models if model.id in allowed]


async def get_connection(db: AsyncSession, connection_id: str) -> ModelConnectionSchema:
    connection = await db.get(ModelConnection, connection_id)
    if connection is None: raise LookupError("Model connection not found")
    return _as_schema(connection)


async def _validate_openrouter(base_url: str, api_key: str | None) -> ModelConnectionValidation:
    if not api_key:
        return ModelConnectionValidation(
            status="authentication_required",
            detail="Paste an OpenRouter API key (sk-or-...) to verify the connection.",
            authentication_required=True,
        )
    headers = _headers(api_key, "openrouter")
    try:
        async with httpx.AsyncClient(timeout=_OPENROUTER_TIMEOUT, follow_redirects=False, trust_env=False) as client:
            # /models is public, so only /key proves the credential is real.
            key_response = await client.get(f"{base_url}/key", headers=headers)
            if key_response.status_code in {401, 403}:
                return ModelConnectionValidation(
                    status="authentication_required",
                    detail="OpenRouter rejected the API key.",
                    authentication_required=True,
                )
            if not key_response.is_success:
                return ModelConnectionValidation(
                    status="incompatible",
                    detail=f"OpenRouter key check failed (HTTP {key_response.status_code}).",
                )
            models_response = await client.get(f"{base_url}/models", headers=headers)
    except httpx.HTTPError as exc:
        return ModelConnectionValidation(status="unreachable", detail=f"Could not reach OpenRouter: {exc.__class__.__name__}.")
    if not models_response.is_success:
        return ModelConnectionValidation(
            status="incompatible",
            detail=f"OpenRouter did not return its model list (HTTP {models_response.status_code}).",
        )
    try:
        body = models_response.json()
    except ValueError:
        body = {}
    models = ocr_models_from_catalog(body.get("data") if isinstance(body, dict) else None)
    if not models:
        return ModelConnectionValidation(status="incompatible", detail="API key verified, but OpenRouter listed no image-capable models.")
    try:
        key_info = key_response.json().get("data") or {}
    except (ValueError, AttributeError):
        key_info = {}
    label = key_info.get("label") if isinstance(key_info, dict) else None
    focused = sum(1 for model in models if model.document_focused)
    detail = "API key verified"
    if isinstance(label, str) and label:
        detail += f" ({label})"
    detail += f". Found {len(models)} OCR-capable models"
    detail += f", {focused} described for documents." if focused else "."
    return ModelConnectionValidation(
        status="ready",
        detail=detail,
        discovered_models=[model.id for model in models[:50]],
        ocr_models=models,
    )


async def validate_connection(payload: ModelConnectionValidationRequest) -> ModelConnectionValidation:
    try:
        base_url = await assert_safe_engine_url(payload.base_url)
    except EngineUrlSafetyError as exc:
        return ModelConnectionValidation(status="blocked", detail=str(exc))
    if payload.protocol == "openrouter":
        return await _validate_openrouter(base_url, payload.api_key)
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
    for provider in CONNECTED_PROTOCOLS:
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


async def list_ocr_catalog(db: AsyncSession) -> OcrCatalog:
    """OCR models on validated catalog connections, for the canvas library.

    Exposes connection ids, names and public model metadata only (never a URL
    or credential), so every signed-in user may read it.
    """
    try:
        result = await db.execute(select(ModelConnection).order_by(ModelConnection.created_at.desc()))
        connections = list(result.scalars())
    except SQLAlchemyError:
        connections = []
    catalog: list[OcrCatalogConnection] = []
    for connection in connections:
        validation = connection.last_validation or {}
        if not connection.enabled or validation.get("status") != "ready":
            continue
        enabled = set(enabled_model_ids(connection))
        models = [model for model in _discovered(connection) if model.id in enabled]
        if models:
            catalog.append(OcrCatalogConnection(
                connection_id=connection.id,
                connection_name=connection.name,
                protocol=connection.protocol,
                models=models,
            ))
    return OcrCatalog(connections=catalog)


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
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "enabled_models" and value is not None:
            known = {model.id for model in _discovered(connection)}
            value = list(dict.fromkeys(item for item in value if item in known))
        setattr(connection, key, value)
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
