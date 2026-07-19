"""Project-scoped file storage for pipeline uploads."""

from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.schemas.asset import AssetMeta, AssetUploadResponse

ALLOWED_MIME_TYPES: dict[str, str] = {
    "application/pdf": "pdf",
    "image/png": "image",
    "image/jpeg": "image",
    "image/jpg": "image",
    "image/webp": "image",
}


def _asset_dir(upload_dir: Path, project_id: str, asset_id: str) -> Path:
    return upload_dir / project_id / asset_id


def _meta_path(upload_dir: Path, project_id: str, asset_id: str) -> Path:
    return _asset_dir(upload_dir, project_id, asset_id) / "meta.json"


def _data_path(upload_dir: Path, project_id: str, asset_id: str) -> Path:
    return _asset_dir(upload_dir, project_id, asset_id) / "data"


def detect_format(mime_type: str) -> str | None:
    return ALLOWED_MIME_TYPES.get(mime_type.lower())


async def save_project_asset(
    *,
    upload_dir: Path,
    project_id: str,
    file: UploadFile,
) -> AssetUploadResponse:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")

    mime_type = file.content_type or "application/octet-stream"
    doc_format = detect_format(mime_type)
    if doc_format is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {mime_type}. Allowed: PDF and images (PNG, JPEG, WebP).",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    asset_id = str(uuid.uuid4())
    asset_dir = _asset_dir(upload_dir, project_id, asset_id)
    asset_dir.mkdir(parents=True, exist_ok=True)

    data_path = _data_path(upload_dir, project_id, asset_id)
    data_path.write_bytes(data)

    meta = AssetMeta(
        asset_id=asset_id,
        project_id=project_id,
        filename=file.filename,
        mime_type=mime_type,
        size_bytes=len(data),
        format=doc_format,
    )
    _meta_path(upload_dir, project_id, asset_id).write_text(
        meta.model_dump_json(indent=2),
        encoding="utf-8",
    )

    return AssetUploadResponse(
        asset_id=asset_id,
        filename=file.filename,
        mime_type=mime_type,
        size_bytes=len(data),
        format=doc_format,
    )


def load_asset_meta(upload_dir: Path, project_id: str, asset_id: str) -> AssetMeta:
    meta_path = _meta_path(upload_dir, project_id, asset_id)
    if not meta_path.is_file():
        raise FileNotFoundError("Asset not found")
    return AssetMeta.model_validate_json(meta_path.read_text(encoding="utf-8"))


def load_asset_bytes(upload_dir: Path, project_id: str, asset_id: str) -> bytes:
    load_asset_meta(upload_dir, project_id, asset_id)
    data_path = _data_path(upload_dir, project_id, asset_id)
    if not data_path.is_file():
        raise FileNotFoundError("Asset data not found")
    return data_path.read_bytes()


def delete_project_asset(upload_dir: Path, project_id: str, asset_id: str) -> None:
    asset_dir = _asset_dir(upload_dir, project_id, asset_id)
    if not asset_dir.is_dir():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    shutil.rmtree(asset_dir)


def delete_all_project_assets(upload_dir: Path, project_id: str) -> None:
    project_dir = upload_dir / project_id
    if project_dir.is_dir():
        shutil.rmtree(project_dir)


def list_project_assets(upload_dir: Path, project_id: str) -> list[AssetMeta]:
    project_dir = upload_dir / project_id
    if not project_dir.is_dir():
        return []

    assets: list[AssetMeta] = []
    for asset_dir in project_dir.iterdir():
        if not asset_dir.is_dir():
            continue
        meta_path = asset_dir / "meta.json"
        if not meta_path.is_file():
            continue
        try:
            assets.append(AssetMeta.model_validate_json(meta_path.read_text(encoding="utf-8")))
        except ValueError:
            continue
    return sorted(assets, key=lambda asset: asset.filename.lower())


def resolve_asset_source(
    source: str,
    *,
    upload_dir: Path,
    project_id: str | None,
) -> bytes:
    if not source.startswith("asset:"):
        raise ValueError("Not an asset source")

    asset_id = source.removeprefix("asset:")
    if not asset_id:
        raise ValueError("Asset id is empty")
    if project_id is None:
        raise ValueError("project_id is required for asset sources")

    try:
        return load_asset_bytes(upload_dir, project_id, asset_id)
    except FileNotFoundError as exc:
        raise ValueError(str(exc)) from exc
