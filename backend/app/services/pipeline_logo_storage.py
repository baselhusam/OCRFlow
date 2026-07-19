"""Pipeline logo file storage."""

from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

MAX_LOGO_BYTES = 512 * 1024

ALLOWED_LOGO_MIME: dict[str, str] = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
}


def _pipeline_logo_dir(upload_dir: Path, pipeline_id: str) -> Path:
    return upload_dir / "pipelines" / pipeline_id


def _find_logo_path(upload_dir: Path, pipeline_id: str) -> Path | None:
    logo_dir = _pipeline_logo_dir(upload_dir, pipeline_id)
    if not logo_dir.exists():
        return None
    for ext in ("png", "jpg", "webp", "svg"):
        candidate = logo_dir / f"logo.{ext}"
        if candidate.exists():
            return candidate
    return None


def has_pipeline_logo(upload_dir: Path, pipeline_id: str) -> bool:
    return _find_logo_path(upload_dir, pipeline_id) is not None


async def save_pipeline_logo(
    *,
    upload_dir: Path,
    pipeline_id: str,
    file: UploadFile,
) -> str:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required"
        )

    mime_type = (file.content_type or "application/octet-stream").lower()
    ext = ALLOWED_LOGO_MIME.get(mime_type)
    if ext is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {mime_type}. Allowed: PNG, JPEG, WebP, SVG.",
        )

    data = await file.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty"
        )
    if len(data) > MAX_LOGO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Logo file exceeds 512KB limit",
        )

    logo_dir = _pipeline_logo_dir(upload_dir, pipeline_id)
    if logo_dir.exists():
        shutil.rmtree(logo_dir)
    logo_dir.mkdir(parents=True, exist_ok=True)

    logo_path = logo_dir / f"logo.{ext}"
    logo_path.write_bytes(data)
    return mime_type


def load_pipeline_logo(upload_dir: Path, pipeline_id: str) -> tuple[bytes, str]:
    logo_path = _find_logo_path(upload_dir, pipeline_id)
    if logo_path is None:
        raise FileNotFoundError(pipeline_id)

    ext = logo_path.suffix.lstrip(".")
    mime_map = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "webp": "image/webp",
        "svg": "image/svg+xml",
    }
    return logo_path.read_bytes(), mime_map.get(ext, "application/octet-stream")


def delete_pipeline_logo(upload_dir: Path, pipeline_id: str) -> None:
    logo_dir = _pipeline_logo_dir(upload_dir, pipeline_id)
    if logo_dir.exists():
        shutil.rmtree(logo_dir)


def delete_all_pipeline_data(upload_dir: Path, pipeline_id: str) -> None:
    delete_pipeline_logo(upload_dir, pipeline_id)
