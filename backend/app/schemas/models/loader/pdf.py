"""Loader model input/output schemas."""

from pydantic import BaseModel, Field

from app.schemas.artifacts import DocumentInput, PageArtifact
from app.schemas.models.docling._meta import InferenceMeta


class LoaderOptions(BaseModel):
    project_id: str | None = Field(
        default=None,
        description="Project id required when document.source uses asset:{id}",
    )


class ImageLoaderOptions(LoaderOptions):
    pass


class ImageLoaderInput(BaseModel):
    document: DocumentInput
    options: ImageLoaderOptions = Field(default_factory=ImageLoaderOptions)


class ImageLoaderOutput(BaseModel):
    pages: list[PageArtifact]
    meta: InferenceMeta


class PdfLoaderOptions(LoaderOptions):
    dpi: int = Field(default=200, ge=72, le=600)
    max_pages: int = Field(default=50, ge=1, le=500)


class PdfLoaderInput(BaseModel):
    document: DocumentInput
    options: PdfLoaderOptions = Field(default_factory=PdfLoaderOptions)


class PdfLoaderOutput(BaseModel):
    pages: list[PageArtifact]
    meta: InferenceMeta
