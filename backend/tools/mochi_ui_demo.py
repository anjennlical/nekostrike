"""Explicit mock-only UI rehearsal. Never loads .env or contacts a provider.

Build frontend first, then run with --case success|timeout|invalid|unavailable|missing_key.
Serves the compiled product on loopback:4173 using a disposable lab database.
"""
import argparse
import asyncio
from pathlib import Path
import sys
import tempfile
import json
import hashlib
from uuid import uuid4
from datetime import datetime, timedelta

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
from app.ai import config
config.load_settings = lambda: config.AISettings()
import httpx


async def forbid_http(*args, **kwargs):
    raise AssertionError("Mock rehearsal forbids external HTTP")


def forbid_sync_http(*args, **kwargs):
    raise AssertionError("Mock rehearsal forbids external HTTP")


httpx.AsyncHTTPTransport.handle_async_request = forbid_http
httpx.HTTPTransport.handle_request = forbid_sync_http
from app.main import create_app
from app.main import ORIGINS
from app.ai.provider import AIError
from app.ai.provider import ProviderResult
from app.ai.schemas import Analysis, Consumption, TokenUsage
from app.ai.context import prepare_context, source_fingerprint
from app.ai.service import AIService
from app.store import Store
from fastapi.staticfiles import StaticFiles
import uvicorn


class DemoProvider:
    name = "test_double"

    def __init__(self, case):
        self.case = case

    async def analyze(self, context):
        await asyncio.sleep(2)
        if self.case == "timeout":
            raise TimeoutError()
        if self.case == "unavailable":
            raise AIError("provider_unavailable", "Provedor simulado indisponível.", 503)
        output = {
            "finding_id": context["finding_id"],
            "summary": "SIMULAÇÃO: explicação de teste baseada nas evidências deste laboratório.",
            "technical_explanation": "O verificador comparou uma resposta vulnerável com controles locais. Esta resposta foi programada para testar a interface; não foi gerada por IA.",
            "potential_impact": "Uma falha equivalente poderia expor informações além do contrato autorizado.",
            "evidence_used": [{key: item[key] for key in ("evidence_id", "path", "actor", "status")} for item in context["evidence"]],
            "recommendations": ["Revise o controle descrito no achado e compare com o cenário corrigido."],
            "limitations": ["Provedor simulado; não demonstra qualidade de um modelo real.", "Dados fictícios, teste limitado e revisão humana obrigatória."],
        }
        if self.case == "invalid":
            output["evidence_used"][0]["evidence_id"] = "invented-reference"
        return ProviderResult(Analysis.model_validate(output), Consumption(
            usage=TokenUsage(input_tokens=763, output_tokens=680, total_tokens=1443,
                             cached_tokens=0, reasoning_tokens=217),
            usage_status="reported", service_tier="default", reported_model="SIMULADO-SEM-CUSTO"))


async def seed(app, database=None, history=False):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1") as client:
        for check in ("bola", "data_exposure", "security_misconfiguration"):
            response = await client.post("/api/runs", headers={"X-NekoStrike-Client": "workspace"}, json={"mode": "vulnerable", "check_type": check})
            response.raise_for_status()
        if history:
            snapshot = (await client.get('/api/workspace')).json()
            finding = next(f for f in snapshot['findings'] if f['category'] == 'API1:2023')
            settings = config.AISettings(enabled=True, key='fake-local-demo', model='SIMULADO-HISTORICO')
            store = Store(database)
            first = await AIService(store, settings, DemoProvider('success')).analyze(finding['id'])
            # Explicit fixture insertion, not a product bypass for paid regeneration.
            record = first.record.model_copy(update={'id': str(uuid4()), 'created_at':
                (datetime.fromisoformat(first.record.created_at) + timedelta(seconds=1)).isoformat()})
            second = first.model_copy(update={'record': record}, deep=True)
            source = store.analysis_source(finding['id'], 12000)
            context = prepare_context(source, finding['id'], 12000)
            store.save_analysis(second, hashlib.sha256(json.dumps(context, sort_keys=True).encode()).hexdigest(), context, source_fingerprint(source))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", choices=["success", "timeout", "invalid", "unavailable", "missing_key", "disabled"], default="success")
    parser.add_argument("--seed-history", action="store_true", help="Prepara duas análises simuladas de BOLA, sem provedor real")
    parser.add_argument("--empty", action="store_true", help="Inicia sem execuções para ensaio completo pelo laboratório")
    parser.add_argument("--port", type=int, choices=[4173, 4174], default=4173, help="Porta fixa de ensaio em loopback")
    args = parser.parse_args()
    # This mock-only process may use the alternate loopback port without touching production configuration.
    if args.port == 4174:
        ORIGINS.extend(["http://127.0.0.1:4174", "http://localhost:4174"])
    if not (ROOT / "frontend/dist/index.html").exists():
        parser.error("Execute npm.cmd run build em frontend primeiro.")
    with tempfile.TemporaryDirectory(prefix="nekostrike-mochi-ui-") as temporary:
        settings = config.AISettings(enabled=args.case != "disabled", key="" if args.case == "missing_key" else "fake-local-demo", model="SIMULADO-SEM-CUSTO", max_requests=20)
        database = Path(temporary) / "demo.db"
        app = create_app(database, ai_settings=settings, ai_provider=DemoProvider(args.case))
        if args.seed_history:
            @app.middleware('http')
            async def delayed_history(request, call_next):
                if request.method == 'GET' and request.url.path == '/api/ai/analyses':
                    await asyncio.sleep(1)
                return await call_next(request)
        if not args.empty:
            asyncio.run(seed(app, database, args.seed_history))
        app.mount("/", StaticFiles(directory=ROOT / "frontend/dist", html=True))
        print(f"MOCK ONLY — http://127.0.0.1:{args.port}/#mochi — banco temporário, sem .env, sem provedor real", flush=True)
        uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="warning", access_log=False)


if __name__ == "__main__":
    main()
