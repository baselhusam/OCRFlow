from fastapi import APIRouter

from app.api.v1.models.surya._routes import register_model_routes
from app.schemas.models.surya.latex_ocr import LatexOcrInput, LatexOcrOutput
from app.schemas.models.surya.layout import LayoutDetectionInput, LayoutDetectionOutput
from app.schemas.models.surya.reading_order import ReadingOrderInput, ReadingOrderOutput
from app.schemas.models.surya.table_recognition import (
    TableRecognitionInput,
    TableRecognitionOutput,
)
from app.schemas.models.surya.text_detection import TextDetectionInput, TextDetectionOutput
from app.schemas.models.surya.text_recognition import (
    TextRecognitionInput,
    TextRecognitionOutput,
)

router = APIRouter()

register_model_routes(
    router,
    path="/layout",
    model_id="surya/layout",
    input_schema=LayoutDetectionInput,
    output_schema=LayoutDetectionOutput,
)
register_model_routes(
    router,
    path="/reading-order",
    model_id="surya/reading-order",
    input_schema=ReadingOrderInput,
    output_schema=ReadingOrderOutput,
)
register_model_routes(
    router,
    path="/text-detection",
    model_id="surya/text-detection",
    input_schema=TextDetectionInput,
    output_schema=TextDetectionOutput,
)
register_model_routes(
    router,
    path="/text-recognition",
    model_id="surya/text-recognition",
    input_schema=TextRecognitionInput,
    output_schema=TextRecognitionOutput,
)
register_model_routes(
    router,
    path="/table-recognition",
    model_id="surya/table-recognition",
    input_schema=TableRecognitionInput,
    output_schema=TableRecognitionOutput,
)
register_model_routes(
    router,
    path="/latex-ocr",
    model_id="surya/latex-ocr",
    input_schema=LatexOcrInput,
    output_schema=LatexOcrOutput,
)
