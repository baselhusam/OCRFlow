from pathlib import Path
from unittest.mock import patch

import pytest

from app.models.docling._converter import _source_to_path
from app.models.errors import ModelInferenceError
from app.schemas.artifacts import DocumentInput


def test_source_to_path_requires_project_id_for_asset_source():
    document = DocumentInput(source="asset:abc-123", format="pdf")

    with pytest.raises(ModelInferenceError, match="project_id is required"):
        _source_to_path(document)


def test_source_to_path_resolves_asset_source_to_temp_file(tmp_path: Path):
    document = DocumentInput(source="asset:abc-123", format="pdf")
    pdf_bytes = b"%PDF-1.4 test"

    with patch(
        "app.models.docling._converter.document_source_to_bytes",
        return_value=pdf_bytes,
    ) as resolve_bytes:
        path = _source_to_path(document, project_id="project-1")

    resolve_bytes.assert_called_once()
    assert path.is_file()
    assert path.read_bytes() == pdf_bytes
    assert path.suffix == ".pdf"
    path.unlink()
