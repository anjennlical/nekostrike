"""Create and verify a consistent local SQLite backup without modifying user history."""
from datetime import datetime, timezone
from contextlib import closing
import json
from pathlib import Path
import sqlite3
import uuid

ROOT = Path(__file__).resolve().parents[2]
source = ROOT / "backend/data/nekostrike.db"
if not source.is_file():
    raise SystemExit("Nenhum banco local encontrado. Execute um cenário antes de criar backup.")
folder = ROOT / ".local/backups"
folder.mkdir(parents=True, exist_ok=True)
stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
target = folder / f"nekostrike-{stamp}-{uuid.uuid4().hex[:6]}.db"
with closing(sqlite3.connect(source.as_uri() + "?mode=ro", uri=True)) as original:
    with closing(sqlite3.connect(target)) as backup:
        original.backup(backup)
        if backup.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise RuntimeError("O backup não passou na verificação de integridade.")
        counts = {table: backup.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                  for table in ("runs", "findings")}
print(json.dumps({"backup": str(target), "integrity": "ok", "counts": counts}, ensure_ascii=False))
