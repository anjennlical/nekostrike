"""Local SQLite repository. Execution and finding are saved atomically."""
import json
import sqlite3
from pathlib import Path
from .stored_data import StoredDataError, StoragePathError, decode_json, validate_snapshot


class Store:
    def __init__(self, path: Path):
        self.path = path

    def connect(self):
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
        except OSError:
            raise StoragePathError("local storage path unavailable") from None
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
            CREATE TABLE IF NOT EXISTS mochi_analyses (
                id TEXT PRIMARY KEY,
                finding_id TEXT NOT NULL REFERENCES findings(id),
                created_at TEXT NOT NULL,
                review_status TEXT NOT NULL CHECK(review_status IN ('pending', 'reviewed')),
                result TEXT NOT NULL,
                context_hash TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS mochi_analyses_finding ON mochi_analyses(finding_id, created_at);
            """)
            if "check_type" not in {row[1] for row in connection.execute("PRAGMA table_info(runs)")}:
                connection.execute("BEGIN IMMEDIATE")
                # Recheck after acquiring the lock: another reader may have migrated.
                if "check_type" not in {row[1] for row in connection.execute("PRAGMA table_info(runs)")}:
                    connection.execute("ALTER TABLE runs ADD COLUMN check_type TEXT NOT NULL DEFAULT 'bola'")
                connection.commit()
            for column in ("source_context", "source_hash"):
                if column not in {row[1] for row in connection.execute("PRAGMA table_info(mochi_analyses)")}:
                    connection.execute("BEGIN IMMEDIATE")
                    if column not in {row[1] for row in connection.execute("PRAGMA table_info(mochi_analyses)")}:
                        # Names are fixed constants, never request input.
                        connection.execute(f"ALTER TABLE mochi_analyses ADD COLUMN {column} TEXT")
                    connection.commit()
        except sqlite3.Error:
            connection.close()
            raise
        return connection

    def save(self, run: dict, finding: dict | None):
        connection = self.connect()
        try:
            with connection:
                connection.execute("INSERT INTO runs (id, created_at, mode, verdict, evidence, check_type) VALUES (?, ?, ?, ?, ?, ?)", (
                    run["id"], run["created_at"], run["mode"], run["verdict"],
                    json.dumps(run["evidence"], ensure_ascii=False), run.get("check_type", "bola")))
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
                    finding = decode_json(row["details"], dict)
                    if finding.get("id") != row["id"] or finding.get("run_id") != row["run_id"]:
                        raise StoredDataError("persisted identifiers mismatch")
                    finding["review_status"] = row["review_status"]
                    findings.append(finding)
                for run in runs:
                    run["evidence"] = decode_json(run["evidence"], list)
                validate_snapshot(runs, findings)
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

    def analysis_source(self, finding_id: str, max_bytes: int) -> dict | None:
        """Read only the requested finding, bounded before loading JSON into Python."""
        connection = self.connect()
        try:
            with connection:
                connection.execute("BEGIN")
                size = connection.execute("""SELECT length(CAST(f.details AS BLOB)) +
                    length(CAST(r.evidence AS BLOB)) FROM findings f JOIN runs r ON r.id=f.run_id
                    WHERE f.id=?""", (finding_id,)).fetchone()
                if size is None:
                    return None
                if size[0] > max_bytes:
                    raise OverflowError("analysis input too large")
                row = connection.execute("""SELECT f.details, r.* FROM findings f
                    JOIN runs r ON r.id=f.run_id WHERE f.id=?""", (finding_id,)).fetchone()
                run = dict(row)
                details = decode_json(run.pop("details"), dict)
                run["evidence"] = decode_json(run["evidence"], list)
                return {"finding": details, "run": run}
        finally:
            connection.close()

    def save_analysis(self, result, context_hash: str, context: dict, source_hash: str):
        """Called only after model/schema/evidence validation; immutable response per UUID."""
        connection = self.connect()
        try:
            with connection:
                connection.execute("""INSERT INTO mochi_analyses
                    (id, finding_id, created_at, review_status, result, context_hash, source_context, source_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING""", (
                    result.record.id, result.analysis.finding_id, result.record.created_at,
                    result.record.review_status, result.model_dump_json(), context_hash,
                    json.dumps(context, ensure_ascii=False), source_hash))
        finally:
            connection.close()

    def analyses(self, finding_id: str | None = None):
        """Validate stored output and its current evidence before displaying/exporting it."""
        from .ai.schemas import AnalysisResult
        from .ai.context import prepare_context, validate_analysis, validate_saved_context, source_fingerprint
        from .ai.provider import AIError
        from pydantic import ValidationError
        import hashlib

        snapshot = self.snapshot()
        findings = {f["id"]: f for f in snapshot["findings"]}
        runs = {r["id"]: r for r in snapshot["runs"]}
        connection = self.connect()
        try:
            # Bound each record before loading its JSON. No corrupt rows are silently skipped.
            rows = connection.execute("""SELECT id, finding_id, created_at, review_status, context_hash, source_hash,
                CASE WHEN length(CAST(result AS BLOB)) <= 65536 THEN result ELSE NULL END AS result,
                CASE WHEN length(CAST(source_context AS BLOB)) <= 16384 THEN source_context ELSE NULL END AS source_context,
                source_context IS NOT NULL AS has_context
                FROM mochi_analyses WHERE (? IS NULL OR finding_id=?) ORDER BY created_at DESC, id DESC""",
                (finding_id, finding_id)).fetchall()
            output = []
            for row in rows:
                try:
                    result = AnalysisResult.model_validate(decode_json(row["result"], dict))
                    if (result.record is None or result.storage_warning or result.record.id != row["id"]
                            or result.analysis.finding_id != row["finding_id"]
                            or result.record.created_at != row["created_at"]):
                        raise ValueError("record identity mismatch")
                    finding = findings[row["finding_id"]]
                    current_source = {"finding": finding, "run": runs[finding["run_id"]]}
                    try:
                        current = prepare_context(current_source, finding["id"], 16384)
                    except AIError:
                        current = None
                    context = decode_json(row["source_context"], dict) if row["has_context"] else current
                    if context is None:
                        raise ValueError("legacy context unavailable")
                    original_run = validate_saved_context(context)
                    digest = hashlib.sha256(json.dumps(context, sort_keys=True).encode()).hexdigest()
                    if (digest != row["context_hash"] or result.deterministic_verdict != context["verdict"]
                            or result.deterministic_severity != context["severity"]
                            or result.record.run_id not in (None, original_run)
                            or result.record.check_type not in (None, context["check_type"])):
                        raise ValueError("stored context mismatch")
                    validate_analysis(result.analysis, context)
                    # Review column is authoritative; validate it rather than trusting old JSON.
                    data = result.model_dump()
                    source_hash = row["source_hash"]
                    if source_hash is not None and (not isinstance(source_hash, str) or len(source_hash) != 64 or any(c not in '0123456789abcdef' for c in source_hash)):
                        raise ValueError("invalid source fingerprint")
                    unchanged = current == context and (source_hash is None or source_hash == source_fingerprint(current_source))
                    data["record"]["review_status"] = row["review_status"]
                    data["record"].update(run_id=original_run, check_type=context["check_type"],
                                           evidence_status="current" if unchanged else "historical")
                    output.append(AnalysisResult.model_validate(data))
                except (ValueError, TypeError, KeyError, IndexError, AttributeError, ValidationError, AIError):
                    raise StoredDataError("invalid persisted analysis") from None
            return output
        finally:
            connection.close()

    def review_analysis(self, analysis_id: str, status: str) -> bool:
        # Fail closed before updating malformed history.
        self.analyses()
        connection = self.connect()
        try:
            with connection:
                return connection.execute("UPDATE mochi_analyses SET review_status=? WHERE id=?",
                                          (status, analysis_id)).rowcount == 1
        finally:
            connection.close()
