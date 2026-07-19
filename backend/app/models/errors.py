"""Model execution errors."""


class ModelError(Exception):
    """Base error for model loading, inference, and validation."""


class ModelLoadError(ModelError):
    """Raised when a model fails to load."""


class ModelInferenceError(ModelError):
    """Raised when inference fails or times out."""


class ModelValidationError(ModelError):
    """Raised when post-inference output validation fails."""
