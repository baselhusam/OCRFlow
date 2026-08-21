"""Accelerator detection script — Make/Compose entrypoint."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
DETECT = REPO_ROOT / "scripts" / "detect-accelerator.sh"

QUERIES = {
    "accelerator": {"cpu", "nvidia", "amd", "mlx"},
    "device": {"cpu", "cuda", "mps"},
    "serve-mode": {"docker", "host"},
    "paddle-device": {"cpu", "cuda"},
    "paddle-serve": {"docker", "host"},
    "os": {"darwin", "linux", "wsl", "windows"},
    "arch": {"x86_64", "arm64"},
}


@pytest.mark.parametrize(("override", "accelerator", "device", "serve", "paddle_device"), [
    ("cpu", "cpu", "cpu", "docker", "cpu"),
    ("nvidia", "nvidia", "cuda", "docker", "cuda"),
    ("amd", "amd", "cuda", "docker", "cpu"),
    ("mlx", "mlx", "mps", "host", "cpu"),
])
def test_detect_honors_accelerator_override(override, accelerator, device, serve, paddle_device):
    env_base = {"ACCELERATOR": override}

    def query(name: str) -> str:
        result = subprocess.run(
            [str(DETECT), name],
            check=True,
            capture_output=True,
            text=True,
            cwd=REPO_ROOT,
            env={**subprocess.os.environ, **env_base},
        )
        return result.stdout.strip()

    assert query("accelerator") == accelerator
    assert query("device") == device
    assert query("serve-mode") == serve
    assert query("paddle-device") == paddle_device


def test_detect_report_contains_overlay_path():
    result = subprocess.run(
        [str(DETECT)],
        check=True,
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
        env={**subprocess.os.environ, "ACCELERATOR": "nvidia"},
    )
    assert "docker-compose.nvidia.yml" in result.stdout
    assert "Accelerator:     nvidia" in result.stdout


def test_detect_unknown_accelerator_fails():
    result = subprocess.run(
        [str(DETECT), "accelerator"],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
        env={**subprocess.os.environ, "ACCELERATOR": "tpu"},
    )
    assert result.returncode != 0


@pytest.mark.parametrize("query", list(QUERIES))
def test_detect_live_query_is_known_value(query):
    result = subprocess.run(
        [str(DETECT), query],
        check=True,
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )
    value = result.stdout.strip()
    allowed = QUERIES[query]
    if query == "arch" and value not in allowed:
        # Unusual arch (e.g. armv7) is still a successful detection.
        assert value
        return
    assert value in allowed
