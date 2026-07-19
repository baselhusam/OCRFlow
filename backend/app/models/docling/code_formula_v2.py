from __future__ import annotations

import time

from docling.datamodel.base_models import ItemAndImageEnrichmentElement
from docling.models.stages.code_formula.code_formula_model import (
    CodeFormulaModel,
    CodeFormulaModelOptions,
)
from docling_core.types.doc import CodeItem, DocItemLabel, FormulaItem, TextItem

from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.docling._accelerator import artifacts_path, build_accelerator_options
from app.models.docling._common import page_image_to_pil, run_sync
from app.models.docling._conversion import build_conversion_page
from app.models.errors import ModelLoadError
from app.schemas.artifacts import Formula, LayoutLabel, Region
from app.schemas.models.docling._meta import InferenceMeta
from app.schemas.models.docling.code_formula import CodeFormulaInput, CodeFormulaOutput


class DoclingCodeFormulaV2Runner(BaseRunner[CodeFormulaInput, CodeFormulaOutput]):
    model_id = "docling/code-formula-v2"

    def __init__(self) -> None:
        super().__init__()
        self._model: CodeFormulaModel | None = None

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            options = CodeFormulaModelOptions()
            self._model = CodeFormulaModel(
                enabled=True,
                artifacts_path=artifacts_path(config),
                options=options,
                accelerator_options=build_accelerator_options(config),
            )
        except Exception as exc:
            raise ModelLoadError(f"Failed to load docling/code-formula-v2: {exc}") from exc

    async def _run_impl(self, input: CodeFormulaInput) -> CodeFormulaOutput:
        if self._model is None:
            raise ModelLoadError("Code/formula model not loaded")

        start = time.perf_counter()
        pil = await page_image_to_pil(input.page)
        conv_res, page = await build_conversion_page(input.page, pil)
        doc = conv_res.document

        elements = []
        for index, region in enumerate(input.regions or []):
            x0, y0, x1, y1 = region.bbox
            crop = pil.crop(
                (
                    int(x0 * pil.width),
                    int(y0 * pil.height),
                    int(x1 * pil.width),
                    int(y1 * pil.height),
                )
            )
            if region.label == LayoutLabel.code:
                item = CodeItem(label=DocItemLabel.CODE, text="")
            elif region.label == LayoutLabel.formula:
                item = FormulaItem(label=DocItemLabel.FORMULA, text="")
            else:
                item = TextItem(label=DocItemLabel.FORMULA, text="")
            elements.append(ItemAndImageEnrichmentElement(item=item, image=crop))

        if not elements:
            crop = pil
            elements = [
                ItemAndImageEnrichmentElement(
                    item=FormulaItem(label=DocItemLabel.FORMULA, text=""),
                    image=crop,
                )
            ]

        def _run():
            list(self._model(doc, elements))
            return elements

        enriched = await run_sync(_run)
        formulas: list[Formula] = []
        code_regions: list[Region] = []
        for index, element in enumerate(enriched):
            item = element.item
            text = getattr(item, "text", "") or ""
            region = (input.regions[index] if index < len(input.regions) else None)
            bbox = region.bbox if region else [0.0, 0.0, 1.0, 1.0]
            if isinstance(item, CodeItem):
                code_regions.append(
                    Region(
                        id=region.id if region else f"c{index + 1}",
                        label=LayoutLabel.code,
                        bbox=bbox,
                        confidence=1.0,
                    )
                )
            else:
                formulas.append(
                    Formula(
                        id=region.id if region else f"f{index + 1}",
                        bbox=bbox,
                        latex=text,
                        inline=True,
                    )
                )

        latency_ms = (time.perf_counter() - start) * 1000
        return CodeFormulaOutput(
            page_index=input.page.page_index,
            formulas=formulas,
            regions=code_regions,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )

    async def _unload_impl(self) -> None:
        self._model = None
