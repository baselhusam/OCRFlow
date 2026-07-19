"""Shared document loading and PDF rasterization utilities."""

from __future__ import annotations

import base64
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image

from app.models._image_utils import decode_upload_to_page_image, pil_to_page_image
from app.models.errors import ModelInferenceError
from app.schemas.artifacts import DocumentInput, PageArtifact, PageImage
from app.services.asset_storage import resolve_asset_source


def document_source_to_bytes(
    document: DocumentInput,
    *,
    upload_dir: Path,
    project_id: str | None,
) -> bytes:
    source = document.source

    if source.startswith("asset:"):
        try:
            return resolve_asset_source(source, upload_dir=upload_dir, project_id=project_id)
        except ValueError as exc:
            raise ModelInferenceError(str(exc)) from exc
        except Exception as exc:
            raise ModelInferenceError(f"Failed to load asset: {exc}") from exc

    if source.startswith("http://") or source.startswith("https://"):
        raise ModelInferenceError("URL document sources not yet supported")

    path = Path(source)
    if path.is_file():
        return path.read_bytes()

    try:
        return base64.b64decode(source, validate=True)
    except Exception as exc:
        raise ModelInferenceError(
            "document.source must be asset:{id}, a filesystem path, or base64 payload"
        ) from exc


def image_bytes_to_page_image(image_bytes: bytes, *, page_index: int = 0) -> PageImage:
    return decode_upload_to_page_image(page_index=page_index, image_bytes=image_bytes)


def rasterize_pdf(
    pdf_bytes: bytes,
    *,
    dpi: int,
    page_range: tuple[int, int] | None,
    max_pages: int,
) -> list[PageImage]:
    try:
        pdf = pdfium.PdfDocument(pdf_bytes)
    except Exception as exc:
        raise ModelInferenceError(f"Failed to open PDF: {exc}") from exc

    total_pages = len(pdf)
    if total_pages == 0:
        raise ModelInferenceError("PDF has no pages")

    start = 0
    end = total_pages - 1
    if page_range is not None:
        start, end = page_range
        end = min(end, total_pages - 1)

    if start >= total_pages:
        raise ModelInferenceError(f"page_range start {start} exceeds page count {total_pages}")

    page_indices = list(range(start, end + 1))
    if len(page_indices) > max_pages:
        page_indices = page_indices[:max_pages]

    scale = dpi / 72.0
    pages: list[PageImage] = []

    for page_index in page_indices:
        page = pdf[page_index]
        try:
            bitmap = page.render(scale=scale)
            pil_image = bitmap.to_pil().convert("RGB")
            pages.append(pil_to_page_image(pil_image, page_index=page_index))
        except Exception as exc:
            raise ModelInferenceError(f"Failed to rasterize page {page_index}: {exc}") from exc
        finally:
            page.close()

    pdf.close()
    return pages


def page_images_to_artifacts(images: list[PageImage]) -> list[PageArtifact]:
    return [PageArtifact(page_index=image.page_index, page=image) for image in images]
