from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.models.base import Device, ModelConfig


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

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def build_model_config(self, **overrides: object) -> ModelConfig:
        base = {
            "device": self.default_device,
            "model_cache_dir": self.model_cache_dir,
            "timeout_seconds": self.inference_timeout_seconds,
            "max_image_dimension": self.max_image_dimension,
        }
        base.update(overrides)
        return ModelConfig(**base)  # type: ignore[arg-type]


@lru_cache
def get_settings() -> Settings:
    return Settings()
