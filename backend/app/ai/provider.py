"""Official Responses API adapter. No tools, retries, alternate URLs or startup requests."""
import json
from dataclasses import dataclass
from typing import Protocol
import httpx
from openai import AsyncOpenAI, APIError, APITimeoutError, AuthenticationError, RateLimitError
from pydantic import ValidationError
from .config import AISettings
from .prompts import INSTRUCTIONS
from .schemas import Analysis, Consumption, TokenUsage


@dataclass(frozen=True)
class ProviderResult:
    analysis: Analysis
    consumption: Consumption


def response_consumption(response) -> Consumption:
    """Allowlist SDK metadata; missing/invalid counts must never become zero."""
    raw = response.usage
    usage, status = None, "not_provided"
    if raw is not None:
        try:
            usage = TokenUsage(
                input_tokens=raw.input_tokens, output_tokens=raw.output_tokens,
                total_tokens=raw.total_tokens,
                cached_tokens=getattr(getattr(raw, "input_tokens_details", None), "cached_tokens", None),
                cache_write_tokens=getattr(getattr(raw, "input_tokens_details", None), "cache_write_tokens", None),
                reasoning_tokens=getattr(getattr(raw, "output_tokens_details", None), "reasoning_tokens", None),
            )
            status = "reported"
        except (ValidationError, AttributeError, TypeError):
            status = "invalid"
    # A valid explanation remains usable even when optional accounting is malformed.
    metadata = Consumption(usage=usage, usage_status=status)
    for key, value in (("service_tier", response.service_tier), ("reported_model", response.model)):
        try:
            metadata = Consumption.model_validate({**metadata.model_dump(), key: value})
        except ValidationError:
            pass
    return metadata


class AIError(Exception):
    def __init__(self, code: str, message: str, status: int = 502):
        self.code, self.message, self.status = code, message, status
        super().__init__(code)  # No raw provider messages, credentials or evidence in errors.


class Provider(Protocol):
    name: str
    async def analyze(self, context: dict) -> ProviderResult | Analysis | dict: ...


class OpenAIProvider:
    name = "openai"

    def __init__(self, settings: AISettings, *, transport: httpx.AsyncBaseTransport | None = None):
        self.settings = settings
        self.transport = transport  # Test injection only, no user-supplied URLs.

    async def analyze(self, context: dict) -> ProviderResult:
        try:
            async with AsyncOpenAI(
                api_key=self.settings.key.get_secret_value(),
                base_url="https://api.openai.com/v1", max_retries=0,
                timeout=self.settings.timeout_seconds,
                http_client=httpx.AsyncClient(transport=self.transport, trust_env=False,
                                             follow_redirects=False, timeout=self.settings.timeout_seconds),
            ) as client:
                response = await client.responses.parse(
                    model=self.settings.model, instructions=INSTRUCTIONS,
                    input=json.dumps(context, ensure_ascii=False, separators=(",", ":")),
                    text_format=Analysis, store=False, tools=[], tool_choice="none",
                    max_output_tokens=self.settings.max_output_tokens,
                    service_tier="default",
                )
            if response.status != "completed":
                raise AIError("incomplete", "O provedor não concluiu a resposta. Nenhuma análise foi aceita.")
            if any(part.type == "refusal" for item in response.output if item.type == "message" for part in item.content):
                raise AIError("refusal", "O provedor recusou esta análise.")
            if response.output_parsed is None:
                raise AIError("invalid_output", "O provedor não retornou uma análise válida.")
            return ProviderResult(response.output_parsed, response_consumption(response))
        except APITimeoutError:
            raise AIError("timeout", "O provedor excedeu o tempo limite. Não houve repetição automática.", 504) from None
        except AuthenticationError:
            raise AIError("authentication", "O provedor recusou a credencial. Confira a configuração local.", 503) from None
        except RateLimitError:
            raise AIError("provider_limit", "Limite ou saldo do provedor indisponível. Confira sua conta antes de repetir.", 503) from None
        except APIError as error:
            if error.code == "model_not_found":
                raise AIError("model_unavailable", "Modelo indisponível para esta credencial. Confira o nome e o acesso ao modelo na sua conta.", 503) from None
            raise AIError("provider_unavailable", "Provedor indisponível ou configuração não aceita. Nenhuma análise foi confirmada.", 503) from None
        except (ValidationError, ValueError, TypeError, AttributeError):
            raise AIError("invalid_output", "A resposta não corresponde ao contrato da Mochi.") from None
