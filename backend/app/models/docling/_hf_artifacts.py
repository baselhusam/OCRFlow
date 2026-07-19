"""Download HuggingFace weights into OCRFLOW_MODEL_CACHE when missing."""

from __future__ import annotations

from pathlib import Path

from docling.datamodel.stage_model_specs import VlmModelSpec
from docling.models.utils.hf_model_download import download_hf_model

from app.models.base import ModelConfig
from app.models.docling._accelerator import artifacts_path


def hf_repo_cache_name(repo_id: str) -> str:
    return repo_id.replace("/", "--")


def hf_repo_cache_dir(config: ModelConfig, repo_id: str) -> Path:
    return artifacts_path(config) / hf_repo_cache_name(repo_id)


def _repo_ready(model_dir: Path) -> bool:
    return model_dir.is_dir() and (model_dir / "config.json").is_file()


def ensure_hf_repo_artifacts(
    config: ModelConfig,
    repo_id: str,
    revision: str = "main",
) -> Path:
    """Ensure *repo_id* exists under the OCRFlow model cache."""
    cache_root = artifacts_path(config)
    model_dir = cache_root / hf_repo_cache_name(repo_id)
    if not _repo_ready(model_dir):
        download_hf_model(
            repo_id=repo_id,
            local_dir=model_dir,
            revision=revision,
        )
    return cache_root


def ensure_vlm_model_spec_artifacts(
    config: ModelConfig,
    model_spec: VlmModelSpec,
) -> Path:
    """Download default and engine-specific repos declared on a VLM model spec."""
    cache_root = artifacts_path(config)
    seen: set[str] = set()

    def ensure(repo_id: str, revision: str) -> None:
        if repo_id in seen:
            return
        seen.add(repo_id)
        model_dir = cache_root / hf_repo_cache_name(repo_id)
        if not _repo_ready(model_dir):
            download_hf_model(
                repo_id=repo_id,
                local_dir=model_dir,
                revision=revision,
            )

    ensure(model_spec.default_repo_id, model_spec.revision)
    for override in model_spec.engine_overrides.values():
        repo_id = override.repo_id or model_spec.default_repo_id
        revision = override.revision or model_spec.revision
        ensure(repo_id, revision)

    return cache_root
