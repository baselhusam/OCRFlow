"""HTTP error mapping for model API routes."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.models.errors import ModelInferenceError, ModelLoadError, ModelValidationError
from app.models.registry import ModelNotFoundError


def register_model_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ModelNotFoundError)
    async def model_not_found_handler(_: Request, exc: ModelNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={"detail": str(exc), "error_code": "model_not_found"},
        )

    @app.exception_handler(ModelLoadError)
    async def model_load_handler(_: Request, exc: ModelLoadError) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content={"detail": str(exc), "error_code": "model_load"},
        )

    @app.exception_handler(ModelInferenceError)
    async def model_inference_handler(_: Request, exc: ModelInferenceError) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content={"detail": str(exc), "error_code": "model_inference"},
        )

    @app.exception_handler(ModelValidationError)
    async def model_validation_handler(_: Request, exc: ModelValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"detail": str(exc), "error_code": "model_validation"},
        )
