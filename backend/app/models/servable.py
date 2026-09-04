"""Registry of remote-servable models.

Maps each model id that can run behind a per-provider service to its provider
and its input/output pydantic schemas. This is the single source of truth shared
by:

* ``RemoteModelRunner`` (gateway side) — needs the output schema to parse the
  service response back into a typed object.
* the internal provider service app — needs the input schema to validate the
  forwarded JSON body before handing it to the local runner.

Only the optional ML providers (Docling, Surya, Paddle, and Liquid) are served
remotely. Light in-process work (loaders, transforms) always runs inside
whichever process handles the request.
"""

from __future__ import annotations

from dataclasses import dataclass

from pydantic import BaseModel

from app.schemas.models.docling.code_formula import CodeFormulaInput, CodeFormulaOutput
from app.schemas.models.docling.convert_pipeline import (
    ConvertPipelineInput,
    ConvertPipelineOutput,
)
from app.schemas.models.docling.layout_heron import (
    LayoutDetectionInput as DoclingLayoutInput,
)
from app.schemas.models.docling.layout_heron import (
    LayoutDetectionOutput as DoclingLayoutOutput,
)
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
from app.schemas.models.liquid.generation import (
    LiquidStructuredOutput,
    LiquidVisionInput,
    LiquidVisionStructuredInput,
    LiquidTextOutput,
)
from app.schemas.models.paddle.doclayout import DocLayoutInput, DocLayoutOutput
from app.schemas.models.paddle.ocr import PaddleOcrInput, PaddleOcrOutput
from app.schemas.models.paddle.pp_structure import PpStructureInput, PpStructureOutput
from app.schemas.models.surya.latex_ocr import LatexOcrInput, LatexOcrOutput
from app.schemas.models.surya.layout import (
    LayoutDetectionInput as SuryaLayoutInput,
)
from app.schemas.models.surya.layout import (
    LayoutDetectionOutput as SuryaLayoutOutput,
)
from app.schemas.models.surya.reading_order import ReadingOrderInput, ReadingOrderOutput
from app.schemas.models.surya.table_recognition import (
    TableRecognitionInput,
    TableRecognitionOutput,
)
from app.schemas.models.surya.text_detection import (
    TextDetectionInput,
    TextDetectionOutput,
)
from app.schemas.models.surya.text_recognition import (
    TextRecognitionInput,
    TextRecognitionOutput,
)

#: Providers that run as their own containerized service in remote mode.
REMOTE_PROVIDERS: frozenset[str] = frozenset({"docling", "surya", "paddle", "liquid"})


@dataclass(frozen=True)
class ServableModel:
    """Schema + routing metadata for a remotely servable model."""

    model_id: str
    provider: str
    input_schema: type[BaseModel]
    output_schema: type[BaseModel]


def _servable(
    model_id: str,
    input_schema: type[BaseModel],
    output_schema: type[BaseModel],
) -> ServableModel:
    provider = model_id.split("/", 1)[0]
    return ServableModel(
        model_id=model_id,
        provider=provider,
        input_schema=input_schema,
        output_schema=output_schema,
    )


SERVABLE_MODELS: dict[str, ServableModel] = {
    entry.model_id: entry
    for entry in (
        # docling
        _servable("docling/layout-heron", DoclingLayoutInput, DoclingLayoutOutput),
        _servable("docling/ocr-auto", OcrRecognitionInput, OcrRecognitionOutput),
        _servable(
            "docling/tableformer-accurate", TableStructureInput, TableStructureOutput
        ),
        _servable(
            "docling/picture-classifier-v2.5",
            FigureClassificationInput,
            FigureClassificationOutput,
        ),
        _servable("docling/vlm-granite-docling", VlmConvertInput, VlmConvertOutput),
        _servable(
            "docling/picture-description-smolvlm",
            PictureDescriptionInput,
            PictureDescriptionOutput,
        ),
        _servable("docling/code-formula-v2", CodeFormulaInput, CodeFormulaOutput),
        _servable(
            "docling/convert-pipeline", ConvertPipelineInput, ConvertPipelineOutput
        ),
        # surya
        _servable("surya/layout", SuryaLayoutInput, SuryaLayoutOutput),
        _servable("surya/reading-order", ReadingOrderInput, ReadingOrderOutput),
        _servable("surya/text-detection", TextDetectionInput, TextDetectionOutput),
        _servable(
            "surya/text-recognition", TextRecognitionInput, TextRecognitionOutput
        ),
        _servable(
            "surya/table-recognition", TableRecognitionInput, TableRecognitionOutput
        ),
        _servable("surya/latex-ocr", LatexOcrInput, LatexOcrOutput),
        # paddle
        _servable("paddle/doclayout-s", DocLayoutInput, DocLayoutOutput),
        _servable("paddle/ocr-v6-small", PaddleOcrInput, PaddleOcrOutput),
        _servable("paddle/pp-structure", PpStructureInput, PpStructureOutput),
        # Liquid AI — LFM2.5-VL-1.6B document vision
        _servable("liquid/vision-prompt", LiquidVisionInput, LiquidTextOutput),
        _servable(
            "liquid/vision-structured-extract",
            LiquidVisionStructuredInput,
            LiquidStructuredOutput,
        ),
    )
}


def get_servable_model(model_id: str) -> ServableModel | None:
    return SERVABLE_MODELS.get(model_id)


def is_remote_provider(provider: str) -> bool:
    return provider in REMOTE_PROVIDERS


def models_for_provider(provider: str) -> list[ServableModel]:
    return [entry for entry in SERVABLE_MODELS.values() if entry.provider == provider]
