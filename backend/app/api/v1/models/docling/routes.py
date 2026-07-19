from fastapi import APIRouter

from app.api.v1.models.docling._routes import register_model_routes
from app.schemas.models.docling.code_formula import CodeFormulaInput, CodeFormulaOutput
from app.schemas.models.docling.convert_pipeline import (
    ConvertPipelineInput,
    ConvertPipelineOutput,
)
from app.schemas.models.docling.layout_heron import LayoutDetectionInput, LayoutDetectionOutput
from app.schemas.models.docling.ocr import OcrRecognitionInput, OcrRecognitionOutput
from app.schemas.models.docling.picture_classifier import (
    FigureClassificationInput,
    FigureClassificationOutput,
)
from app.schemas.models.docling.picture_description import (
    PictureDescriptionInput,
    PictureDescriptionOutput,
)
from app.schemas.models.docling.table_structure import (
    TableStructureInput,
    TableStructureOutput,
)
from app.schemas.models.docling.vlm_convert import VlmConvertInput, VlmConvertOutput

router = APIRouter()

register_model_routes(
    router,
    path="/layout-heron",
    model_id="docling/layout-heron",
    input_schema=LayoutDetectionInput,
    output_schema=LayoutDetectionOutput,
)
register_model_routes(
    router,
    path="/ocr-auto",
    model_id="docling/ocr-auto",
    input_schema=OcrRecognitionInput,
    output_schema=OcrRecognitionOutput,
)
register_model_routes(
    router,
    path="/tableformer-accurate",
    model_id="docling/tableformer-accurate",
    input_schema=TableStructureInput,
    output_schema=TableStructureOutput,
)
register_model_routes(
    router,
    path="/picture-classifier-v2.5",
    model_id="docling/picture-classifier-v2.5",
    input_schema=FigureClassificationInput,
    output_schema=FigureClassificationOutput,
)
register_model_routes(
    router,
    path="/vlm-granite-docling",
    model_id="docling/vlm-granite-docling",
    input_schema=VlmConvertInput,
    output_schema=VlmConvertOutput,
)
register_model_routes(
    router,
    path="/picture-description-smolvlm",
    model_id="docling/picture-description-smolvlm",
    input_schema=PictureDescriptionInput,
    output_schema=PictureDescriptionOutput,
)
register_model_routes(
    router,
    path="/code-formula-v2",
    model_id="docling/code-formula-v2",
    input_schema=CodeFormulaInput,
    output_schema=CodeFormulaOutput,
)
register_model_routes(
    router,
    path="/convert-pipeline",
    model_id="docling/convert-pipeline",
    input_schema=ConvertPipelineInput,
    output_schema=ConvertPipelineOutput,
)
