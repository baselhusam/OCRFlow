import pytest

docling = pytest.importorskip("docling")

from app.models.base import ModelConfig
from app.models.docling.layout_heron import DoclingLayoutHeronRunner
from app.schemas.models.docling.layout_heron import LayoutDetectionInput


@pytest.mark.gpu
@pytest.mark.asyncio
async def test_layout_heron_smoke_inference(sample_page_image):
    runner = DoclingLayoutHeronRunner()
    config = ModelConfig(timeout_seconds=300.0)
    await runner.load(config)
    try:
        result = await runner.run(LayoutDetectionInput(page=sample_page_image))
        assert result.page_index == 0
        assert result.meta.model_id == "docling/layout-heron"
    finally:
        await runner.unload()
