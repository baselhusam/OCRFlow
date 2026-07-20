import base64

import pytest

paddleocr = pytest.importorskip("paddleocr")

from app.core.config import get_settings
from app.models.paddle.pp_structure import PaddlePpStructureRunner
from app.schemas.artifacts import PageImage
from app.schemas.models.paddle.pp_structure import PpStructureInput
from tests.conftest import make_png_bytes


@pytest.mark.gpu
@pytest.mark.asyncio
async def test_paddle_pp_structure_smoke():
    image_bytes = make_png_bytes(64, 64)
    page = PageImage(
        page_index=0,
        width=64,
        height=64,
        image_base64=base64.b64encode(image_bytes).decode("ascii"),
    )
    config = get_settings().build_model_config()
    runner = PaddlePpStructureRunner()
    await runner.load(config)
    try:
        output = await runner.run(PpStructureInput(page=page))
        assert output.page_index == 0
        assert output.meta.model_id == "paddle/pp-structure"
    finally:
        await runner.unload()
