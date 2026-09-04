"""Payload builders and output normalizers for backend project runs."""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

from pydantic import BaseModel

from app.schemas.models.docling.code_formula import CodeFormulaInput
from app.schemas.models.docling.convert_pipeline import ConvertPipelineInput
from app.schemas.models.docling.layout_heron import (
    LayoutDetectionInput as DoclingLayoutInput,
)
from app.schemas.models.docling.ocr import OcrRecognitionInput
from app.schemas.models.docling.picture_classifier import FigureClassificationInput
from app.schemas.models.docling.picture_description import PictureDescriptionInput
from app.schemas.models.docling.table_structure import TableStructureInput
from app.schemas.models.docling.vlm_convert import VlmConvertInput
from app.schemas.models.loader.page_at import PageAtInput
from app.schemas.models.loader.pdf import ImageLoaderInput, PdfLoaderInput
from app.schemas.models.ollama.generation import (
    DEFAULT_TEXT_MODEL,
    DEFAULT_VISION_MODEL,
    OllamaStructuredInput,
    OllamaTextInput,
    OllamaVisionInput,
    OllamaVisionStructuredInput,
)
from app.schemas.models.liquid.generation import (
    DEFAULT_VISION_MODEL as DEFAULT_LIQUID_VISION_MODEL,
    LiquidVisionInput,
    LiquidVisionStructuredInput,
)
from app.schemas.models.paddle.doclayout import DocLayoutInput
from app.schemas.models.paddle.ocr import PaddleOcrInput
from app.schemas.models.paddle.pp_structure import PpStructureInput
from app.schemas.models.surya.latex_ocr import LatexOcrInput
from app.schemas.models.surya.layout import LayoutDetectionInput as SuryaLayoutInput
from app.schemas.models.surya.reading_order import ReadingOrderInput
from app.schemas.models.surya.table_recognition import TableRecognitionInput
from app.schemas.models.surya.text_detection import TextDetectionInput
from app.schemas.models.surya.text_recognition import TextRecognitionInput
from app.services.pipeline_execution.schemas import NodeCachedOutput, PipelineNodeRecord
from app.services.pipeline_execution.upstream import (
    UpstreamContext,
    extract_page_image,
    extract_pages,
    extract_raw_list,
)
from app.services.pipeline_wire_kinds import FILE_LOADER_MODELS

PayloadBuilder = Callable[[str, PipelineNodeRecord, UpstreamContext], dict[str, Any] | None]
OutputExtractor = Callable[[BaseModel], NodeCachedOutput]


def _model_dump(model: BaseModel) -> dict[str, Any]:
    return model.model_dump(mode="json", by_alias=True)


def _options_from_params(
    params: dict[str, str | bool | int | float],
    keys: list[str],
) -> dict[str, Any]:
    return {key: params[key] for key in keys if key in params}


def _document_payload(
    project_id: str,
    node: PipelineNodeRecord,
    ctx: UpstreamContext,
    *,
    default_format: str,
    option_keys: list[str] | None = None,
) -> dict[str, Any] | None:
    asset_id = node.config.get("assetId")
    doc_format = node.config.get("format") or default_format

    if (not isinstance(asset_id, str) or not asset_id) and ctx.node is not None:
        if ctx.node.modelId in FILE_LOADER_MODELS:
            upstream_asset = ctx.node.config.get("assetId")
            if isinstance(upstream_asset, str) and upstream_asset:
                asset_id = upstream_asset
                doc_format = ctx.node.config.get("format") or default_format

    if not isinstance(asset_id, str) or not asset_id:
        return None
    options = {"project_id": project_id}
    options.update(_options_from_params(node.config, option_keys or []))
    return {
        "document": {
            "source": f"asset:{asset_id}",
            "format": doc_format if isinstance(doc_format, str) else default_format,
        },
        "options": options,
    }


def _page_from_upstream(ctx: UpstreamContext) -> dict[str, Any] | None:
    return extract_page_image(ctx.output)


def _regions_from_upstream(ctx: UpstreamContext) -> list[dict[str, Any]]:
    return extract_raw_list(ctx.output, "regions")


