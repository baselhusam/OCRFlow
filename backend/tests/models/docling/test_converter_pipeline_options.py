from docling.datamodel.pipeline_options import (
    EasyOcrOptions,
    OcrAutoOptions,
    RapidOcrOptions,
    TableFormerMode,
)

from app.models.docling._converter import build_ocr_options, build_pipeline_options


def test_build_ocr_options_maps_known_engines():
    assert isinstance(build_ocr_options("auto"), OcrAutoOptions)
    assert isinstance(build_ocr_options("easyocr"), EasyOcrOptions)
    assert isinstance(build_ocr_options("rapidocr"), RapidOcrOptions)
    assert isinstance(build_ocr_options("unknown"), OcrAutoOptions)


def test_build_pipeline_options_applies_layout_ocr_and_tableformer():
    options = build_pipeline_options(
        layout_model="egret-large",
        ocr_engine="easyocr",
        tableformer_mode="fast",
    )

    assert options.ocr_options.kind == "easyocr"
    assert options.table_structure_options.mode == TableFormerMode.FAST
    assert options.layout_options.model_spec.name == "docling_layout_egret_large"
