"""Local SQLite repository. Execution and finding are saved atomically."""
import json
import sqlite3
from pathlib import Path


class Store:
    def __init__(self, path: Path):
        self.path = path

    def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        try:
            connection.execute("PRAGMA foreign_keys = ON")
            connection.executescript("""
            CREATE TABLE IF NOT EXISTS runs (
                id TEXT PRIMARY KEY, created_at TEXT NOT NULL, mode TEXT NOT NULL,
                verdict TEXT NOT NULL, evidence TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS findings (
                id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id),
                review_status TEXT NOT NULL CHECK(review_status IN ('pending', 'reviewed')),
                details TEXT NOT NULL
            );
            """)
        except sqlite3.Error:
            connection.close()
            raise
        return connection

    def save(self, run: dict, finding: dict | None):
        connection = self.connect()
        try:
            with connection:
                connection.execute("INSERT INTO runs VALUES (?, ?, ?, ?, ?)", (
                    run["id"], run["created_at"], run["mode"], run["verdict"],
                    json.dumps(run["evidence"], ensure_ascii=False)))
                if finding:
                    connection.execute("INSERT INTO findings VALUES (?, ?, ?, ?)", (
                        finding["id"], run["id"], finding["review_status"],
                        json.dumps(finding, ensure_ascii=False)))
        finally:
            connection.close()

    def snapshot(self) -> dict:
        connection = self.connect()
        try:
            with connection:
                connection.execute("BEGIN")
                runs = [dict(row) for row in connection.execute("SELECT * FROM runs ORDER BY created_at DESC, id DESC")]
                findings = []
                for row in connection.execute("SELECT * FROM findings ORDER BY rowid DESC"):
                    finding = json.loads(row["details"])
                    finding["review_status"] = row["review_status"]
                    findings.append(finding)
                for run in runs:
                    run["evidence"] = json.loads(run["evidence"])
                return {"runs": runs, "findings": findings}
        finally:
            connection.close()

    def review(self, finding_id: str, status: str) -> bool:
        connection = self.connect()
        try:
            with connection:
                result = connection.execute("UPDATE findings SET review_status = ? WHERE id = ?", (status, finding_id))
                return result.rowcount == 1
        finally:
            connection.close()
