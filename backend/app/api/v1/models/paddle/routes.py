from fastapi import APIRouter

from app.api.v1.models.paddle._routes import register_model_routes
from app.schemas.models.paddle.doclayout import DocLayoutInput, DocLayoutOutput
from app.schemas.models.paddle.ocr import PaddleOcrInput, PaddleOcrOutput
from app.schemas.models.paddle.pp_structure import PpStructureInput, PpStructureOutput

router = APIRouter()

register_model_routes(
    router,
    path="/doclayout-s",
    model_id="paddle/doclayout-s",
    input_schema=DocLayoutInput,
    output_schema=DocLayoutOutput,
)
register_model_routes(
    router,
    path="/ocr-v6-small",
    model_id="paddle/ocr-v6-small",
    input_schema=PaddleOcrInput,
    output_schema=PaddleOcrOutput,
)
register_model_routes(
    router,
    path="/pp-structure",
    model_id="paddle/pp-structure",
    input_schema=PpStructureInput,
    output_schema=PpStructureOutput,
)
