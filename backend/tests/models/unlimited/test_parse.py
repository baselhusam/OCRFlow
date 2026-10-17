"""Unlimited-OCR grounded output → OCRFlow artifacts and markdown."""

from __future__ import annotations

import pytest

from app.models.unlimited._parse import (
    convert_math,
    join_page_markdown,
    parse_blocks,
    parse_page,
    split_pages,
    table_grid,
    table_to_markdown,
)
from app.schemas.artifacts import LayoutLabel

PAGE = """<|det|>header [72, 38, 252, 52]<|/det|>Running header
<|det|>title [343, 185, 655, 208]<|/det|>3.2 Scaled Attention
<|det|>text [171, 464, 825, 520]<|/det|>Keys of dimension \\( d_k \\) and values.
<|det|>equation [355, 585, 825, 620]<|/det|>\\[
\\operatorname{Attention}(Q, K, V) \\tag{1}
\\]
<|det|>image [239, 88, 440, 282]<|/det|>
<|det|>image_caption [171, 343, 825, 374]<|/det|>Figure 2: Attention heads.
<|det|>table [212, 127, 785, 313]<|/det|><table><tr><td rowspan="2">Model</td><td colspan="2">BLEU</td></tr><tr><td>EN-DE</td><td>EN-FR</td></tr><tr><td>Big | wide</td><td>28.4</td><td>41.8</td></tr></table>
<|det|>list [143, 199, 882, 237]<|/det|>
<|det|>page_number [493, 923, 505, 935]<|/det|>4<｜end▁of▁sentence｜>"""


def test_blocks_keep_order_labels_and_normalized_boxes():
    blocks = parse_blocks(PAGE)

    assert [block.provider_label for block in blocks] == [
        "header", "title", "text", "equation", "image",
        "image_caption", "table", "list", "page_number",
    ]
    assert blocks[1].bbox == pytest.approx([343 / 999, 185 / 999, 655 / 999, 208 / 999])
    assert blocks[1].label == LayoutLabel.section_header
    assert blocks[-1].content == "4"  # end-of-sentence token stripped


def test_unboxed_and_degenerate_blocks():
    blocks = parse_blocks("Lead text\n<|det|>text [10, 10, 10, 20]<|/det|>flat box")

    assert blocks[0].provider_label == "text" and blocks[0].bbox is None
    assert blocks[1].bbox is None  # zero-width box is dropped, text kept


def test_multiple_boxes_for_one_block_use_their_union():
    [block] = parse_blocks("<|det|>text [[0, 0, 100, 100], [50, 50, 999, 500]]<|/det|>x")

    assert block.bbox == pytest.approx([0.0, 0.0, 1.0, 500 / 999])


def test_page_artifact_routes_blocks_to_typed_collections():
    page = parse_page(PAGE, page_index=3)
    artifact = page.artifact

    assert artifact.page_index == 3
    assert len(artifact.regions) == 9
    assert artifact.reading_order is not None
    assert artifact.reading_order.ordered_ids[0] == "p3-b0"
    assert [line.text for line in artifact.lines] == [
        "Running header",
        "3.2 Scaled Attention",
        "Keys of dimension \\( d_k \\) and values.",
        "Figure 2: Attention heads.",
        "4",
    ]
    assert artifact.formulas[0].latex == "\\operatorname{Attention}(Q, K, V) \\tag{1}"
    [table] = artifact.tables
    assert (table.rows, table.cols) == (3, 3)
    assert table.html is not None and table.html.startswith("<table>")
    [figure] = artifact.figures
    assert figure.caption == "Figure 2: Attention heads."


def test_markdown_renders_headings_math_tables_and_skips_furniture():
    markdown = parse_page(PAGE, page_index=0).markdown

    assert "Running header" not in markdown
    assert "\n4" not in markdown
    assert "## 3.2 Scaled Attention" in markdown
    assert "Keys of dimension $d_k$ and values." in markdown
    assert "$$\n\\operatorname{Attention}(Q, K, V) \\tag{1}\n$$" in markdown
    assert "| Model | BLEU |  |" in markdown
    assert "| Big \\| wide | 28.4 | 41.8 |" in markdown


def test_markdown_can_keep_page_furniture():
    markdown = parse_page(PAGE, page_index=0, include_furniture=True).markdown

    assert markdown.startswith("Running header")
    assert markdown.endswith("4")


def test_table_grid_expands_row_and_col_spans():
    grid = table_grid(
        '<table><tr><td rowspan="2">A</td><td colspan="2">B</td></tr>'
        "<tr><td>c</td><td>d</td></tr></table>"
    )

    assert grid == [["A", "B", ""], ["", "c", "d"]]


def test_unparseable_table_falls_back_to_html():
    assert table_to_markdown("<div>not a table</div>") == "<div>not a table</div>"


def test_convert_math_leaves_escaped_brackets_alone():
    assert convert_math("x \\( a^2 \\) y") == "x $a^2$ y"
    assert convert_math("\\[ E=mc^2 \\]") == "$$\nE=mc^2\n$$"
    assert convert_math("a \\\\[2pt] b") == "a \\\\[2pt] b"


def test_split_pages_matches_expected_page_count():
    pages, warnings = split_pages("<PAGE>one<PAGE>two<PAGE>three", 3)
    assert pages == ["one", "two", "three"] and warnings == []

    pages, warnings = split_pages("<PAGE>one<PAGE>two", 3)
    assert pages == ["one", "two", ""] and "missing pages" in warnings[0]

    pages, warnings = split_pages("<PAGE>a<PAGE>b<PAGE>c", 2)
    assert pages == ["a", "b\nc"] and "merged" in warnings[0]

    pages, _ = split_pages("no markers at all", 1)
    assert pages == ["no markers at all"]


def test_join_separates_pages_with_a_rule_and_skips_empty_pages():
    first = parse_page("<|det|>text [0, 0, 999, 100]<|/det|>alpha", page_index=0)
    blank = parse_page("", page_index=1)
    third = parse_page("<|det|>text [0, 0, 999, 100]<|/det|>beta", page_index=2)

    assert join_page_markdown([first]) == "alpha"
    assert join_page_markdown([first, blank, third]) == "alpha\n\n---\n\nbeta"


def test_line_breaks_inside_a_block_become_hard_breaks():
    page = parse_page(
        "<|det|>text [0, 0, 999, 100]<|/det|>Ashish Vaswani\nGoogle Brain\navaswani@google.com",
        page_index=0,
    )

    assert page.markdown == "Ashish Vaswani  \nGoogle Brain  \navaswani@google.com"
