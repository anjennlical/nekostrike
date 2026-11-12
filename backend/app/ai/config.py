"""Explicit opt-in; configuration inspection never contacts a provider."""
import os
from pathlib import Path
from pydantic import BaseModel, ConfigDict, Field, SecretStr, ValidationError
from dotenv import dotenv_values


class AISettings(BaseModel):
    model_config = ConfigDict(frozen=True)
    enabled: bool = False
    key: SecretStr = Field(default=SecretStr(""), repr=False)
    model: str = Field(default="", max_length=100, pattern=r"^[a-zA-Z0-9._:-]*$")
    timeout_seconds: int = Field(default=45, ge=5, le=60)
    max_input_bytes: int = Field(default=12000, ge=2000, le=16000)
    max_output_tokens: int = Field(default=4096, ge=512, le=8192)
    max_requests: int = Field(default=3, ge=1, le=20)
    invalid: bool = False

    @property
    def status(self) -> str:
        if self.invalid:
            return "invalid_config"
        if not self.enabled:
            return "disabled"
        if not self.key.get_secret_value().strip():
            return "missing_key"
        if not self.model:
            return "missing_model"
        return "configured"


def load_settings() -> AISettings:
    names = {"enabled": "MOCHI_AI_ENABLED", "key": "OPENAI_API_KEY", "model": "MOCHI_AI_MODEL",
             "timeout_seconds": "MOCHI_AI_TIMEOUT_SECONDS", "max_input_bytes": "MOCHI_AI_MAX_INPUT_BYTES",
             "max_output_tokens": "MOCHI_AI_MAX_OUTPUT_TOKENS", "max_requests": "MOCHI_AI_MAX_REQUESTS"}
    try:
        # No interpolation, no mutation of global environment, no client-side variables.
        local = dotenv_values(Path(__file__).resolve().parents[3] / ".env", interpolate=False)
        values = {field: os.environ.get(name, local.get(name)) for field, name in names.items()}
        return AISettings(**{field: value for field, value in values.items() if value is not None})
    except (OSError, UnicodeError, ValidationError):
        return AISettings(invalid=True)
