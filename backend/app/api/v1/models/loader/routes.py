from fastapi import APIRouter

from app.api.v1.models.loader._routes import register_model_routes
from app.schemas.models.loader.image import ImageLoaderInput, ImageLoaderOutput
from app.schemas.models.loader.page_at import PageAtInput, PageAtOutput
from app.schemas.models.loader.pdf import PdfLoaderInput, PdfLoaderOutput

router = APIRouter()

register_model_routes(
    router,
    path="/pdf",
    model_id="loader/pdf",
    input_schema=PdfLoaderInput,
    output_schema=PdfLoaderOutput,
)
register_model_routes(
    router,
    path="/image",
    model_id="loader/image",
    input_schema=ImageLoaderInput,
    output_schema=ImageLoaderOutput,
)
register_model_routes(
    router,
    path="/page-at",
    model_id="loader/page-at",
    input_schema=PageAtInput,
    output_schema=PageAtOutput,
)
