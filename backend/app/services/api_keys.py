"""Secure API-key issuance, validation, and queryable request telemetry."""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import UserRole
from app.db.models.api_key import ApiKey, ApiKeyUsage
from app.db.models.pipeline import Pipeline
from app.db.models.user import User
from app.schemas.api_key import ApiKeyCreate, ApiKeyRead, ApiKeyUsageItem, ApiKeyUsageSummary

_KEY_PREFIX = "ocrflow_"


def _hash(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def _public_prefix(raw_key: str) -> str:
    return raw_key[:20]


def _is_expired(key: ApiKey) -> bool:
    return key.expires_at is not None and key.expires_at <= datetime.now(tz=UTC)


async def create_key(
    db: AsyncSession, *, owner: User, payload: ApiKeyCreate
) -> tuple[ApiKeyRead, str]:
    if owner.user_role not in (UserRole.ADMIN, UserRole.DEVELOPER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Developer access is required")
    if payload.expires_at is not None and payload.expires_at <= datetime.now(tz=UTC):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="expires_at must be in the future")

    allowed = [str(pipeline_id) for pipeline_id in payload.allowed_pipeline_ids]
    if allowed:
        query = select(Pipeline.id).where(Pipeline.id.in_(payload.allowed_pipeline_ids))
        if owner.user_role != UserRole.ADMIN:
            query = query.where(Pipeline.owner_id == owner.id)
        found = {str(value) for value in (await db.execute(query)).scalars().all()}
        if found != set(allowed):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more allowed pipelines were not found")

    # Prefix is stored for indexed lookup; the full secret is shown exactly once.
    raw_key = f"{_KEY_PREFIX}{secrets.token_urlsafe(32)}"
    key = ApiKey(
        owner_id=owner.id,
        name=payload.name.strip(),
        key_prefix=_public_prefix(raw_key),
        key_hash=_hash(raw_key),
        allowed_pipeline_ids=allowed,
        expires_at=payload.expires_at,
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)
    return await key_to_read(db, key), raw_key


async def authenticate_key(db: AsyncSession, raw_key: str | None) -> tuple[ApiKey, User]:
    if not raw_key or not raw_key.startswith(_KEY_PREFIX):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="A valid X-API-Key is required")
    key = await db.scalar(select(ApiKey).where(ApiKey.key_prefix == _public_prefix(raw_key)))
    if key is None or not secrets.compare_digest(key.key_hash, _hash(raw_key)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
    if not key.is_active or _is_expired(key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key is inactive or expired")
    owner = await db.get(User, key.owner_id)
    if owner is None or not owner.is_active or owner.user_role not in (UserRole.ADMIN, UserRole.DEVELOPER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="API-key owner no longer has developer access")
    return key, owner


def permits_pipeline(key: ApiKey, pipeline_id: uuid.UUID) -> bool:
    allowed = set(key.allowed_pipeline_ids or [])
    return not allowed or str(pipeline_id) in allowed


async def record_usage(
    db: AsyncSession,
    *,
    key: ApiKey,
    endpoint: str,
    method: str,
    status_code: int,
    pipeline_id: uuid.UUID | None = None,
    document_count: int = 0,
    page_count: int = 0,
    error_code: str | None = None,
) -> None:
    key.last_used_at = datetime.now(tz=UTC)
    db.add(ApiKeyUsage(
        api_key_id=key.id,
        owner_id=key.owner_id,
        pipeline_id=pipeline_id,
        endpoint=endpoint,
        method=method,
        status_code=status_code,
        outcome="success" if status_code < 400 else "error",
        document_count=document_count,
        page_count=page_count,
        error_code=error_code,
    ))
    await db.commit()


async def key_to_read(db: AsyncSession, key: ApiKey) -> ApiKeyRead:
    owner = await db.get(User, key.owner_id)
    allowed_ids = [uuid.UUID(value) for value in (key.allowed_pipeline_ids or [])]
    allowed_names: list[str] = []
    if allowed_ids:
        allowed_names = list((await db.execute(
            select(Pipeline.name).where(Pipeline.id.in_(allowed_ids)).order_by(Pipeline.name.asc())
        )).scalars().all())
    stats = await db.execute(
        select(
            func.count(ApiKeyUsage.id),
            func.coalesce(func.sum(ApiKeyUsage.document_count), 0),
            func.count(case((ApiKeyUsage.outcome == "success", 1))),
            func.count(case((ApiKeyUsage.outcome == "error", 1))),
        ).where(ApiKeyUsage.api_key_id == key.id)
    )
    count, documents, successful, failed = stats.one()
    return ApiKeyRead(
        id=key.id, owner_id=key.owner_id, owner_email=owner.email if owner else None, name=key.name, key_prefix=key.key_prefix,
        allowed_pipeline_ids=list(key.allowed_pipeline_ids or []), allowed_pipeline_names=allowed_names,
        is_active=key.is_active,
        last_used_at=key.last_used_at, expires_at=key.expires_at, revoked_at=key.revoked_at,
        created_at=key.created_at, updated_at=key.updated_at,
        request_count=int(count or 0), document_count=int(documents or 0),
        successful_requests=int(successful or 0), failed_requests=int(failed or 0),
    )


async def list_keys(db: AsyncSession, *, owner_id: uuid.UUID | None = None) -> list[ApiKeyRead]:
    query = select(ApiKey).order_by(ApiKey.created_at.desc())
    if owner_id is not None:
        query = query.where(ApiKey.owner_id == owner_id)
    keys = list((await db.execute(query)).scalars().all())
    return [await key_to_read(db, key) for key in keys]


async def revoke_key(db: AsyncSession, *, key_id: uuid.UUID, owner_id: uuid.UUID | None = None) -> None:
    query = select(ApiKey).where(ApiKey.id == key_id)
    if owner_id is not None:
        query = query.where(ApiKey.owner_id == owner_id)
    key = (await db.execute(query)).scalar_one_or_none()
    if key is None:
        raise LookupError("API key not found")
    key.is_active = False
    key.revoked_at = datetime.now(tz=UTC)
    await db.commit()


async def usage_summary(db: AsyncSession, *, key_id: uuid.UUID) -> ApiKeyUsageSummary:
    stats = await db.execute(
        select(
            func.count(ApiKeyUsage.id), func.coalesce(func.sum(ApiKeyUsage.document_count), 0),
            func.count(case((ApiKeyUsage.outcome == "success", 1))),
            func.count(case((ApiKeyUsage.outcome == "error", 1))), func.max(ApiKeyUsage.created_at),
        ).where(ApiKeyUsage.api_key_id == key_id)
    )
    count, documents, successful, failed, last_used = stats.one()
    usages = list((await db.execute(
        select(ApiKeyUsage).where(ApiKeyUsage.api_key_id == key_id).order_by(ApiKeyUsage.created_at.desc()).limit(100)
    )).scalars().all())
    pipeline_ids = {usage.pipeline_id for usage in usages if usage.pipeline_id is not None}
    pipeline_names = {
        row.id: row.name
        for row in (await db.execute(select(Pipeline.id, Pipeline.name).where(Pipeline.id.in_(pipeline_ids)))).all()
    } if pipeline_ids else {}
    return ApiKeyUsageSummary(
        request_count=int(count or 0), document_count=int(documents or 0),
        successful_requests=int(successful or 0), failed_requests=int(failed or 0), last_used_at=last_used,
        timeline=[ApiKeyUsageItem(
            id=usage.id, api_key_id=usage.api_key_id, pipeline_id=usage.pipeline_id,
            pipeline_name=pipeline_names.get(usage.pipeline_id), endpoint=usage.endpoint,
            method=usage.method, status_code=usage.status_code, outcome=usage.outcome,
            document_count=usage.document_count, page_count=usage.page_count,
            error_code=usage.error_code, created_at=usage.created_at,
        ) for usage in usages],
    )