def _lines_from_upstream(ctx: UpstreamContext) -> list[dict[str, Any]]:
    return extract_raw_list(ctx.output, "lines")


def _table_inputs_from_upstream(ctx: UpstreamContext) -> list[dict[str, Any]]:
    tables = extract_raw_list(ctx.output, "tables")
    if tables:
        return [{"id": table.get("id", f"table-{idx}"), "bbox": table["bbox"]} for idx, table in enumerate(tables) if "bbox" in table]
    return [
        {"id": region.get("id", f"table-{idx}"), "bbox": region["bbox"]}
        for idx, region in enumerate(_regions_from_upstream(ctx))
        if region.get("label") in {"table", "picture"} and "bbox" in region
    ]


def _figure_inputs_from_upstream(ctx: UpstreamContext) -> list[dict[str, Any]]:
    figures = extract_raw_list(ctx.output, "figures")
    if figures:
        return figures
    return [
        {
            "id": region.get("id", f"figure-{idx}"),
            "bbox": region["bbox"],
            "category": region.get("provider_label") or region.get("docling_label"),
        }
        for idx, region in enumerate(_regions_from_upstream(ctx))
        if region.get("label") in {"figure", "picture"} and "bbox" in region
    ]


def _formula_inputs_from_upstream(ctx: UpstreamContext) -> list[dict[str, Any]]:
    formulas = extract_raw_list(ctx.output, "formulas")
    if formulas:
        return [{"id": formula.get("id", f"formula-{idx}"), "bbox": formula["bbox"]} for idx, formula in enumerate(formulas) if "bbox" in formula]
    return [
        {"id": region.get("id", f"formula-{idx}"), "bbox": region["bbox"]}
        for idx, region in enumerate(_regions_from_upstream(ctx))
        if region.get("label") in {"formula", "code"} and "bbox" in region
    ]


def _page_only_payload(
    _project_id: str,
    node: PipelineNodeRecord,
    ctx: UpstreamContext,
    *,
    option_keys: list[str] | None = None,
) -> dict[str, Any] | None:
    page = _page_from_upstream(ctx)
    if page is None:
        return None
    payload: dict[str, Any] = {"page": page}
    regions = _regions_from_upstream(ctx)
    if regions:
        payload["regions"] = regions
    options = _options_from_params(node.config, option_keys or [])
    if options:
        payload["options"] = options
    return payload


def _pages_payload(_project_id: str, node: PipelineNodeRecord, ctx: UpstreamContext) -> dict[str, Any] | None:
    pages = extract_pages(ctx.output)
    if not pages:
        return None
    return {"pages": pages, "options": {"page_index": int(node.config.get("page_index", 0))}}


def _text_recognition_payload(_project_id: str, node: PipelineNodeRecord, ctx: UpstreamContext) -> dict[str, Any] | None:
    page = _page_from_upstream(ctx)
    if page is None:
        return None
    raw_langs = node.config.get("langs")
    if raw_langs is None:
        raw_langs = node.config.get("languages", "eng")
    languages = [
        lang.strip()
        for lang in str(raw_langs).split(",")
        if lang.strip()
    ]
    return {
        "page": page,
        "lines": _lines_from_upstream(ctx),
        "regions": _regions_from_upstream(ctx),
        "languages": languages or ["eng"],
        "options": _options_from_params(node.config, ["confidence_threshold"]),
    }


def _paddle_ocr_payload(
    _project_id: str,
    node: PipelineNodeRecord,
    ctx: UpstreamContext,
) -> dict[str, Any] | None:
    page = _page_from_upstream(ctx)
    if page is None:
        return None
    raw_languages = node.config.get("languages", node.config.get("langs", "en"))
    languages = [
        language.strip()
        for language in str(raw_languages).split(",")
        if language.strip()
    ]
    return {
        "page": page,
        "regions": _regions_from_upstream(ctx),
        "languages": languages or ["en"],
        "options": _options_from_params(
            node.config,
            ["use_angle_cls", "confidence_threshold"],
        ),
    }


