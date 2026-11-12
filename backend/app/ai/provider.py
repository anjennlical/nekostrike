"""Official Responses API adapter. No tools, retries, alternate URLs or startup requests."""
import json
from typing import Protocol
import httpx
from openai import AsyncOpenAI, APIError, APITimeoutError, AuthenticationError, RateLimitError
from pydantic import ValidationError
from .config import AISettings
from .prompts import INSTRUCTIONS
from .schemas import Analysis


class AIError(Exception):
    def __init__(self, code: str, message: str, status: int = 502):
        self.code, self.message, self.status = code, message, status
        super().__init__(code)  # No raw provider messages, credentials or evidence in errors.


class Provider(Protocol):
    name: str
    async def analyze(self, context: dict) -> Analysis: ...


class OpenAIProvider:
    name = "openai"

    def __init__(self, settings: AISettings, *, transport: httpx.AsyncBaseTransport | None = None):
        self.settings = settings
        self.transport = transport  # Test injection only, no user-supplied URLs.

    async def analyze(self, context: dict) -> Analysis:
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
                )
            if response.status != "completed":
                raise AIError("incomplete", "O provedor não concluiu a resposta. Nenhuma análise foi aceita.")
            if any(part.type == "refusal" for item in response.output if item.type == "message" for part in item.content):
                raise AIError("refusal", "O provedor recusou esta análise.")
            if response.output_parsed is None:
                raise AIError("invalid_output", "O provedor não retornou uma análise válida.")
            return response.output_parsed
        except APITimeoutError:
            raise AIError("timeout", "O provedor excedeu o tempo limite. Não houve repetição automática.", 504) from None
        except AuthenticationError:
            raise AIError("authentication", "O provedor recusou a credencial. Confira a configuração local.", 503) from None
        except RateLimitError:
            raise AIError("provider_limit", "Limite ou saldo do provedor indisponível. Confira sua conta antes de repetir.", 503) from None
        except APIError:
            raise AIError("provider_unavailable", "Provedor indisponível ou configuração não aceita. Nenhuma análise foi confirmada.", 503) from None
        except (ValidationError, ValueError, TypeError, AttributeError):
            raise AIError("invalid_output", "A resposta não corresponde ao contrato da Mochi.") from None
