"""Build minimal Docling conversion context from OCRFlow page images."""

from __future__ import annotations

from docling.datamodel.base_models import ConversionStatus, InputFormat, Page
from docling.datamodel.document import ConversionResult, InputDocument
from docling_core.types.doc import Size
from PIL import Image

from app.models.docling._common import pil_to_temp_path
from app.schemas.artifacts import PageImage


async def build_conversion_page(
    page_image: PageImage,
    pil: Image.Image,
) -> tuple[ConversionResult, Page]:
    """Create a ConversionResult + Page wired to ImageDocumentBackend."""
    from docling.backend.image_backend import ImageDocumentBackend

    temp_path = await pil_to_temp_path(pil)
    input_doc = InputDocument(
        path_or_stream=temp_path,
        format=InputFormat.IMAGE,
        backend=ImageDocumentBackend,
        filename=temp_path.name,
    )
    conv_res = ConversionResult(
        input=input_doc,
        status=ConversionStatus.STARTED,
    )
    # A single rasterized page is always backend page 0, even when page_index
    # refers to its position in a multi-page source document (e.g. Page Branch).
    backend_page_index = 0
    page_backend = input_doc._backend.load_page(backend_page_index)
    page = Page(
        page_no=page_image.page_index,
        size=Size(width=float(pil.width), height=float(pil.height)),
    )
    page._backend = page_backend
    page.parsed_page = page_backend.get_segmented_page()
    conv_res.pages = [page]
    return conv_res, page
