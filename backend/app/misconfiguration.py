"""Synthetic verbose-error fixture. No actual debug mode or host data access."""
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient

BASELINE = {"status": "ok", "fixture": True}
GENERIC_ERROR = {"detail": "Erro interno no laboratório fictício"}
VERBOSE_ERROR = {**GENERIC_ERROR, "debug": {
    "exception": "FixtureError: falha simulada",
    "file": "/fictional/service/orders.py",
    "line": 42,
}}


def create_error_lab(*, protected: bool) -> FastAPI:
    lab = FastAPI(debug=False, docs_url=None, redoc_url=None, openapi_url=None)

    @lab.get("/lab/status")
    def status():
        return BASELINE

    @lab.get("/lab/error")
    def error():
        # Simulate a verbose error response, never expose a real traceback.
        return JSONResponse(GENERIC_ERROR if protected else VERBOSE_ERROR, status_code=500)

    return lab


async def check_misconfiguration(mode: str) -> tuple[str, list[dict]]:
    evidence = []
    for scenario, protected, path, expected in [
        ("baseline", True, "/lab/status", 200),
        ("error_response", mode == "fixed", "/lab/error", 500),
        ("negative_control", True, "/lab/error", 500),
    ]:
        async with AsyncClient(transport=ASGITransport(app=create_error_lab(protected=protected)),
                               base_url="http://lab.internal") as client:
            response = await client.get(path)
        try:
            body = response.json()
        except ValueError as exc:
            raise RuntimeError("Resposta inválida; resultado inconclusivo.") from exc
        evidence.append({"scenario": scenario, "method": "GET", "path": path,
                         "actor": "anonymous", "lab_mode": "fixed" if protected else "vulnerable",
                         "expected_status": expected, "status": response.status_code, "body": body})
    baseline, target, control = evidence
    if (baseline["status"] != 200 or baseline["body"] != BASELINE
            or control["status"] != 500 or control["body"] != GENERIC_ERROR):
        raise RuntimeError("Os controles do laboratório falharam; resultado inconclusivo.")
    if target["status"] == 500 and target["body"] == VERBOSE_ERROR:
        return "vulnerable", evidence
    if target["status"] == 500 and target["body"] == GENERIC_ERROR:
        return "protected", evidence
    raise RuntimeError("Resposta inesperada; resultado inconclusivo.")
