import base64
import io
from pathlib import Path

from PIL import Image, ImageDraw


def _make_document_page(path: Path, *, with_table: bool = False) -> None:
    image = Image.new("RGB", (800, 1000), color="white")
    draw = ImageDraw.Draw(image)
    draw.text((60, 40), "Sample Academic Document", fill="black")
    draw.text((60, 100), "This is a paragraph of body text for layout detection.", fill="black")
    if with_table:
        draw.rectangle((60, 300, 740, 600), outline="black", width=2)
        draw.rectangle((60, 650, 400, 900), outline="black", width=2)
        draw.text((80, 670), "Figure 1", fill="black")
    image.save(path, format="PNG")


FIXTURE_DIR = Path(__file__).resolve().parent


def ensure_fixtures() -> None:
    _make_document_page(FIXTURE_DIR / "academic_single_column.png", with_table=False)
    _make_document_page(FIXTURE_DIR / "table_and_figure.png", with_table=True)


if __name__ == "__main__":
    ensure_fixtures()
