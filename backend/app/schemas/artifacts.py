"""Shared pipeline wire types for OCRFlow model tasks."""

from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Any, Self

from pydantic import BaseModel, Field, field_validator, model_validator


class LayoutLabel(StrEnum):
    paragraph = "paragraph"
    title = "title"
    table = "table"
    figure = "figure"
    list = "list"
    header = "header"
    footer = "footer"
    caption = "caption"
    formula = "formula"
    code = "code"
    section_header = "section_header"
    page_header = "page_header"
    page_footer = "page_footer"
    list_item = "list_item"
    picture = "picture"
    other = "other"


BBox = Annotated[list[float], Field(min_length=4, max_length=4)]
Polygon = list[list[float]]


def validate_bbox(bbox: list[float]) -> list[float]:
    if len(bbox) != 4:
        raise ValueError("bbox must have exactly 4 values [x0, y0, x1, y1]")

    x0, y0, x1, y1 = bbox
    for value, name in zip(bbox, ("x0", "y0", "x1", "y1"), strict=True):
        if not 0.0 <= value <= 1.0:
            raise ValueError(f"{name} must be in [0, 1], got {value}")

    if x1 <= x0:
        raise ValueError(f"x1 must be greater than x0, got x0={x0}, x1={x1}")
    if y1 <= y0:
        raise ValueError(f"y1 must be greater than y0, got y0={y0}, y1={y1}")

    return bbox


def validate_polygon(points: Polygon) -> Polygon:
    if len(points) < 3:
        raise ValueError("polygon must have at least 3 points")

    for index, point in enumerate(points):
        if len(point) != 2:
            raise ValueError(f"polygon point {index} must have exactly 2 coordinates [x, y]")
        x, y = point
        if not 0.0 <= x <= 1.0:
            raise ValueError(f"polygon point {index} x must be in [0, 1], got {x}")
        if not 0.0 <= y <= 1.0:
            raise ValueError(f"polygon point {index} y must be in [0, 1], got {y}")

    return points


class PageImage(BaseModel):
    """Single page raster with dimensions."""

    page_index: int = Field(ge=0)
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    image_base64: str | None = None
    image_url: str | None = None

    @model_validator(mode="after")
    def validate_image_source(self) -> Self:
        has_base64 = self.image_base64 is not None and self.image_base64 != ""
        has_url = self.image_url is not None and self.image_url != ""

        if has_base64 == has_url:
            raise ValueError("exactly one of image_base64 or image_url must be provided")

        return self


class DocumentInput(BaseModel):
    """PDF path/bytes/URL or image list."""

    source: str
    format: str = Field(pattern=r"^(pdf|image|images)$")
    page_range: tuple[int, int] | None = None

    @field_validator("page_range")
    @classmethod
    def validate_page_range(cls, value: tuple[int, int] | None) -> tuple[int, int] | None:
        if value is None:
            return value
        start, end = value
        if start < 0 or end < start:
            raise ValueError("page_range must be (start, end) with start >= 0 and end >= start")
        return value


class Region(BaseModel):
    id: str
    label: LayoutLabel
    bbox: BBox
    confidence: float = Field(ge=0.0, le=1.0)
    docling_label: str | None = None
    provider_label: str | None = None

    @field_validator("bbox")
    @classmethod
    def check_bbox(cls, value: list[float]) -> list[float]:
        return validate_bbox(value)


class TextLine(BaseModel):
    id: str
    bbox: BBox
    polygon: Polygon | None = None
    text: str | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    language: str | None = None

    @field_validator("bbox")
    @classmethod
    def check_bbox(cls, value: list[float]) -> list[float]:
        return validate_bbox(value)

    @field_validator("polygon")
    @classmethod
    def check_polygon(cls, value: Polygon | None) -> Polygon | None:
        if value is None:
            return value
        return validate_polygon(value)


class TableCell(BaseModel):
    row: int = Field(ge=0)
    col: int = Field(ge=0)
    bbox: BBox
    text: str | None = None
    is_header: bool = False
    row_span: int = Field(default=1, ge=1)
    col_span: int = Field(default=1, ge=1)

    @field_validator("bbox")
    @classmethod
    def check_bbox(cls, value: list[float]) -> list[float]:
        return validate_bbox(value)


class TableStructure(BaseModel):
    id: str
    bbox: BBox
    rows: int = Field(ge=0)
    cols: int = Field(ge=0)
    cells: list[TableCell] = Field(default_factory=list)
    html: str | None = None
    otsl: str | None = None

    @field_validator("bbox")
    @classmethod
    def check_bbox(cls, value: list[float]) -> list[float]:
        return validate_bbox(value)


class Formula(BaseModel):
    id: str
    bbox: BBox
    latex: str
    inline: bool = False

    @field_validator("bbox")
    @classmethod
    def check_bbox(cls, value: list[float]) -> list[float]:
        return validate_bbox(value)


class Figure(BaseModel):
    id: str
    bbox: BBox
    category: str | None = None
    caption: str | None = None
    description: str | None = None

    @field_validator("bbox")
    @classmethod
    def check_bbox(cls, value: list[float]) -> list[float]:
        return validate_bbox(value)


class ReadingOrder(BaseModel):
    ordered_ids: list[str]


class PageArtifact(BaseModel):
    page_index: int = Field(ge=0)
    page: PageImage | None = None
    regions: list[Region] = Field(default_factory=list)
    lines: list[TextLine] = Field(default_factory=list)
    tables: list[TableStructure] = Field(default_factory=list)
    formulas: list[Formula] = Field(default_factory=list)
    figures: list[Figure] = Field(default_factory=list)
    reading_order: ReadingOrder | None = None


class DocumentArtifact(BaseModel):
    pages: list[PageArtifact] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class DoclingDocumentRef(BaseModel):
    """Opaque Docling-native document for lossless passthrough between Docling-only stages."""

    payload: dict[str, Any]
    schema_version: str = "1"
