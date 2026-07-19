"""Parse JSON or multipart form payloads for model routes."""

from __future__ import annotations

import base64
import json
from typing import TypeVar

from fastapi import File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, ValidationError

from app.models.docling._common import decode_upload_to_page_image
from app.schemas.artifacts import PageImage

T = TypeVar("T", bound=BaseModel)


async def _read_multipart_file(request: Request) -> tuple[bytes, UploadFile | None]:
    form = await request.form()
    file = form.get("file")
    if file is None or not hasattr(file, "read"):
        raise HTTPException(status_code=400, detail="multipart requests require a file field")
    upload = file  # type: ignore[assignment]
    file_bytes = await upload.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    return file_bytes, upload


async def parse_json_or_multipart(
    request: Request,
    schema: type[T],
    *,
    file: UploadFile | None = File(default=None),
    page_index: int = Form(default=0),
    options: str | None = Form(default=None),
) -> T:
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        file_field = form.get("file")
        if file_field is None or not hasattr(file_field, "read"):
            raise HTTPException(status_code=400, detail="multipart requests require a file field")
        upload = file_field  # type: ignore[assignment]
        file_bytes = await upload.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        page = decode_upload_to_page_image(page_index=page_index, image_bytes=file_bytes)
        payload: dict = {"page": page.model_dump()}
        form_options = form.get("options")
        options_value = form_options if isinstance(form_options, str) else options
        if options_value:
            try:
                payload["options"] = json.loads(options_value)
            except json.JSONDecodeError as exc:
                raise HTTPException(status_code=400, detail="options must be valid JSON") from exc
        try:
            return schema.model_validate(payload)
        except ValidationError as exc:
            raise HTTPException(status_code=422, detail=exc.errors()) from exc

    try:
        body = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Request body must be JSON or multipart") from exc

    try:
        return schema.model_validate(body)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc


async def parse_json_or_document_multipart(
    request: Request,
    schema: type[T],
) -> T:
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        file_field = form.get("file")
        if file_field is None or not hasattr(file_field, "read"):
            raise HTTPException(status_code=400, detail="multipart requests require a file field")
        upload = file_field  # type: ignore[assignment]
        file_bytes = await upload.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        doc_format = form.get("format")
        if not isinstance(doc_format, str) or doc_format not in {"pdf", "image", "images"}:
            raise HTTPException(
                status_code=400,
                detail="multipart document requests require format field (pdf, image, or images)",
            )

        source_b64 = base64.b64encode(file_bytes).decode("ascii")
        payload: dict = {
            "document": {
                "source": source_b64,
                "format": doc_format,
            }
        }
        options_value = form.get("options")
        if isinstance(options_value, str) and options_value:
            try:
                payload["options"] = json.loads(options_value)
            except json.JSONDecodeError as exc:
                raise HTTPException(status_code=400, detail="options must be valid JSON") from exc
        try:
            return schema.model_validate(payload)
        except ValidationError as exc:
            raise HTTPException(status_code=422, detail=exc.errors()) from exc

    try:
        body = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Request body must be JSON or multipart") from exc

    try:
        return schema.model_validate(body)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc


def page_from_multipart_only(
    *,
    file: UploadFile,
    page_index: int = 0,
) -> PageImage:
    if file is None:
        raise HTTPException(status_code=400, detail="file is required")
    return decode_upload_to_page_image(page_index=page_index, image_bytes=file.file.read())
