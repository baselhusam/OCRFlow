"""Device mapping across CUDA, ROCm, MPS/MLX, and Paddle."""

from __future__ import annotations

from app.core.config import Settings
from app.models.base import Device
from app.models.device import device_to_torch, paddle_supports_gpu, resolve_device
from app.models.paddle._common import resolve_paddle_device
from app.models.runner_factory import RUNNER_FACTORIES
from app.models.servable import SERVABLE_MODELS, is_remote_provider


def test_device_to_torch_aliases():
    assert device_to_torch(Device.cpu) == "cpu"
    assert device_to_torch(Device.cuda) == "cuda"
    assert device_to_torch(Device.rocm) == "cuda"
    assert device_to_torch(Device.mps) == "mps"
    assert device_to_torch(Device.mlx) == "mps"


def test_resolve_device_keeps_explicit_values():
    assert resolve_device(Device.cpu) is Device.cpu
    assert resolve_device(Device.cuda) is Device.cuda
    assert resolve_device(Device.mlx) is Device.mlx
    assert resolve_device(Device.rocm) is Device.rocm


def test_resolve_auto_returns_a_concrete_device():
    resolved = resolve_device(Device.auto)
    assert resolved in {Device.cpu, Device.cuda, Device.rocm, Device.mps}
    assert resolved is not Device.auto


def test_paddle_gpu_only_for_nvidia_cuda(monkeypatch):
    monkeypatch.setattr("app.models.paddle._common.paddle_supports_gpu", lambda device: device == Device.cuda)
    assert resolve_paddle_device(Device.cuda) == "gpu"
    assert resolve_paddle_device(Device.cpu) == "cpu"
    assert resolve_paddle_device(Device.mps) == "cpu"
    assert resolve_paddle_device(Device.mlx) == "cpu"
    assert resolve_paddle_device(Device.rocm) == "cpu"


def test_paddle_supports_gpu_false_on_rocm(monkeypatch):
    monkeypatch.setattr("app.models.device._looks_like_rocm", lambda: True)
    assert paddle_supports_gpu(Device.cuda) is False
    assert paddle_supports_gpu(Device.rocm) is False


def test_paddle_supports_gpu_true_for_cuda_without_rocm(monkeypatch):
    monkeypatch.setattr("app.models.device._looks_like_rocm", lambda: False)
    assert paddle_supports_gpu(Device.cuda) is True
    assert paddle_supports_gpu(Device.mps) is False


def test_build_model_config_resolves_auto(monkeypatch):
    monkeypatch.setattr("app.core.config.resolve_device", lambda device: Device.mps if device == Device.auto else device)
    settings = Settings(default_device=Device.auto)
    config = settings.build_model_config()
    assert config.device is Device.mps


def test_every_remote_provider_runner_is_servable():
    missing = [
        model_id
        for model_id in RUNNER_FACTORIES
        if is_remote_provider(model_id.split("/", 1)[0]) and model_id not in SERVABLE_MODELS
    ]
    assert missing == [], f"OCR models missing from remote servable registry: {missing}"
