"""Project asset upload schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AssetUploadResponse(BaseModel):
    asset_id: str
    filename: str
    mime_type: str
    size_bytes: int = Field(ge=0)
    format: str = Field(pattern=r"^(pdf|image)$")


class AssetMeta(BaseModel):
    asset_id: str
    project_id: str
    filename: str
    mime_type: str
    size_bytes: int = Field(ge=0)
    format: str = Field(pattern=r"^(pdf|image)$")


class AssetBatchUploadResponse(BaseModel):
    items: list[AssetUploadResponse]


class AssetListResponse(BaseModel):
    items: list[AssetMeta]
