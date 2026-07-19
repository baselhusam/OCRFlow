"""Page selection bridge runner."""

from __future__ import annotations

import time

from app.models.loader._base import LoaderRunner
from app.models.loader.page_at_validate import validate_page_at_input
from app.schemas.models.docling._meta import InferenceMeta
from app.schemas.models.loader.page_at import PageAtInput, PageAtOutput


class PageAtRunner(LoaderRunner[PageAtInput, PageAtOutput]):
    model_id = "loader/page-at"

    async def _run_impl(self, input: PageAtInput) -> PageAtOutput:
        validate_page_at_input(input)
        start = time.perf_counter()
        page = input.pages[input.options.page_index]
        latency_ms = (time.perf_counter() - start) * 1000

        return PageAtOutput(
            page=page,
            meta=InferenceMeta(model_id=self.model_id, latency_ms=round(latency_ms, 2)),
        )