def _text_from_upstream(ctx: UpstreamContext) -> str | None:
    output = ctx.output
    if output is None or not isinstance(output.raw, dict):
        return None
    raw = output.raw
    direct_text = raw.get("text")
    if isinstance(direct_text, str) and direct_text.strip():
        return direct_text.strip()

    lines = raw.get("lines")
    if isinstance(lines, list):
        text = "\n".join(
            str(line["text"]).strip()
            for line in lines
            if isinstance(line, dict) and line.get("text")
        )
        if text:
            return text

    markdown = raw.get("markdown")
    if isinstance(markdown, str) and markdown.strip():
        return markdown.strip()

    tables = raw.get("tables")
    if isinstance(tables, list):
        rendered = "\n\n".join(
            str(table.get("html") or table.get("otsl") or "").strip()
            for table in tables
            if isinstance(table, dict)
        ).strip()
        if rendered:
            return rendered

    structured = raw.get("data", raw.get("json"))
    if isinstance(structured, (dict, list)):
        return json.dumps(structured, ensure_ascii=False)
    return None


def _ollama_options(
    node: PipelineNodeRecord,
    *,
    default_model: str,
) -> dict[str, Any]:
    options: dict[str, Any] = {
        "model": node.config.get("model", default_model),
        "temperature": node.config.get("temperature", 0.0),
        "max_tokens": node.config.get("max_tokens", 1024),
    }
    system_prompt = node.config.get("system_prompt")
    if isinstance(system_prompt, str) and system_prompt.strip():
        options["system_prompt"] = system_prompt
    return options


def _json_schema_from_node(node: PipelineNodeRecord) -> dict[str, Any]:
    raw_schema = node.config.get("json_schema")
    if not isinstance(raw_schema, str) or not raw_schema.strip():
        raise ValueError(f"Node {node.id} requires a JSON Schema")
    try:
        schema = json.loads(raw_schema)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Node {node.id} has invalid JSON Schema: {exc.msg}") from exc
    if not isinstance(schema, dict):
        raise ValueError(f"Node {node.id} JSON Schema must be an object")
    return schema


def _ollama_text_payload(
    _project_id: str,
    node: PipelineNodeRecord,
    ctx: UpstreamContext,
) -> dict[str, Any] | None:
    text = _text_from_upstream(ctx)
    if text is None:
        configured_text = node.config.get("text")
        text = configured_text.strip() if isinstance(configured_text, str) else None
    if not text:
        return None
    return {
        "text": text,
        "prompt": node.config.get(
            "prompt",
            "Summarize the input accurately and concisely.",
        ),
        "options": _ollama_options(node, default_model=DEFAULT_TEXT_MODEL),
    }


def _ollama_structured_payload(
    project_id: str,
    node: PipelineNodeRecord,
    ctx: UpstreamContext,
) -> dict[str, Any] | None:
    payload = _ollama_text_payload(project_id, node, ctx)
    if payload is None:
        return None
    payload["json_schema"] = _json_schema_from_node(node)
    return payload


def _ollama_vision_payload(
    _project_id: str,
    node: PipelineNodeRecord,
    ctx: UpstreamContext,
) -> dict[str, Any] | None:
    page = _page_from_upstream(ctx)
    if page is None:
        return None
    return {
        "page": page,
        "prompt": node.config.get(
            "prompt",
            "Describe this document page, including charts and tables.",
        ),
        "options": _ollama_options(node, default_model=DEFAULT_VISION_MODEL),
    }


def _ollama_vision_structured_payload(
    project_id: str,
    node: PipelineNodeRecord,
    ctx: UpstreamContext,
) -> dict[str, Any] | None:
    payload = _ollama_vision_payload(project_id, node, ctx)
    if payload is None:
        return None
    payload["json_schema"] = _json_schema_from_node(node)
    return payload


