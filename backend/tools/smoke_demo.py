"""Repeatable API demonstration using only a disposable database, never user history."""
import asyncio
import json
from pathlib import Path
import sys
import tempfile

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
from httpx import ASGITransport, AsyncClient
from app.main import create_app


async def main():
    output = BACKEND.parent / ".local" / "validation"
    output.mkdir(parents=True, exist_ok=True)
    headers = {"X-NekoStrike-Client": "workspace", "Origin": "http://127.0.0.1:5173"}
    with tempfile.TemporaryDirectory(prefix="nekostrike-demo-") as temporary:
        database = Path(temporary) / "demo.db"
        async with AsyncClient(transport=ASGITransport(app=create_app(database)), base_url="http://127.0.0.1") as client:
            assert (await client.get("/api/workspace")).json() == {"runs": [], "findings": []}
            for check in ["bola", "data_exposure", "security_misconfiguration"]:
                for mode, verdict in [("vulnerable", "vulnerable"), ("fixed", "protected")]:
                    response = await client.post("/api/runs", json={"mode": mode, "check_type": check}, headers=headers)
                    assert response.status_code == 201, response.text
                    assert response.json()["verdict"] == verdict
            snapshot = (await client.get("/api/workspace")).json()
            assert len(snapshot["runs"]) == 6 and len(snapshot["findings"]) == 3
            finding_id = snapshot["findings"][0]["id"]
            review = await client.patch(f"/api/findings/{finding_id}", json={"review_status": "reviewed"}, headers=headers)
            assert review.status_code == 200
        async with AsyncClient(transport=ASGITransport(app=create_app(database)), base_url="http://127.0.0.1") as restarted:
            saved = (await restarted.get("/api/workspace")).json()
            assert saved["findings"][0]["review_status"] == "reviewed"
            assert len(saved["runs"]) == 6
            report = await restarted.get("/api/reports/markdown")
            assert report.status_code == 200 and "Execuções: 6 | Achados: 3 | Alta: 1 | Média: 2" in report.text
            assert "Revisados: 1" in report.text and "sem IA" in report.text
            (output / "demo-report.md").write_text(report.text, encoding="utf-8")
            (output / "demo-evidence.json").write_text(json.dumps(saved, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Demo aprovada: 3 verificadores, 6 execuções, 3 achados, revisão persistida, relatório sem IA. Banco temporário descartado.")


if __name__ == "__main__":
    asyncio.run(main())
