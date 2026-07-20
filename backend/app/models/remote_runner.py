"""Runner that forwards inference to a per-provider service over HTTP.

Used by the gateway process when ``OCRFLOW_RUNNER_MODE=remote``. It implements
the same :class:`~app.models.base_runner.BaseRunner` contract as the in-process
runners, so every call site (model endpoints and pipeline execution) is
unchanged. Inference is POSTed to the provider service's internal endpoint and
the JSON response is parsed back into the model's typed output schema.
"""

from __future__ import annotations

import logging

import httpx
from pydantic import BaseModel, ValidationError

from app.models.base import ModelConfig, ModelHealth
from app.models.base_runner import BaseRunner
from app.models.errors import (
    ModelInferenceError,
    ModelLoadError,
    ModelValidationError,
)
from app.models.registry import ModelNotFoundError
from app.models.servable import ServableModel

logger = logging.getLogger(__name__)

# Path prefix the internal provider service exposes (see internal_service.app).
INTERNAL_INFER_PATH = "/internal/models"

# Extra headroom over the logical inference timeout so the HTTP read does not
# abort a response the service is still legitimately producing.
_HTTP_TIMEOUT_BUFFER_SECONDS = 30.0


class RemoteModelRunner(BaseRunner[BaseModel, BaseModel]):
    """Forwards a single model's inference to its provider service."""

    def __init__(self, servable: ServableModel, service_url: str) -> None:
        super().__init__()
        self.model_id = servable.model_id
        self._servable = servable
        self._service_url = service_url.rstrip("/")

    async def _load_impl(self, config: ModelConfig) -> None:
        # Nothing to load locally — the service lazy-loads on first request.
        return None

    async def _unload_impl(self) -> None:
        return None

    @property
    def _infer_url(self) -> str:
        return f"{self._service_url}{INTERNAL_INFER_PATH}/{self.model_id}"

    def _http_timeout(self) -> float:
        base = self._config.timeout_seconds if self._config else 120.0
        return base + _HTTP_TIMEOUT_BUFFER_SECONDS

    def _new_client(self) -> httpx.AsyncClient:
        """Build the HTTP client. Overridable in tests to inject a transport."""
        return httpx.AsyncClient(timeout=self._http_timeout())

    async def _run_impl(self, input: BaseModel) -> BaseModel:
        payload = input.model_dump(mode="json", by_alias=True)
        try:
            async with self._new_client() as client:
                response = await client.post(self._infer_url, json=payload)
        except httpx.HTTPError as exc:
            raise ModelLoadError(
                f"Cannot reach {self._servable.provider} service for "
                f"{self.model_id} at {self._service_url}: {exc}"
            ) from exc

        if response.is_success:
            return self._parse_output(response)

        self._raise_for_status(response)

    def _parse_output(self, response: httpx.Response) -> BaseModel:
        try:
            body = response.json()
        except ValueError as exc:
            raise ModelInferenceError(
                f"{self.model_id} service returned a non-JSON response"
            ) from exc
        try:
            return self._servable.output_schema.model_validate(body)
        except ValidationError as exc:
            raise ModelValidationError(
                f"{self.model_id} service returned an invalid output payload: {exc}"
            ) from exc

    def _raise_for_status(self, response: httpx.Response) -> None:
        detail, error_code = _extract_error(response)
        message = f"{self.model_id} service error ({response.status_code}): {detail}"
        if response.status_code == 404 or error_code == "model_not_found":
            raise ModelNotFoundError(message)
        if error_code == "model_validation" or response.status_code == 422:
            raise ModelValidationError(message)
        if error_code == "model_load":
            raise ModelLoadError(message)
        # Default (including 503 model_inference / unexpected 5xx).
        raise ModelInferenceError(message)

    async def health(self) -> ModelHealth:
        url = f"{self._infer_url}/health"
        try:
            async with self._new_client() as client:
                response = await client.get(url)
            if response.is_success:
                return ModelHealth.model_validate(response.json())
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning(
                "remote health probe failed",
                extra={"model_id": self.model_id, "error": str(exc)},
            )
        return ModelHealth(
            model_id=self.model_id,
            loaded=False,
            message=f"{self._servable.provider} service unreachable",
        )


def _extract_error(response: httpx.Response) -> tuple[str, str | None]:
    try:
        body = response.json()
    except ValueError:
        return response.text or "unknown error", None
    if isinstance(body, dict):
        detail = body.get("detail")
        error_code = body.get("error_code")
        detail_str = detail if isinstance(detail, str) else str(detail)
        return detail_str, error_code if isinstance(error_code, str) else None
    return str(body), None
