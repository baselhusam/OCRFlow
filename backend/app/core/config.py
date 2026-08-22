from enum import StrEnum
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.models.base import Device, ModelConfig
from app.models.device import resolve_device


class RunnerMode(StrEnum):
    """How the process resolves model runners.

    * ``local`` — models load and run in-process (single-image default).
    * ``remote`` — the gateway forwards inference to per-provider services.
    """

    local = "local"
    remote = "remote"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    database_url: str = "postgresql+asyncpg://ocrflow:ocrflow_dev@localhost:5432/ocrflow"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 30
    cors_origins: str = "http://localhost:3000"
    jwt_algorithm: str = "HS256"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"
    model_cache_dir: Path = Field(
        default_factory=lambda: Path.home() / ".cache" / "ocrflow",
        validation_alias="OCRFLOW_MODEL_CACHE",
    )
    default_device: Device = Field(default=Device.cpu, validation_alias="OCRFLOW_DEFAULT_DEVICE")
    inference_timeout_seconds: float = Field(
        default=120.0, validation_alias="OCRFLOW_INFERENCE_TIMEOUT"
    )
    document_conversion_timeout_seconds: float = Field(
        default=600.0,
        validation_alias="OCRFLOW_DOCUMENT_CONVERSION_TIMEOUT",
    )
    max_image_dimension: int = Field(default=4096, validation_alias="OCRFLOW_MAX_IMAGE_DIMENSION")
    upload_dir: Path = Field(
        default_factory=lambda: Path.home() / ".cache" / "ocrflow" / "uploads",
        validation_alias="OCRFLOW_UPLOAD_DIR",
    )
    admin_email: str = Field(default="baselmathar@gmail.com", validation_alias="ADMIN_EMAIL")
    admin_password: str = Field(default="", validation_alias="ADMIN_PASSWORD")
    admin_full_name: str = Field(default="Basel Mathar", validation_alias="ADMIN_FULL_NAME")

    # --- Containerized model serving ---------------------------------------
    # ``local`` keeps today's in-process behavior. ``remote`` makes the API act
    # as a thin gateway that forwards inference to per-provider services.
    runner_mode: RunnerMode = Field(
        default=RunnerMode.local, validation_alias="OCRFLOW_RUNNER_MODE"
    )
    # Base URLs of the per-provider services (used only in remote mode).
    # Defaults target the published localhost ports for host-gateway + Docker
    # OCR microservices. Full-stack compose overrides these to service DNS names.
    docling_service_url: str = Field(
        default="http://127.0.0.1:8102",
        validation_alias="OCRFLOW_DOCLING_SERVICE_URL",
    )
    surya_service_url: str = Field(
        default="http://127.0.0.1:8101",
        validation_alias="OCRFLOW_SURYA_SERVICE_URL",
    )
    paddle_service_url: str = Field(
        default="http://127.0.0.1:8103",
        validation_alias="OCRFLOW_PADDLE_SERVICE_URL",
    )
    ollama_base_url: str = Field(
        default="http://127.0.0.1:11434",
        validation_alias="OCRFLOW_OLLAMA_BASE_URL",
    )
    # Which provider this process serves when running as an internal service
    # image (unset for the gateway). Purely informational / for health output.
    service_provider: str = Field(
        default="", validation_alias="OCRFLOW_SERVICE_PROVIDER"
    )
    # Timeout for the gateway->service health probe used by /models/runtime.
    runtime_health_timeout_seconds: float = Field(
        default=2.0, validation_alias="OCRFLOW_RUNTIME_HEALTH_TIMEOUT"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def provider_service_url(self, provider: str) -> str | None:
        """Return the configured base URL for a remote provider, if any."""
        return {
            "docling": self.docling_service_url,
            "surya": self.surya_service_url,
            "paddle": self.paddle_service_url,
            "ollama": self.ollama_base_url,
        }.get(provider)

    def build_model_config(self, **overrides: object) -> ModelConfig:
        device = overrides.pop("device", self.default_device)
        if not isinstance(device, Device):
            device = Device(device)
        base = {
            "device": resolve_device(device),
            "model_cache_dir": self.model_cache_dir,
            "timeout_seconds": self.inference_timeout_seconds,
            "max_image_dimension": self.max_image_dimension,
        }
        base.update(overrides)
        return ModelConfig(**base)  # type: ignore[arg-type]


@lru_cache
def get_settings() -> Settings:
    return Settings()
