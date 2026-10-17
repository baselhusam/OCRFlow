"""Turn Unlimited-OCR's grounded output into OCRFlow artifacts and markdown.

The model writes one block per layout element::

    <|det|>title [343, 185, 655, 208]<|/det|>Attention Is All You Need
    <|det|>table [212, 127, 785, 313]<|/det|><table>...</table>

Boxes are ``[x1, y1, x2, y2]`` on a 0–999 grid relative to the original page.
Tables are HTML, formulas are LaTeX in ``\\[ \\]`` / ``\\( \\)``, and multi-page
generations start every page with ``<PAGE>``. This module is pure Python so it
can be tested without MLX.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from html.parser import HTMLParser

from app.schemas.artifacts import (
    Figure,
    Formula,
    LayoutLabel,
    PageArtifact,
    ReadingOrder,
    Region,
    TableStructure,
    TextLine,
)

PAGE_MARKER = "<PAGE>"
_EOS_TOKENS = ("<｜end▁of▁sentence｜>", "<|end▁of▁sentence|>")
_COORD_MAX = 999.0

_DET_PATTERN = re.compile(
    r"<\|det\|>\s*([A-Za-z_]+)\s*\[((?:[^\[\]]|\[[^\[\]]*\])*)\]\s*<\|/det\|>"
)
_NUMBER = re.compile(r"-?\d+(?:\.\d+)?")
_DISPLAY_MATH = re.compile(r"(?<!\\)\\\[\s*(.+?)\s*(?<!\\)\\\]", re.DOTALL)
_INLINE_MATH = re.compile(r"(?<!\\)\\\(\s*(.+?)\s*(?<!\\)\\\)", re.DOTALL)

_LABELS: dict[str, LayoutLabel] = {
    "text": LayoutLabel.paragraph,
    "ref_text": LayoutLabel.paragraph,
    "aside_text": LayoutLabel.paragraph,
    "abstract": LayoutLabel.paragraph,
    "title": LayoutLabel.section_header,
    "doc_title": LayoutLabel.title,
    "header": LayoutLabel.page_header,
    "page_header": LayoutLabel.page_header,
    "footer": LayoutLabel.page_footer,
    "page_footer": LayoutLabel.page_footer,
    "page_number": LayoutLabel.page_footer,
    "page_footnote": LayoutLabel.footer,
    "footnote": LayoutLabel.footer,
    "table_footnote": LayoutLabel.footer,
    "image": LayoutLabel.picture,
    "figure": LayoutLabel.picture,
    "chart": LayoutLabel.picture,
    "seal": LayoutLabel.picture,
    "image_caption": LayoutLabel.caption,
    "figure_caption": LayoutLabel.caption,
    "table_caption": LayoutLabel.caption,
    "chart_caption": LayoutLabel.caption,
    "caption": LayoutLabel.caption,
    "table": LayoutLabel.table,
    "equation": LayoutLabel.formula,
    "interline_equation": LayoutLabel.formula,
    "formula": LayoutLabel.formula,
    "list": LayoutLabel.list,
    "list_item": LayoutLabel.list_item,
    "code": LayoutLabel.code,
    "algorithm": LayoutLabel.code,
}

#: Page furniture is kept as regions but left out of markdown by default.
_FURNITURE = frozenset({LayoutLabel.page_header, LayoutLabel.page_footer})


@dataclass(frozen=True)
class Block:
    provider_label: str
    bbox: list[float] | None
    content: str

    @property
    def label(self) -> LayoutLabel:
        return _LABELS.get(self.provider_label.lower(), LayoutLabel.other)


@dataclass
class ParsedPage:
    artifact: PageArtifact
    markdown: str
    blocks: list[Block] = field(default_factory=list)


def strip_special_tokens(text: str) -> str:
    for token in _EOS_TOKENS:
        text = text.replace(token, "")
    return text.strip()


def split_pages(text: str, expected: int) -> tuple[list[str], list[str]]:
    """Split a multi-page generation on ``<PAGE>`` into exactly ``expected`` pages.

    Returns the per-page texts plus warnings when the model emitted a different
    number of page markers than pages it was shown.
    """
    cleaned = strip_special_tokens(text)
    warnings: list[str] = []
    if PAGE_MARKER in cleaned:
        head, *pages = cleaned.split(PAGE_MARKER)
        if head.strip():
            pages = [head, *pages] if pages else [head]
    else:
        pages = [cleaned]

    if len(pages) < expected:
        warnings.append(
            f"model returned {len(pages)} page(s) for {expected} input page(s); "
            "missing pages are empty"
        )
        pages = pages + [""] * (expected - len(pages))
    elif len(pages) > expected:
        warnings.append(
            f"model returned {len(pages)} page(s) for {expected} input page(s); "
            "extra output was merged into the last page"
        )
        pages = pages[: expected - 1] + ["\n".join(pages[expected - 1 :])]
    return pages, warnings


def _parse_bbox(raw: str) -> list[float] | None:
    numbers = [float(value) for value in _NUMBER.findall(raw)]
    if len(numbers) < 4 or len(numbers) % 4:
        return None
    # Several boxes for one block: use their union.
    boxes = [numbers[i : i + 4] for i in range(0, len(numbers), 4)]
    x0 = min(box[0] for box in boxes)
    y0 = min(box[1] for box in boxes)
    x1 = max(box[2] for box in boxes)
    y1 = max(box[3] for box in boxes)
    bbox = [max(0.0, min(_COORD_MAX, value)) / _COORD_MAX for value in (x0, y0, x1, y1)]
    if bbox[2] <= bbox[0] or bbox[3] <= bbox[1]:
        return None
    return bbox


def parse_blocks(page_text: str) -> list[Block]:
    text = strip_special_tokens(page_text)
    matches = list(_DET_PATTERN.finditer(text))
    blocks: list[Block] = []
    if not matches:
        return [Block("text", None, text)] if text else []

    lead = text[: matches[0].start()].strip()
    if lead:
        blocks.append(Block("text", None, lead))
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        content = text[match.end() : end].strip("\n").rstrip()
        blocks.append(Block(match.group(1), _parse_bbox(match.group(2)), content))
    return blocks


def _strip_math_delimiters(latex: str) -> str:
    value = latex.strip()
    for opening, closing in (("\\[", "\\]"), ("$$", "$$"), ("\\(", "\\)")):
        if value.startswith(opening) and value.endswith(closing) and len(value) >= 4:
            return value[len(opening) : -len(closing)].strip()
    return value


def convert_math(text: str) -> str:
    """Rewrite ``\\[ \\]`` / ``\\( \\)`` delimiters as markdown ``$$`` / ``$``."""
    text = _DISPLAY_MATH.sub(lambda m: f"$$\n{m.group(1)}\n$$", text)
    return _INLINE_MATH.sub(lambda m: f"${m.group(1)}$", text)


class _TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[tuple[str, int, int]]] = []
        self._row: list[tuple[str, int, int]] | None = None
        self._cell: list[str] | None = None
        self._span = (1, 1)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "tr":
            self._row = []
        elif tag in ("td", "th"):
            values = dict(attrs)
            self._cell = []
            self._span = (_span(values.get("rowspan")), _span(values.get("colspan")))
        elif tag == "br" and self._cell is not None:
            self._cell.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if tag in ("td", "th") and self._cell is not None:
            if self._row is None:
                self._row = []
            self._row.append((" ".join("".join(self._cell).split()), *self._span))
            self._cell = None
        elif tag == "tr" and self._row is not None:
            self.rows.append(self._row)
            self._row = None

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell.append(data)


def _span(value: str | None) -> int:
    try:
        return max(1, int(value or 1))
    except ValueError:
        return 1


def table_grid(html: str) -> list[list[str]]:
    """Expand an HTML table (with row/col spans) into a rectangular text grid."""
    parser = _TableParser()
    parser.feed(html)
    parser.close()
    grid: dict[tuple[int, int], str] = {}
    for row_index, row in enumerate(parser.rows):
        col = 0
        for text, row_span, col_span in row:
            while (row_index, col) in grid:
                col += 1
            for dr in range(row_span):
                for dc in range(col_span):
                    grid[(row_index + dr, col + dc)] = text if dr == dc == 0 else ""
            col += col_span
    if not grid:
        return []
    rows = max(r for r, _ in grid) + 1
    cols = max(c for _, c in grid) + 1
    return [[grid.get((r, c), "") for c in range(cols)] for r in range(rows)]


def table_to_markdown(html: str) -> str:
    """Render an HTML table as a GFM pipe table; fall back to the HTML."""
    grid = table_grid(html)
    if not grid:
        return html

    def cell(value: str) -> str:
        return convert_math(value).replace("|", "\\|")

    header, *body = grid
    lines = [
        "| " + " | ".join(cell(value) for value in header) + " |",
        "| " + " | ".join("---" for _ in header) + " |",
    ]
    lines.extend("| " + " | ".join(cell(value) for value in row) + " |" for row in body)
    return "\n".join(lines)


def _block_markdown(block: Block) -> str | None:
    text = block.content.strip()
    if not text:
        return None
    label = block.label
    if label == LayoutLabel.table:
        return table_to_markdown(text)
    if label == LayoutLabel.formula:
        return f"$$\n{_strip_math_delimiters(text)}\n$$"
    if label in (LayoutLabel.section_header, LayoutLabel.title):
        prefix = "#" if label == LayoutLabel.title else "##"
        return f"{prefix} {' '.join(convert_math(text).split())}"
    if label == LayoutLabel.code:
        return f"```\n{text}\n```"
    # Line breaks inside a block are meaningful (author/affiliation blocks,
    # addresses); keep them as markdown hard breaks instead of letting them fold.
    return "  \n".join(line.rstrip() for line in convert_math(text).splitlines())


def parse_page(page_text: str, *, page_index: int, include_furniture: bool = False) -> ParsedPage:
    blocks = parse_blocks(page_text)
    regions: list[Region] = []
    lines: list[TextLine] = []
    tables: list[TableStructure] = []
    formulas: list[Formula] = []
    figures: list[Figure] = []
    order: list[str] = []
    captionable: dict[int, Figure | TableStructure] = {}

    for index, block in enumerate(blocks):
        block_id = f"p{page_index}-b{index}"
        label = block.label
        text = block.content.strip()
        if block.bbox is None:
            continue
        regions.append(
            Region(
                id=block_id,
                label=label,
                bbox=block.bbox,
                confidence=1.0,
                provider_label=block.provider_label,
            )
        )
        order.append(block_id)
        if label == LayoutLabel.table:
            grid = table_grid(text) if text else []
            table = TableStructure(
                id=block_id,
                bbox=block.bbox,
                rows=len(grid),
                cols=len(grid[0]) if grid else 0,
                html=text or None,
            )
            tables.append(table)
            captionable[index] = table
        elif label == LayoutLabel.formula:
            if text:
                formulas.append(Formula(id=block_id, bbox=block.bbox, latex=_strip_math_delimiters(text)))
        elif label == LayoutLabel.picture:
            figure = Figure(id=block_id, bbox=block.bbox, category=block.provider_label)
            figures.append(figure)
            captionable[index] = figure
        elif text:
            lines.append(TextLine(id=block_id, bbox=block.bbox, text=text))

    # A caption directly after (or before) a figure describes it.
    for index, block in enumerate(blocks):
        if block.label != LayoutLabel.caption or not block.content.strip():
            continue
        target = captionable.get(index - 1) or captionable.get(index + 1)
        if isinstance(target, Figure) and target.caption is None:
            target.caption = block.content.strip()

    parts = [
        rendered
        for block in blocks
        if include_furniture or block.label not in _FURNITURE
        if (rendered := _block_markdown(block))
    ]
    artifact = PageArtifact(
        page_index=page_index,
        regions=regions,
        lines=lines,
        tables=tables,
        formulas=formulas,
        figures=figures,
        reading_order=ReadingOrder(ordered_ids=order) if order else None,
    )
    return ParsedPage(artifact=artifact, markdown="\n\n".join(parts), blocks=blocks)


def join_page_markdown(pages: list[ParsedPage]) -> str:
    """Join pages with a thematic break; ``document.pages`` keeps exact boundaries."""
    return "\n\n---\n\n".join(page.markdown for page in pages if page.markdown.strip())
