import json
import sqlite3
import hashlib
from datetime import datetime, timedelta
from uuid import uuid4
import httpx
import pytest
from app.main import create_app
from app.store import Store
from app.ai.config import AISettings
from app.ai.service import AIService
from app.ai.context import prepare_context, source_fingerprint
from test_ai import FakeProvider, HEADERS, seed, settings

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


def client(app):
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1")


def save_history_variant(store, original, **updates):
    """Seed a historical fixture directly; product generation never bypasses saved reuse."""
    record = original.record.model_copy(update={"id": str(uuid4()),
        "created_at": (datetime.fromisoformat(original.record.created_at) + timedelta(seconds=1)).isoformat()})
    variant = original.model_copy(update={**updates, "record": record}, deep=True)
    source = store.analysis_source(original.analysis.finding_id, 12000)
    context = prepare_context(source, original.analysis.finding_id, 12000)
    store.save_analysis(variant, hashlib.sha256(json.dumps(context, sort_keys=True).encode()).hexdigest(), context, source_fingerprint(source))
    return variant


@pytest.mark.parametrize("check", ["bola", "data_exposure", "security_misconfiguration"])
async def test_save_restart_review_export_without_provider(tmp_path, check):
    path = tmp_path / "persist.db"
    provider = FakeProvider()
    async with client(create_app(path, ai_settings=settings(), ai_provider=provider)) as api:
        finding = await seed(api, check)
        before = (await api.get("/api/workspace")).json()
        result = (await api.post("/api/ai/analyze", json={"finding_id": finding}, headers=HEADERS)).json()
        assert result["record"]["review_status"] == "pending"
        assert result["record"]["usage"] is None and not result["storage_warning"]
        cached = (await api.post("/api/ai/analyze", json={"finding_id": finding}, headers=HEADERS)).json()
        assert cached["cached"] and cached["record"]["id"] == result["record"]["id"]
        assert len(provider.contexts) == 1
    # Restart with AI disabled and a provider which must never be used for reads/exports/review.
    disabled = FakeProvider()
    async with client(create_app(path, ai_settings=AISettings(), ai_provider=disabled)) as api:
        saved = (await api.get("/api/ai/analyses", params={"finding_id": finding})).json()
        assert len(saved) == 1 and saved[0] == result
        assert (await api.get("/api/workspace")).json() == before
        url = f'/api/ai/analyses/{result["record"]["id"]}'
        assert (await api.patch(url, json={"review_status": "reviewed"})).status_code == 403
        assert (await api.patch(url, json={"review_status": "reviewed"}, headers=HEADERS)).status_code == 200
        assert (await api.get("/api/workspace")).json() == before
        assert (await api.get("/api/ai/analyses", params={"finding_id": finding})).json()[0]["record"]["review_status"] == "reviewed"
        plain = (await api.get("/api/reports/markdown")).text
        augmented = (await api.get("/api/reports/markdown?include_ai=true")).text
        assert "Relatório determinístico, sem IA" in plain
        assert result["analysis"]["summary"] not in plain
        assert "Interpretações com auxílio de IA" in augmented
        assert "PROVEDOR SIMULADO" in augmented and "Revisão da análise: revisada" in augmented
        assert "Consumo: não registrado" in augmented
        assert result["record"]["id"] in augmented
        assert not disabled.contexts


async def test_additive_migration_preserves_old_rows(tmp_path):
    path = tmp_path / "legacy.db"
    async with client(create_app(path)) as api:
        await seed(api)
        before = (await api.get("/api/workspace")).json()
    with sqlite3.connect(path) as db:
        db.execute("DROP TABLE mochi_analyses")  # Only this disposable test database.
        old_runs = db.execute("SELECT * FROM runs").fetchall()
        old_findings = db.execute("SELECT * FROM findings").fetchall()
    assert Store(path).snapshot() == before
    assert Store(path).analyses() == []
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT * FROM runs").fetchall() == old_runs
        assert db.execute("SELECT * FROM findings").fetchall() == old_findings


