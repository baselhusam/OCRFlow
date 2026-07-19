import pytest

from app.core.config import get_settings
from app.models.surya.layout import SuryaLayoutRunner
from app.schemas.artifacts import PageImage
from app.schemas.models.surya.layout import LayoutDetectionInput
from tests.conftest import make_png_bytes


@pytest.mark.gpu
@pytest.mark.asyncio
async def test_surya_layout_smoke():
    image_bytes = make_png_bytes(64, 64)
    import base64

    page = PageImage(
        page_index=0,
        width=64,
        height=64,
        image_base64=base64.b64encode(image_bytes).decode("ascii"),
    )
    config = get_settings().build_model_config()
    runner = SuryaLayoutRunner()
    await runner.load(config)
    try:
        output = await runner.run(LayoutDetectionInput(page=page))
        assert output.page_index == 0
        assert output.meta.model_id == "surya/layout"
    finally:
        await runner.unload()
