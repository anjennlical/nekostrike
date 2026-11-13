import asyncio
import hashlib
import json
import sqlite3
from time import monotonic
from datetime import datetime, timezone
from uuid import uuid4
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool
from ..store import Store
from .config import AISettings
from .context import prepare_context, validate_analysis, source_fingerprint
from .provider import AIError, OpenAIProvider, Provider, ProviderResult
from .schemas import Analysis, AnalysisResult, AnalysisRecord, AIStatus


class AIService:
    def __init__(self, store: Store, settings: AISettings, provider: Provider | None = None):
        self.store, self.settings = store, settings
        self.provider = provider or OpenAIProvider(settings)
        self.lock = asyncio.Lock()
        self.attempts = 0
        self.last_attempt = float("-inf")
        self.cache: dict[str, tuple[float, AnalysisResult]] = {}

    def status(self) -> AIStatus:
        return AIStatus(status=self.settings.status, provider=self.provider.name, model=self.settings.model or None,
                        requests_remaining=max(0, self.settings.max_requests - self.attempts),
                        max_output_tokens=self.settings.max_output_tokens, timeout_seconds=self.settings.timeout_seconds)

    async def analyze(self, finding_id: str) -> AnalysisResult:
        if self.settings.status != "configured":
            raise AIError(self.settings.status, "IA indisponível. Confira a configuração local do backend.", 503)
        if self.lock.locked():
            raise AIError("busy", "Uma análise já está em andamento. Aguarde a conclusão.", 409)
        async with self.lock:
            try:
                source = await run_in_threadpool(self.store.analysis_source, finding_id, self.settings.max_input_bytes)
            except OverflowError:
                raise AIError("input_too_large", "As evidências excedem o limite. Nenhum dado foi enviado.", 413) from None
            except (sqlite3.Error, OSError, ValueError, TypeError):
                raise AIError("storage_unavailable", "Não foi possível ler as evidências locais.", 503) from None
            if source is None:
                raise AIError("finding_not_found", "Achado não encontrado no histórico local.", 404)
            context = prepare_context(source, finding_id, self.settings.max_input_bytes)
            fingerprint = hashlib.sha256(json.dumps(context, sort_keys=True).encode()).hexdigest()
            source_hash = source_fingerprint(source)
            cache_key = f"{fingerprint}:{source_hash}"
            try:
                records = await run_in_threadpool(self.store.analyses, finding_id)
            except (sqlite3.Error, OSError, ValueError, TypeError):
                # Unreadable history is not permission to purchase another response.
                raise AIError("storage_unavailable", "Não foi possível confirmar as análises salvas. Nenhuma nova análise foi solicitada.", 503) from None
            existing = next((item for item in records
                             if item.record.evidence_status == "current" and item.provider == self.provider.name), None)
            if existing is not None:
                return existing.model_copy(update={"cached": True}, deep=True)
            now = monotonic()
            self.cache = {key: entry for key, entry in self.cache.items() if now - entry[0] < 600}
            if cache_key in self.cache and self.cache[cache_key][1].record is None:
                cached = self.cache[cache_key][1]
                return cached.model_copy(update={"cached": True}, deep=True)
            if self.attempts >= self.settings.max_requests:
                raise AIError("session_limit", "Limite de chamadas deste processo atingido. Revise os custos antes de reiniciar.", 429)
            if now - self.last_attempt < 10:
                raise AIError("cooldown", "Aguarde dez segundos antes de solicitar outra análise.", 429)
            self.attempts += 1
            self.last_attempt = now
            try:
                async with asyncio.timeout(self.settings.timeout_seconds):
                    raw = await self.provider.analyze(context)
                consumption = raw.consumption if isinstance(raw, ProviderResult) else None
                raw = raw.analysis if isinstance(raw, ProviderResult) else raw
                analysis = Analysis.model_validate(raw.model_dump() if isinstance(raw, Analysis) else raw)
                validate_analysis(analysis, context)
            except TimeoutError:
                raise AIError("timeout", "Tempo limite atingido. Não houve repetição automática; pode haver cobrança no provedor.", 504) from None
            except ValidationError:
                raise AIError("invalid_output", "A resposta não passou pela validação e foi descartada.") from None
            result = AnalysisResult(analysis=analysis, provider=self.provider.name,
                                    model=(consumption.reported_model if consumption else None) or self.settings.model,
                                    consumption=consumption,
                                    cached=False, deterministic_verdict=context["verdict"],
                                    deterministic_severity=context["severity"],
                                    record=AnalysisRecord(id=str(uuid4()), created_at=datetime.now(timezone.utc).isoformat(),
                                                          run_id=source["run"]["id"], check_type=source["run"]["check_type"]))
            try:
                await run_in_threadpool(self.store.save_analysis, result, fingerprint, context, source_hash)
            except (sqlite3.Error, OSError, ValueError):
                # Preserve a paid response in memory even if its local write failed.
                result = result.model_copy(update={"record": None, "storage_warning": True})
            if len(self.cache) >= 8:
                self.cache.pop(next(iter(self.cache)))
            self.cache[cache_key] = (monotonic(), result)
            return result.model_copy(deep=True)
