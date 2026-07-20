"""Generate PaddleOCR golden fixtures (PIL-drawn document pages).

Run: python tests/fixtures/paddle/generate_fixtures.py
Produces an input.png in each task fixture directory. Expected JSON is committed
alongside and refined once real GPU smoke output is available.
"""

from pathlib import Path

from PIL import Image, ImageDraw

FIXTURE_DIR = Path(__file__).resolve().parent
TASKS = ("doclayout-s", "ocr-v6-small", "pp-structure")


def _make_page(path: Path, *, with_table: bool) -> None:
    image = Image.new("RGB", (800, 1000), color="white")
    draw = ImageDraw.Draw(image)
    draw.text((60, 40), "PaddleOCR Sample Document", fill="black")
    draw.text((60, 100), "A paragraph of body text for detection and recognition.", fill="black")
    if with_table:
        draw.rectangle((60, 300, 740, 600), outline="black", width=2)
        draw.line((60, 450, 740, 450), fill="black", width=1)
        draw.line((400, 300, 400, 600), fill="black", width=1)
        draw.text((80, 320), "Header A", fill="black")
        draw.text((420, 320), "Header B", fill="black")
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG")


def ensure_fixtures() -> None:
    for task in TASKS:
        _make_page(FIXTURE_DIR / task / "input.png", with_table=(task == "pp-structure"))


if __name__ == "__main__":
    ensure_fixtures()
