#!/usr/bin/env python3
"""CLI smoke script for loader/pdf."""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import sys
from pathlib import Path

from app.core.config import get_settings
from app.models.loader.pdf import PdfLoaderRunner
from app.schemas.artifacts import DocumentInput
from app.schemas.models.loader.pdf import PdfLoaderInput, PdfLoaderOptions


async def main() -> int:
    parser = argparse.ArgumentParser(description="Run loader/pdf on a PDF file")
    parser.add_argument("--pdf", required=True, type=Path, help="Path to input PDF")
    parser.add_argument("--dpi", type=int, default=200)
    args = parser.parse_args()

    if not args.pdf.exists():
        print(f"PDF not found: {args.pdf}", file=sys.stderr)
        return 1

    pdf_bytes = args.pdf.read_bytes()
    settings = get_settings()
    config = settings.build_model_config()
    runner = PdfLoaderRunner()
    await runner.load(config)
    try:
        output = await runner.run(
            PdfLoaderInput(
                document=DocumentInput(
                    source=base64.b64encode(pdf_bytes).decode("ascii"),
                    format="pdf",
                ),
                options=PdfLoaderOptions(dpi=args.dpi),
            )
        )
        print(json.dumps({"page_count": len(output.pages), "meta": output.meta.model_dump()}, indent=2))
    finally:
        await runner.unload()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
