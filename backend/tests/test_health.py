from datetime import datetime, timezone
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import create_app
from app.lab import create_lab, check_bola
from app.store import Store

pytestmark = pytest.mark.anyio
HEADERS = {"X-NekoStrike-Client": "workspace", "Origin": "http://127.0.0.1:5173"}


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client(tmp_path):
    async with AsyncClient(transport=ASGITransport(app=create_app(tmp_path / "test.db")),
                           base_url="http://127.0.0.1") as test_client:
        yield test_client


async def test_health_contract_and_honest_capabilities(client):
    response = await client.get("/api/health")
    data = response.json()
    assert response.status_code == 200
    assert data["status"] == "ok" and data["service"] == "nekostrike-api"
    assert data["environment"] == "local" and data["version"] == "0.4.0"
    assert data["lab"]["checks"] == ["bola", "data_exposure", "security_misconfiguration"]
    assert data["lab"]["status"] == "ready"
    assert data["ai"]["status"] == "disabled"
    assert abs((datetime.now(timezone.utc) - datetime.fromisoformat(data["timestamp"])).total_seconds()) < 10
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("origin", ["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:4173", "http://localhost:4173"])
async def test_cors_local_frontends(client, origin):
    response = await client.options("/api/runs", headers={"Origin": origin,
        "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "x-nekostrike-client,content-type"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert "access-control-allow-credentials" not in response.headers


@pytest.mark.parametrize("origin", ["https://example.com", "http://localhost:9999", "null"])
async def test_foreign_origin_cannot_write(client, origin):
    response = await client.post("/api/runs", json={"mode": "vulnerable"}, headers={**HEADERS, "Origin": origin})
    assert response.status_code == 403
    assert "access-control-allow-origin" not in response.headers
    assert (await client.get("/api/workspace")).json() == {"runs": [], "findings": []}


async def test_write_guard_and_content_type(client):
    assert (await client.post("/api/runs", json={"mode": "vulnerable"})).status_code == 403
    assert (await client.post("/api/runs", content='{"mode":"vulnerable"}', headers=HEADERS)).status_code == 415
    assert (await client.options("/api/runs", headers={"Origin": HEADERS["Origin"], "Access-Control-Request-Method": "DELETE"})).status_code == 400


async def test_host_and_route_boundaries(client):
    assert (await client.get("/api/health", headers={"Host": "attacker.example"})).status_code == 400
    assert (await client.post("/api/health", json={})).status_code == 405
    assert (await client.get("/lab/orders/order-bob")).status_code == 404
    assert (await client.post("/api/scan", json={"url": "https://example.com"})).status_code == 404


@pytest.mark.parametrize("body", [{}, {"mode": "external"}, {"mode": "vulnerable", "target": "https://example.com"}, {"mode": "fixed", "command": "whoami"}])
async def test_strict_run_contract(client, body):
    assert (await client.post("/api/runs", json=body, headers=HEADERS)).status_code == 422


async def test_bola_evidence_and_corrected_negative_control(client):
    response = await client.post("/api/runs", json={"mode": "vulnerable"}, headers=HEADERS)
    assert response.status_code == 201
    run = response.json()
    assert run["verdict"] == "vulnerable"
    baseline, cross, control = run["evidence"]
    assert baseline["status"] == 200 and baseline["body"]["owner"] == "alice"
    assert cross["actor"] == "alice" and cross["body"]["owner"] == "bob"
    assert cross["status"] == 200 and cross["expected_status"] == 403
    assert control["status"] == 403 and control["lab_mode"] == "fixed"
    assert "Bearer" not in response.text
    data = (await client.get("/api/workspace")).json()
    assert data["runs"] == [run]
    assert len(data["findings"]) == 1
    assert data["findings"][0]["run_id"] == run["id"]


async def test_fixed_mode_has_no_false_finding(client):
    run = (await client.post("/api/runs", json={"mode": "fixed"}, headers=HEADERS)).json()
    assert run["verdict"] == "protected"
    assert [e["status"] for e in run["evidence"]] == [200, 403, 403]
    assert (await client.get("/api/workspace")).json()["findings"] == []


async def test_lab_auth_and_object_access():
    async with AsyncClient(transport=ASGITransport(app=create_lab(protected=True)), base_url="http://lab.internal") as client:
        assert (await client.get("/lab/orders/order-bob")).status_code == 401
        assert (await client.get("/lab/orders/order-bob", headers={"Authorization": "Bearer unknown"})).status_code == 401
        assert (await client.get("/lab/orders/missing", headers={"Authorization": "Bearer fixture-alice"})).status_code == 404
        assert (await client.get("/lab/orders/order-bob", headers={"Authorization": "Bearer fixture-bob"})).status_code == 200
        assert (await client.get("/lab/orders/order-bob", headers={"Authorization": "Bearer fixture-alice"})).status_code == 403


async def test_inconclusive_controls_do_not_generate_results(client, monkeypatch):
    async def fail(mode):
        raise RuntimeError("Controle falhou; inconclusivo")
    monkeypatch.setattr("app.main.check_bola", fail)
    assert (await client.post("/api/runs", json={"mode": "vulnerable"}, headers=HEADERS)).status_code == 502
    assert (await client.get("/api/workspace")).json() == {"runs": [], "findings": []}


async def test_checker_rejects_failed_baseline(monkeypatch):
    from fastapi import FastAPI
    broken = FastAPI()
    monkeypatch.setattr("app.lab.create_lab", lambda **kwargs: broken)
    with pytest.raises(RuntimeError, match="inconclusivo"):
        await check_bola("vulnerable")


async def test_review_persists_after_app_restart(tmp_path):
    path = tmp_path / "persistent.db"
    async with AsyncClient(transport=ASGITransport(app=create_app(path)), base_url="http://127.0.0.1") as client:
        await client.post("/api/runs", json={"mode": "vulnerable"}, headers=HEADERS)
        data = (await client.get("/api/workspace")).json()
        fid = data["findings"][0]["id"]
        assert (await client.patch(f"/api/findings/{fid}", json={"review_status": "reviewed"}, headers=HEADERS)).status_code == 200
    async with AsyncClient(transport=ASGITransport(app=create_app(path)), base_url="http://127.0.0.1") as client:
        saved = (await client.get("/api/workspace")).json()
        assert saved["runs"] == data["runs"]
        assert saved["findings"][0]["review_status"] == "reviewed"
        assert (await client.patch(f"/api/findings/{fid}", json={"review_status": "fixed"}, headers=HEADERS)).status_code == 422
        assert (await client.patch("/api/findings/missing", json={"review_status": "pending"}, headers=HEADERS)).status_code == 404


async def test_report_contains_real_evidence_and_review(client):
    empty = await client.get("/api/reports/markdown")
    assert "Nenhuma execução" in empty.text
    run = (await client.post("/api/runs", json={"mode": "vulnerable"}, headers=HEADERS)).json()
    await client.post("/api/runs", json={"mode": "fixed"}, headers=HEADERS)
    report = await client.get("/api/reports/markdown")
    assert report.headers["content-disposition"].endswith('"nekostrike-report.md"')
    assert "text/markdown" in report.headers["content-type"]
    for text in [run["id"], "order-bob", "Execuções: 2 | Achados: 1", "sem IA", "Alta", "Recomendação", "403", "pending"]:
        assert text in report.text


async def test_atomic_rollback(tmp_path):
    import sqlite3
    store = Store(tmp_path / "atomic.db")
    with pytest.raises(sqlite3.IntegrityError):
        store.save({"id": "run", "created_at": "now", "mode": "vulnerable", "verdict": "vulnerable", "evidence": []},
                   {"id": "finding", "review_status": "invalid"})
    assert store.snapshot() == {"runs": [], "findings": []}


async def test_storage_error_is_not_empty_success(tmp_path):
    path = tmp_path / "corrupt.db"
    path.write_text("not sqlite")
    async with AsyncClient(transport=ASGITransport(app=create_app(path)), base_url="http://127.0.0.1") as client:
        response = await client.get("/api/workspace")
        assert response.status_code == 503
        assert "Armazenamento" in response.json()["detail"]