async def test_write_failure_keeps_valid_response_and_does_not_retry_provider(tmp_path, monkeypatch):
    store = Store(tmp_path / "write-failure.db")
    async with client(create_app(store.path)) as api:
        finding = await seed(api)
    provider = FakeProvider()
    def fail(*args):
        raise sqlite3.OperationalError("synthetic disk failure")
    monkeypatch.setattr(store, "save_analysis", fail)
    service = AIService(store, settings(), provider)
    first = await service.analyze(finding)
    assert first.record is None and first.storage_warning
    assert (await service.analyze(finding)).storage_warning
    assert len(provider.contexts) == 1 and store.analyses() == []


@pytest.mark.parametrize("damage", ["json", "reference", "identity", "oversize", "fingerprint"])
async def test_corrupt_analysis_fails_closed_without_breaking_plain_export(tmp_path, damage):
    path = tmp_path / "corrupt.db"
    async with client(create_app(path, ai_settings=settings(), ai_provider=FakeProvider())) as api:
        finding = await seed(api)
        result = (await api.post("/api/ai/analyze", json={"finding_id": finding}, headers=HEADERS)).json()
        if damage == "reference":
            result["analysis"]["evidence_used"][0]["path"] = "/invented"
        if damage == "identity":
            result["record"]["id"] = str(uuid4())
        raw = "not-json" if damage == "json" else "x" * 65537 if damage == "oversize" else json.dumps(result)
        with sqlite3.connect(path) as db:
            db.execute("UPDATE mochi_analyses SET result=?", (raw,))
            if damage == "fingerprint":
                db.execute("UPDATE mochi_analyses SET context_hash='wrong'")
        response = await api.get("/api/ai/analyses", params={"finding_id": finding})
        assert response.status_code == 503 and response.json()["code"] == "stored_data_invalid"
        assert (await api.get("/api/reports/markdown?include_ai=true")).status_code == 503
        assert (await api.get("/api/reports/markdown")).status_code == 200


async def test_markdown_escapes_untrusted_ai_prose_and_keeps_only_latest(tmp_path):
    path = tmp_path / "markdown.db"
    provider = FakeProvider(lambda output: {**output, "summary": '<img src=x onerror=alert(1)> [fake](javascript:alert(1))\n# forged heading'})
    async with client(create_app(path)) as api:
        finding = await seed(api)
    service = AIService(Store(path), settings(), provider)
    first = await service.analyze(finding)
    second = save_history_variant(Store(path), first)
    assert first.record.id != second.record.id
    assert len(Store(path).analyses(finding)) == 2
    async with client(create_app(path)) as api:
        report = (await api.get("/api/reports/markdown?include_ai=true")).text
        assert "<img" not in report and "[fake](javascript:" not in report
        assert "&lt;img" in report and "\\# forged" in report
        assert second.record.id in report and first.record.id not in report
        assert (await api.get("/api/ai/analyses?finding_id=bad")).status_code == 422
        assert (await api.patch(f"/api/ai/analyses/{uuid4()}", json={"review_status": "reviewed"}, headers=HEADERS)).status_code == 404


async def test_historical_analysis_keeps_original_run_and_references(tmp_path):
    path = tmp_path / "historical.db"
    async with client(create_app(path, ai_settings=settings(), ai_provider=FakeProvider())) as api:
        original_finding = await seed(api)
        original = (await api.post("/api/ai/analyze", json={"finding_id": original_finding}, headers=HEADERS)).json()
        with sqlite3.connect(path) as db:
            evidence = json.loads(db.execute('SELECT evidence FROM runs WHERE id=?', (original['record']['run_id'],)).fetchone()[0])
            evidence[0]['body']['total'] = 999
            db.execute('UPDATE runs SET evidence=? WHERE id=?', (json.dumps(evidence), original['record']['run_id']))
        assert (await api.get('/api/ai/analyses', params={'finding_id': original_finding})).json()[0]['record']['evidence_status'] == 'historical'
        new_finding = await seed(api)
        snapshot = (await api.get("/api/workspace")).json()
        new_run = next(f["run_id"] for f in snapshot["findings"] if f["id"] == new_finding)
        # Simulate a future version changing a finding's association, only in this test DB.
        with sqlite3.connect(path) as db:
            details = json.loads(db.execute("SELECT details FROM findings WHERE id=?", (original_finding,)).fetchone()[0])
            details["run_id"] = new_run
            db.execute("UPDATE findings SET run_id=?, details=? WHERE id=?", (new_run, json.dumps(details), original_finding))
        response = await api.get("/api/ai/analyses", params={"finding_id": original_finding})
        assert response.status_code == 200
        historical = response.json()[0]
        assert historical["record"]["evidence_status"] == "historical"
        assert historical["record"]["run_id"] == original["record"]["run_id"] != new_run
        assert historical["analysis"] == original["analysis"]
        report = (await api.get("/api/reports/markdown?include_ai=true")).text
        assert "ANÁLISE HISTÓRICA" in report and original["record"]["run_id"] in report
        with sqlite3.connect(path) as db:
            context = json.loads(db.execute("SELECT source_context FROM mochi_analyses").fetchone()[0])
            context["evidence"][0]["facts"]["secret"] = "must-not-leak"
            db.execute("UPDATE mochi_analyses SET source_context=?", (json.dumps(context),))
        response = await api.get("/api/ai/analyses", params={"finding_id": original_finding})
        assert response.status_code == 503 and "must-not-leak" not in response.text


