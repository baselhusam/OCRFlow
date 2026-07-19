from dataclasses import dataclass

from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.schemas.artifacts import PageImage


@dataclass
class EchoInput:
    value: str
    page: PageImage | None = None


@dataclass
class EchoOutput:
    value: str


class MockRunner(BaseRunner[EchoInput, EchoOutput]):
    model_id = "mock/echo"

    def __init__(self) -> None:
        super().__init__()
        self.load_count = 0
        self.run_count = 0
        self.unload_count = 0

    async def _load_impl(self, config: ModelConfig) -> None:
        self.load_count += 1

    async def _run_impl(self, input: EchoInput) -> EchoOutput:
        self.run_count += 1
        return EchoOutput(value=input.value)

    async def _unload_impl(self) -> None:
        self.unload_count += 1
