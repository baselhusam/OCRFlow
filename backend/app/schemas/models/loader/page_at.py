"""Page selection bridge node schemas."""

from pydantic import BaseModel, Field

from app.schemas.artifacts import PageArtifact
from app.schemas.models.docling._meta import InferenceMeta


class PageAtOptions(BaseModel):
    page_index: int = Field(default=0, ge=0)


class PageAtInput(BaseModel):
    pages: list[PageArtifact]
    options: PageAtOptions = Field(default_factory=PageAtOptions)


class PageAtOutput(BaseModel):
    page: PageArtifact
    meta: InferenceMeta
