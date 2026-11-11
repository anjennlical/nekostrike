"""Local workspace API; the vulnerable lab is never mounted here."""
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4
import sqlite3
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from starlette.middleware.trustedhost import TrustedHostMiddleware
from .lab import check_bola
from .exposure import check_exposure
from .report import markdown_report, OWASP
from .store import Store

ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173",
           "http://127.0.0.1:4173", "http://localhost:4173"]


class LabCapability(BaseModel):
    status: Literal["ready"] = "ready"
    checks: list[Literal["bola", "data_exposure"]] = ["bola", "data_exposure"]


class AICapability(BaseModel):
    status: Literal["not_implemented"] = "not_implemented"


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["ok"] = "ok"
    service: Literal["nekostrike-api"] = "nekostrike-api"
    version: str = "0.3.0"
    environment: Literal["local"] = "local"
    timestamp: datetime
    lab: LabCapability
    ai: AICapability


class RunInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mode: Literal["vulnerable", "fixed"]
    check_type: Literal["bola", "data_exposure"] = "bola"


class ReviewInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    review_status: Literal["pending", "reviewed"]


def require_workspace(request: Request):
    """CSRF boundary, not authentication. App must remain loopback-only."""
    if request.headers.get("origin") not in (None, *ORIGINS):
        raise HTTPException(403, "Origem não permitida")
    if request.headers.get("x-nekostrike-client") != "workspace":
        raise HTTPException(403, "Cabeçalho do workspace necessário")
    if request.headers.get("content-type", "").split(";")[0].strip() != "application/json":
        raise HTTPException(415, "Envie application/json")


def create_app(db_path: Path | None = None) -> FastAPI:
    store = Store(db_path or Path(__file__).resolve().parents[1] / "data" / "nekostrike.db")
    app = FastAPI(title="NekoStrike API", version="0.3.0",
                  description="Local BOLA and data exposure lab, evidence and deterministic reports. No AI provider.",
                  docs_url="/api/docs", redoc_url=None, openapi_url="/api/openapi.json")
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost"])
    app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_credentials=False,
                       allow_methods=["GET", "POST", "PATCH"],
                       allow_headers=["Accept", "Content-Type", "X-NekoStrike-Client"])

    @app.middleware("http")
    async def response_headers(request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.exception_handler(sqlite3.Error)
    async def database_error(request, exc):
        return JSONResponse(status_code=503, content={"detail": "Armazenamento local indisponível. Verifique o arquivo SQLite."})

    @app.get("/api/health", response_model=HealthResponse, tags=["System"])
    def health():
        return {"status": "ok", "service": "nekostrike-api", "version": "0.3.0",
                "environment": "local", "timestamp": datetime.now(timezone.utc),
                "lab": {"status": "ready", "checks": ["bola", "data_exposure"]}, "ai": {"status": "not_implemented"}}

    @app.get("/api/workspace", tags=["Evidence"])
    def workspace():
        return store.snapshot()

    @app.post("/api/runs", status_code=201, dependencies=[Depends(require_workspace)], tags=["Lab"])
    async def run_check(body: RunInput):
        try:
            checker = check_bola if body.check_type == "bola" else check_exposure
            verdict, evidence = await checker(body.mode)
        except RuntimeError as exc:
            raise HTTPException(502, str(exc)) from exc
        run = {"id": str(uuid4()), "created_at": datetime.now(timezone.utc).isoformat(),
               "mode": body.mode, "verdict": verdict, "evidence": evidence, "check_type": body.check_type}
        finding = None
        if verdict == "vulnerable":
            finding = {"id": str(uuid4()), "run_id": run["id"],
                       "title": "BOLA: leitura de pedido de outro usuário", "severity": "high",
                       "review_status": "pending", "category": "API1:2023", "reference": OWASP,
                       "impact": "Alice leu o pedido fictício de Bob. A resposta expõe proprietário, item e total, comprometendo a confidencialidade.",
                       "remediation": "Verifique a autorização do usuário para cada objeto antes de retornar seus dados. Negue o acesso entre proprietários e mantenha testes de regressão.",
                       "severity_reason": "Alta no cenário didático: acesso autenticado a dados de outro usuário sem autorização por objeto. Sem pontuação CVSS."}
            if body.check_type == "data_exposure":
                finding.update({
                    "title": "Exposição de dados: campos privados no perfil público", "severity": "medium",
                    "category": "API3:2023",
                    "reference": "https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/",
                    "impact": "Bob recebeu email e internal_note fictícios ao consultar o perfil público de Alice. Esses campos não pertencem à representação autorizada.",
                    "remediation": "Selecione no backend somente id e display_name para o perfil público. Valide o esquema de saída e mantenha testes que rejeitem campos privados. Ocultar campos apenas na interface não corrige a resposta da API.",
                    "severity_reason": "Média no cenário didático: exposição de contato e nota interna fictícios a outro usuário, sem evidência de escrita ou tomada de conta. Sem pontuação CVSS.",
                })
        store.save(run, finding)
        return run

    @app.patch("/api/findings/{finding_id}", dependencies=[Depends(require_workspace)], tags=["Evidence"])
    def review(finding_id: str, body: ReviewInput):
        if not store.review(finding_id, body.review_status):
            raise HTTPException(404, "Achado não encontrado")
        return {"id": finding_id, "review_status": body.review_status}

    @app.get("/api/reports/markdown", tags=["Reports"])
    def report():
        return Response(markdown_report(store.snapshot()), media_type="text/markdown; charset=utf-8",
                        headers={"Content-Disposition": 'attachment; filename="nekostrike-report.md"'})
    return app


app = create_app()