async def test_legacy_analysis_without_snapshot_is_preserved_when_context_matches(tmp_path):
    path = tmp_path / "legacy-analysis.db"
    async with client(create_app(path, ai_settings=settings(), ai_provider=FakeProvider())) as api:
        finding = await seed(api)
        original = (await api.post("/api/ai/analyze", json={"finding_id": finding}, headers=HEADERS)).json()
    legacy = json.loads(json.dumps(original))
    for key in ("run_id", "check_type", "evidence_status"):
        legacy["record"].pop(key)
    with sqlite3.connect(path) as db:
        db.execute("UPDATE mochi_analyses SET source_context=NULL, result=?", (json.dumps(legacy),))
    saved = Store(path).analyses(finding)[0]
    assert saved.record.id == original["record"]["id"]
    assert saved.record.run_id == original["record"]["run_id"]
    assert saved.record.evidence_status == "current"


async def test_invalid_output_never_creates_persisted_success(tmp_path):
    path = tmp_path / "rejected.db"
    provider = FakeProvider(lambda output: {**output, "evidence_used": []})
    async with client(create_app(path, ai_settings=settings(), ai_provider=provider)) as api:
        finding = await seed(api)
        assert (await api.post("/api/ai/analyze", json={"finding_id": finding}, headers=HEADERS)).status_code == 502
        assert (await api.get("/api/ai/analyses", params={"finding_id": finding})).json() == []


async def test_snapshot_column_migration_failure_is_recoverable(tmp_path, monkeypatch):
    path = tmp_path / "old-analysis-schema.db"
    async with client(create_app(path, ai_settings=settings(), ai_provider=FakeProvider())) as api:
        finding = await seed(api)
        original = (await api.post("/api/ai/analyze", json={"finding_id": finding}, headers=HEADERS)).json()
        assert "fake-test-key" not in json.dumps(original)
    with sqlite3.connect(path) as db:
        # Recreate the previous schema in this disposable fixture only.
        db.execute("ALTER TABLE mochi_analyses DROP COLUMN source_context")
        before = db.execute("SELECT id,finding_id,created_at,review_status,result,context_hash FROM mochi_analyses").fetchall()
    real_connect = sqlite3.connect
    class MigrationFailure(sqlite3.Connection):
        def execute(self, sql, *args, **kwargs):
            if "ALTER TABLE mochi_analyses" in sql:
                raise sqlite3.OperationalError("synthetic-migration-error")
            return super().execute(sql, *args, **kwargs)
    with monkeypatch.context() as patch:
        patch.setattr(sqlite3, "connect", lambda *a, **kw: real_connect(*a, **kw, factory=MigrationFailure))
        async with client(create_app(path)) as api:
            response = await api.get('/api/ai/analyses', params={'finding_id': finding})
            assert response.status_code == 503 and "synthetic-migration-error" not in response.text
    saved = Store(path).analyses(finding)[0]
    assert saved.record.id == original["record"]["id"]
    with sqlite3.connect(path) as db:
        after = db.execute("SELECT id,finding_id,created_at,review_status,result,context_hash FROM mochi_analyses").fetchall()
        assert after == before
        assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