def _liquid_options(node: PipelineNodeRecord) -> dict[str, Any]:
    options: dict[str, Any] = {
        "model": DEFAULT_LIQUID_VISION_MODEL,
        "temperature": node.config.get("temperature", 0.1),
        "max_tokens": node.config.get("max_tokens", 1024),
    }
    system_prompt = node.config.get("system_prompt")
    if isinstance(system_prompt, str) and system_prompt.strip():
        options["system_prompt"] = system_prompt
    return options


def _liquid_vision_payload(
    _project_id: str,
    node: PipelineNodeRecord,
    ctx: UpstreamContext,
) -> dict[str, Any] | None:
    page = _page_from_upstream(ctx)
    if page is None:
        return None
    return {
        "page": page,
        "prompt": node.config.get(
            "prompt",
            "Read this document page accurately, preserving meaningful structure.",
        ),
        "options": _liquid_options(node),
    }


def _liquid_vision_structured_payload(
    project_id: str,
    node: PipelineNodeRecord,
    ctx: UpstreamContext,
) -> dict[str, Any] | None:
    payload = _liquid_vision_payload(project_id, node, ctx)
    if payload is None:
        return None
    payload["json_schema"] = _json_schema_from_node(node)
    return payload


def _reading_order_payload(_project_id: str, node: PipelineNodeRecord, ctx: UpstreamContext) -> dict[str, Any] | None:
    page = _page_from_upstream(ctx)
    regions = _regions_from_upstream(ctx)
    if page is None or not regions:
        return None
    return {
        "page": page,
        "regions": regions,
        "options": _options_from_params(node.config, ["iou_threshold"]),
    }


def _table_payload(_project_id: str, node: PipelineNodeRecord, ctx: UpstreamContext) -> dict[str, Any] | None:
    page = _page_from_upstream(ctx)
    if page is None:
        return None
    return {
        "page": page,
        "tables": _table_inputs_from_upstream(ctx),
        "options": _options_from_params(node.config, ["detect_boxes", "do_cell_matching"]),
    }


def _figures_payload(_project_id: str, _node: PipelineNodeRecord, ctx: UpstreamContext) -> dict[str, Any] | None:
    page = _page_from_upstream(ctx)
    if page is None:
        return None
    return {"page": page, "figures": _figure_inputs_from_upstream(ctx)}


def _picture_description_payload(_project_id: str, node: PipelineNodeRecord, ctx: UpstreamContext) -> dict[str, Any] | None:
    payload = _figures_payload(_project_id, node, ctx)
    if payload is None:
        return None
    if "preset" in node.config:
        payload["preset"] = node.config["preset"]
    return payload


def _formula_payload(_project_id: str, _node: PipelineNodeRecord, ctx: UpstreamContext) -> dict[str, Any] | None:
    page = _page_from_upstream(ctx)
    if page is None:
        return None
    return {"page": page, "formulas": _formula_inputs_from_upstream(ctx)}


def _code_formula_payload(_project_id: str, node: PipelineNodeRecord, ctx: UpstreamContext) -> dict[str, Any] | None:
    page = _page_from_upstream(ctx)
    if page is None:
        return None
    payload: dict[str, Any] = {"page": page, "regions": _regions_from_upstream(ctx)}
    if "preset" in node.config:
        payload["preset"] = node.config["preset"]
    return payload


def _extract_pages(result: BaseModel) -> NodeCachedOutput:
    raw = _model_dump(result)
    pages = raw.get("pages") if isinstance(raw.get("pages"), list) else []
    first = pages[0].get("page") if pages and isinstance(pages[0], dict) else None
    return NodeCachedOutput(
        kind="pages",
        raw=raw,
        preview={"pageCount": len(pages), "pageImage": first, "thumbnailBase64": first.get("image_base64") if isinstance(first, dict) else None},
    )


def _extract_page(result: BaseModel) -> NodeCachedOutput:
    raw = _model_dump(result)
    page_artifact = raw.get("page") if isinstance(raw.get("page"), dict) else {}
    page = page_artifact.get("page") if isinstance(page_artifact, dict) else None
    return NodeCachedOutput(
        kind="page",
        raw=raw,
        preview={"pageCount": 1, "pageImage": page, "thumbnailBase64": page.get("image_base64") if isinstance(page, dict) else None},
    )


