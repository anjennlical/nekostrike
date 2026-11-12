"""Fault injection is restricted to pytest temporary databases."""
import json
import sqlite3
from contextlib import closing
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import create_app

pytestmark = pytest.mark.anyio
HEADERS = {"X-NekoStrike-Client": "workspace", "Origin": "http://127.0.0.1:5173"}


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.parametrize("table,column,bad", [
    ("runs", "evidence", '{secret invalid json'),
    ("findings", "details", '{secret invalid json'),
    ("runs", "evidence", 'null'),
    ("runs", "evidence", '{}'),
    ("findings", "details", '[]'),
    ("findings", "details", 'null'),
    ("findings", "details", '{}'),
    ("runs", "evidence", '[NaN]'),
])
async def test_invalid_data_fails_closed_and_recovers_without_deleting(tmp_path, table, column, bad):
    path = tmp_path / "history.db"
    app = create_app(path)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://127.0.0.1") as client:
        await client.post("/api/runs", json={"mode": "vulnerable"}, headers=HEADERS)
        before = (await client.get("/api/workspace")).json()
        finding = before["findings"][0]["id"]
        await client.patch(f"/api/findings/{finding}", json={"review_status": "reviewed"}, headers=HEADERS)
        before = (await client.get("/api/workspace")).json()
        report = (await client.get("/api/reports/markdown")).text
        # Identifiers in this SQL come only from the fixed parametrization above.
        with closing(sqlite3.connect(path)) as db:
            saved = db.execute(f"SELECT {column} FROM {table}").fetchone()[0]
            with db:
                db.execute(f"UPDATE {table} SET {column}=?", (bad,))
        for endpoint in ("/api/workspace", "/api/reports/markdown"):
            result = await client.get(endpoint)
            assert result.status_code == 503
            assert result.headers["content-type"].startswith("application/json")
            assert result.headers["cache-control"] == "no-store"
            assert "Preserve o banco" in result.json()["detail"]
            assert "secret" not in result.text and str(path) not in result.text
            assert "content-disposition" not in result.headers
        assert (await client.get("/api/health")).status_code == 200  # Liveness only.
        with closing(sqlite3.connect(path)) as db:
            assert db.execute(f"SELECT {column} FROM {table}").fetchone()[0] == bad
            assert db.execute("SELECT COUNT(*) FROM runs").fetchone()[0] == 1
            assert db.execute("SELECT COUNT(*) FROM findings").fetchone()[0] == 1
            with db:
                db.execute(f"UPDATE {table} SET {column}=?", (saved,))
        assert (await client.get("/api/workspace")).json() == before
        assert (await client.get("/api/reports/markdown")).text == report


@pytest.mark.parametrize("mutation", ["missing_field", "id_mismatch", "severity", "orphan", "bad_evidence", "bad_date"])
async def test_semantically_malformed_saved_contract_is_not_reported_as_success(tmp_path, mutation):
    path = tmp_path / "history.db"
    async with AsyncClient(transport=ASGITransport(app=create_app(path)), base_url="http://127.0.0.1") as client:
        await client.post("/api/runs", json={"mode": "vulnerable"}, headers=HEADERS)
        state = (await client.get("/api/workspace")).json()
        finding = state["findings"][0]
        with closing(sqlite3.connect(path)) as db:
            with db:
                if mutation == "missing_field":
                    del finding["severity_reason"]
                elif mutation == "id_mismatch":
                    finding["id"] = "invented"
                elif mutation == "severity":
                    finding["severity"] = "medium"
                elif mutation == "orphan":
                    finding["run_id"] = "missing"
                    db.execute("UPDATE findings SET run_id='missing'")
                elif mutation == "bad_evidence":
                    evidence = state["runs"][0]["evidence"]
                    evidence[0]["status"] = "200"
                    db.execute("UPDATE runs SET evidence=?", (json.dumps(evidence),))
                elif mutation == "bad_date":
                    db.execute("UPDATE runs SET created_at='not a date'")
                db.execute("UPDATE findings SET details=?", (json.dumps(finding),))
        for endpoint in ("/api/workspace", "/api/reports/markdown"):
            assert (await client.get(endpoint)).status_code == 503


async def test_invalid_parent_blocks_reads_writes_and_recovers(tmp_path):
    parent = tmp_path / "blocked"
    parent.write_text("preserve this file", encoding="utf-8")
    app = create_app(parent / "history.db")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://127.0.0.1") as client:
        for method, endpoint, body in [
            ("GET", "/api/workspace", None), ("GET", "/api/reports/markdown", None),
            ("POST", "/api/runs", {"mode": "vulnerable"}),
            ("PATCH", "/api/findings/missing", {"review_status": "reviewed"}),
        ]:
            response = await client.request(method, endpoint, json=body, headers=HEADERS)
            assert response.status_code == 503
            assert "Armazenamento" in response.json()["detail"]
            assert str(parent) not in response.text
        assert parent.read_text(encoding="utf-8") == "preserve this file"
        assert (await client.get("/api/health")).status_code == 200
        # Move just this known temporary file, preserving it, and retry the same app.
        parent.rename(tmp_path / "preserved-file.txt")
        assert (await client.get("/api/workspace")).json() == {"runs": [], "findings": []}
        assert (await client.post("/api/runs", json={"mode": "vulnerable"}, headers=HEADERS)).status_code == 201
        recovered = (await client.get("/api/workspace")).json()
        assert len(recovered["runs"]) == len(recovered["findings"]) == 1


async def test_permission_error_at_directory_boundary_is_sanitized(tmp_path, monkeypatch):
    from pathlib import Path
    parent = tmp_path / "denied"
    original = Path.mkdir
    def denied(path, *args, **kwargs):
        if path == parent:
            raise PermissionError("secret OS diagnostics")
        return original(path, *args, **kwargs)
    monkeypatch.setattr(Path, "mkdir", denied)
    async with AsyncClient(transport=ASGITransport(app=create_app(parent / "db")), base_url="http://127.0.0.1") as client:
        result = await client.get("/api/workspace")
        assert result.status_code == 503 and "secret" not in result.text
