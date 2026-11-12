"""Validate persisted read contracts without repairing or discarding stored records."""
import json
from datetime import datetime
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, ValidationError


class StoredDataError(ValueError):
    """A saved record cannot safely be presented as valid history."""


class StoragePathError(OSError):
    """The configured local database directory cannot be accessed."""


def decode_json(value: str, expected: type):
    def reject_constant(value):
        raise ValueError("non-finite JSON")

    try:
        result = json.loads(value, parse_constant=reject_constant)
        if not isinstance(result, expected):
            raise ValueError("unexpected JSON type")
        return result
    except (ValueError, TypeError, RecursionError):
        raise StoredDataError("invalid persisted JSON") from None


Text = Annotated[str, Field(min_length=1)]


class Record(BaseModel):
    # Keep unknown fields unchanged for forward compatibility; validate consumed fields.
    model_config = ConfigDict(strict=True, extra="allow")


class EvidenceRecord(Record):
    scenario: Literal["baseline", "cross_user", "profile_response", "error_response", "negative_control"]
    method: Literal["GET"]
    path: Text
    actor: Text
    lab_mode: Literal["vulnerable", "fixed"]
    expected_status: int = Field(ge=100, le=599)
    status: int = Field(ge=100, le=599)
    body: dict


class RunRecord(Record):
    id: Text
    created_at: Text
    mode: Literal["vulnerable", "fixed"]
    verdict: Literal["vulnerable", "protected"]
    check_type: Literal["bola", "data_exposure", "security_misconfiguration"]
    evidence: list[EvidenceRecord] = Field(min_length=3, max_length=3)


class FindingRecord(Record):
    id: Text
    run_id: Text
    title: Text
    category: Text
    reference: Text
    impact: Text
    remediation: Text
    severity_reason: Text
    severity: Literal["high", "medium"]
    review_status: Literal["pending", "reviewed"]


def validate_snapshot(runs: list[dict], findings: list[dict]) -> None:
    try:
        by_id = {}
        for data in runs:
            run = RunRecord.model_validate(data)
            datetime.fromisoformat(run.created_at)
            target = {"bola": "cross_user", "data_exposure": "profile_response",
                      "security_misconfiguration": "error_response"}[run.check_type]
            if [e.scenario for e in run.evidence] != ["baseline", target, "negative_control"]:
                raise ValueError("invalid evidence sequence")
            by_id[run.id] = run
        for data in findings:
            finding = FindingRecord.model_validate(data)
            run = by_id[finding.run_id]
            category = {"bola": "API1:2023", "data_exposure": "API3:2023",
                        "security_misconfiguration": "API8:2023"}[run.check_type]
            severity = "high" if run.check_type == "bola" else "medium"
            if run.verdict != "vulnerable" or finding.category != category or finding.severity != severity:
                raise ValueError("inconsistent finding")
    except (ValidationError, ValueError, TypeError, KeyError, RecursionError):
        raise StoredDataError("invalid persisted record") from None