def _extract_regions(result: BaseModel) -> NodeCachedOutput:
    raw = _model_dump(result)
    regions = raw.get("regions") if isinstance(raw.get("regions"), list) else []
    return NodeCachedOutput(kind="regions", raw=raw, preview={"itemCount": len(regions)})


def _extract_lines(result: BaseModel) -> NodeCachedOutput:
    raw = _model_dump(result)
    lines = raw.get("lines") if isinstance(raw.get("lines"), list) else []
    snippets = [line.get("text") for line in lines if isinstance(line, dict) and line.get("text")]
    return NodeCachedOutput(
        kind="lines",
        raw=raw,
        preview={"itemCount": len(lines), "textSnippets": snippets[:5]},
    )


def _extract_reading_order(result: BaseModel) -> NodeCachedOutput:
    raw = _model_dump(result)
    ordered = raw.get("reading_order", {}).get("ordered_ids", []) if isinstance(raw.get("reading_order"), dict) else []
    return NodeCachedOutput(kind="reading_order", raw=raw, preview={"itemCount": len(ordered)})


def _extract_tables(result: BaseModel) -> NodeCachedOutput:
    raw = _model_dump(result)
    tables = raw.get("tables") if isinstance(raw.get("tables"), list) else []
    return NodeCachedOutput(kind="tables", raw=raw, preview={"itemCount": len(tables)})


def _extract_figures(result: BaseModel) -> NodeCachedOutput:
    raw = _model_dump(result)
    figures = raw.get("figures") if isinstance(raw.get("figures"), list) else []
    return NodeCachedOutput(kind="figures", raw=raw, preview={"itemCount": len(figures)})


def _extract_formulas(result: BaseModel) -> NodeCachedOutput:
    raw = _model_dump(result)
    formulas = raw.get("formulas") if isinstance(raw.get("formulas"), list) else []
    return NodeCachedOutput(kind="formulas", raw=raw, preview={"itemCount": len(formulas)})


def _extract_document(result: BaseModel) -> NodeCachedOutput:
    raw = _model_dump(result)
    document = raw.get("document") or {}
    pages = document.get("pages") if isinstance(document, dict) and isinstance(document.get("pages"), list) else []
    preview: dict[str, Any] = {"pageCount": len(pages)}
    if raw.get("markdown"):
        preview["markdownPreview"] = raw["markdown"]
    if raw.get("json"):
        preview["jsonPreview"] = raw["json"]
    return NodeCachedOutput(kind="document", raw=raw, preview=preview)


def _extract_text(result: BaseModel) -> NodeCachedOutput:
    raw = _model_dump(result)
    text = raw.get("text") if isinstance(raw.get("text"), str) else ""
    return NodeCachedOutput(
        kind="text",
        raw=raw,
        preview={"textSnippets": [text[:500]] if text else [], "itemCount": 1 if text else 0},
    )


def _extract_json(result: BaseModel) -> NodeCachedOutput:
    raw = _model_dump(result)
    data = raw.get("data") if isinstance(raw.get("data"), dict) else {}
    return NodeCachedOutput(
        kind="json",
        raw=raw,
        preview={"jsonPreview": data, "itemCount": len(data)},
    )


