import base64

import pytest

paddleocr = pytest.importorskip("paddleocr")

from app.core.config import get_settings
from app.models.paddle.doclayout_s import PaddleDocLayoutSRunner
from app.schemas.artifacts import PageImage
from app.schemas.models.paddle.doclayout import DocLayoutInput
from tests.conftest import make_png_bytes


@pytest.mark.gpu
@pytest.mark.asyncio
async def test_paddle_doclayout_s_smoke():
    image_bytes = make_png_bytes(64, 64)
    page = PageImage(
        page_index=0,
        width=64,
        height=64,
        image_base64=base64.b64encode(image_bytes).decode("ascii"),
    )
    config = get_settings().build_model_config()
    runner = PaddleDocLayoutSRunner()
    await runner.load(config)
    try:
        output = await runner.run(DocLayoutInput(page=page))
        assert output.page_index == 0
        assert output.meta.model_id == "paddle/doclayout-s"
    finally:
        await runner.unload()