MODEL_EXECUTION_SPECS: dict[str, tuple[type[BaseModel], PayloadBuilder, OutputExtractor]] = {
    "loader/pdf": (PdfLoaderInput, lambda project_id, node, ctx: _document_payload(project_id, node, ctx, default_format="pdf", option_keys=["dpi", "max_pages"]), _extract_pages),
    "loader/image": (ImageLoaderInput, lambda project_id, node, ctx: _document_payload(project_id, node, ctx, default_format="image"), _extract_pages),
    "loader/page-at": (PageAtInput, _pages_payload, _extract_page),
    "surya/layout": (SuryaLayoutInput, lambda project_id, node, ctx: _page_only_payload(project_id, node, ctx, option_keys=["confidence_threshold"]), _extract_regions),
    "docling/layout-heron": (DoclingLayoutInput, lambda project_id, node, ctx: _page_only_payload(project_id, node, ctx, option_keys=["keep_empty_clusters", "skip_cell_assignment"]), _extract_regions),
    "paddle/doclayout-s": (DocLayoutInput, lambda project_id, node, ctx: _page_only_payload(project_id, node, ctx, option_keys=["confidence_threshold"]), _extract_regions),
    "paddle/ocr-v6-small": (PaddleOcrInput, _paddle_ocr_payload, _extract_lines),
    "paddle/pp-structure": (PpStructureInput, lambda project_id, node, ctx: _page_only_payload(project_id, node, ctx, option_keys=["do_ocr"]), _extract_regions),
    "surya/text-detection": (TextDetectionInput, _page_only_payload, _extract_lines),
    "docling/ocr-auto": (OcrRecognitionInput, _text_recognition_payload, _extract_lines),
    "surya/text-recognition": (TextRecognitionInput, _text_recognition_payload, _extract_lines),
    "surya/reading-order": (ReadingOrderInput, _reading_order_payload, _extract_reading_order),
    "surya/table-recognition": (TableRecognitionInput, _table_payload, _extract_tables),
    "docling/tableformer-accurate": (TableStructureInput, _table_payload, _extract_tables),
    "docling/picture-classifier-v2.5": (FigureClassificationInput, _figures_payload, _extract_figures),
    "docling/picture-description-smolvlm": (PictureDescriptionInput, _picture_description_payload, _extract_lines),
    "surya/latex-ocr": (LatexOcrInput, _formula_payload, _extract_formulas),
    "docling/code-formula-v2": (CodeFormulaInput, _code_formula_payload, _extract_formulas),
    "docling/vlm-granite-docling": (VlmConvertInput, lambda project_id, node, ctx: _document_payload(project_id, node, ctx, default_format="pdf", option_keys=["preset", "engine", "export"]), _extract_document),
    "docling/convert-pipeline": (ConvertPipelineInput, lambda project_id, node, ctx: _document_payload(project_id, node, ctx, default_format="pdf", option_keys=["layout_model", "ocr_engine", "tableformer_mode", "enrich_pictures", "enrich_formulas"]), _extract_document),
    "ollama/text-prompt": (OllamaTextInput, _ollama_text_payload, _extract_text),
    "ollama/structured-extract": (OllamaStructuredInput, _ollama_structured_payload, _extract_json),
    "ollama/vision-prompt": (OllamaVisionInput, _ollama_vision_payload, _extract_text),
    "ollama/vision-structured-extract": (OllamaVisionStructuredInput, _ollama_vision_structured_payload, _extract_json),
    "liquid/vision-prompt": (LiquidVisionInput, _liquid_vision_payload, _extract_text),
    "liquid/vision-structured-extract": (LiquidVisionStructuredInput, _liquid_vision_structured_payload, _extract_json),
}


def build_model_input(
    *,
    project_id: str,
    node: PipelineNodeRecord,
    upstream: UpstreamContext,
) -> BaseModel:
    spec = MODEL_EXECUTION_SPECS.get(node.modelId)
    if spec is None:
        raise ValueError(f"Unsupported model for backend execution: {node.modelId}")
    input_schema, builder, _extractor = spec
    payload = builder(project_id, node, upstream)
    if payload is None:
        raise ValueError(f"Node {node.id} is not ready to run")
    return input_schema.model_validate(payload)


def extract_model_output(
    model_id: str,
    result: BaseModel,
    *,
    model_input: BaseModel | None = None,
) -> NodeCachedOutput:
    spec = MODEL_EXECUTION_SPECS.get(model_id)
    if spec is None:
        raise ValueError(f"Unsupported model for backend execution: {model_id}")
    _input_schema, _builder, extractor = spec
    output = extractor(result)
    page = getattr(model_input, "page", None)
    if isinstance(page, BaseModel):
        preview = dict(output.preview or {})
        preview.setdefault("pageImage", page.model_dump(mode="json", by_alias=True))
        output = output.model_copy(update={"preview": preview})
    return output
