"""Project saved evidence into a bounded, allowlisted factual context; never transmit raw bodies."""
import json
import re
import hashlib
from uuid import UUID
from .provider import AIError
from .schemas import Analysis

# Metadata contracts of the existing vulnerable fixtures. Checkers are unchanged.
CONTRACTS = {
    "bola": ("high", "API1:2023", [
        ("baseline", "/lab/orders/order-alice", "alice", "vulnerable", 200, 200),
        ("cross_user", "/lab/orders/order-bob", "alice", "vulnerable", 403, 200),
        ("negative_control", "/lab/orders/order-bob", "alice", "fixed", 403, 403)]),
    "data_exposure": ("medium", "API3:2023", [
        ("baseline", "/lab/profiles/alice", "bob", "fixed", 200, 200),
        ("profile_response", "/lab/profiles/alice", "bob", "vulnerable", 200, 200),
        ("negative_control", "/lab/profiles/alice", "anonymous", "fixed", 401, 401)]),
    "security_misconfiguration": ("medium", "API8:2023", [
        ("baseline", "/lab/status", "anonymous", "fixed", 200, 200),
        ("error_response", "/lab/error", "anonymous", "vulnerable", 500, 500),
        ("negative_control", "/lab/error", "anonymous", "fixed", 500, 500)]),
}


def source_fingerprint(source: dict) -> str:
    """Detect changes without persisting raw evidence or treating review as an evidence edit."""
    finding = {key: value for key, value in source['finding'].items() if key != 'review_status'}
    return hashlib.sha256(json.dumps({'finding': finding, 'run': source['run']}, sort_keys=True).encode()).hexdigest()


def require(condition):
    if not condition:
        raise ValueError("invalid evidence contract")


def prepare_context(source: dict, finding_id: str, limit: int) -> dict:
    try:
        details, run = source["finding"], source["run"]
        UUID(run["id"])
        severity, category, contracts = CONTRACTS[run["check_type"]]
        require(details["id"] == finding_id and details["run_id"] == run["id"])
        require(details["severity"] == severity and details["category"] == category)
        require(run["mode"] == "vulnerable" and run["verdict"] == "vulnerable")
        require(isinstance(run["evidence"], list) and len(run["evidence"]) == 3)
        evidence = []
        for index, (item, contract) in enumerate(zip(run["evidence"], contracts, strict=True)):
            scenario, path, actor, mode, expected, status = contract
            require(item["method"] == "GET")
            require(tuple(item[k] for k in ("scenario", "path", "actor", "lab_mode", "expected_status", "status")) == contract)
            body = item["body"]
            require(isinstance(body, dict))
            # Arbitrary text, titles, headers, secrets and body values never enter the prompt.
            if run["check_type"] == "bola" and index < 2:
                owner = "alice" if index == 0 else "bob"
                require(body.get("owner") == owner and body.get("id") == f"order-{owner}")
                facts = {"owner": owner, "owner_matches_actor": owner == actor}
            elif run["check_type"] == "data_exposure" and index < 2:
                required = {"id", "display_name"} | ({"email", "internal_note"} if index == 1 else set())
                require(set(body) == required)
                facts = {"public_fields": ["id", "display_name"],
                         "private_fields_returned": ["email", "internal_note"] if index == 1 else []}
            elif run["check_type"] == "security_misconfiguration":
                if index == 0:
                    require(body == {"status": "ok", "fixture": True})
                elif index == 1:
                    require(isinstance(body.get("debug"), dict) and set(body["debug"]) == {"exception", "file", "line"})
                else:
                    require(set(body) == {"detail"})
                facts = {"simulated": True, "debug_fields_returned": ["exception", "file", "line"] if index == 1 else []}
            else:
                require(set(body) == {"detail"})
                facts = {"access_denied": True}
            evidence.append({"evidence_id": f"{run['id']}:{scenario}", "path": path, "actor": actor,
                             "status": status, "method": "GET", "scenario": scenario,
                             "expected_status": expected, "lab_mode": mode, "facts": facts})
        context = {"finding_id": finding_id, "check_type": run["check_type"], "category": category,
                   "severity": severity, "verdict": run["verdict"], "educational_fixture": True,
                   "evidence": evidence}
    except (KeyError, ValueError, TypeError, AttributeError):
        raise AIError("invalid_evidence", "As evidências salvas não correspondem ao contrato deste laboratório.", 422) from None
    if len(json.dumps(context, ensure_ascii=False).encode()) > limit:
        raise AIError("input_too_large", "O contexto excede o limite configurado. Nenhum dado foi enviado.", 413)
    return context


def validate_analysis(analysis: Analysis, context: dict) -> None:
    references = [{key: item[key] for key in ("evidence_id", "path", "actor", "status")} for item in context["evidence"]]
    actual = [item.model_dump() for item in analysis.evidence_used]
    if analysis.finding_id != context["finding_id"] or sorted(actual, key=lambda x: x["evidence_id"]) != sorted(references, key=lambda x: x["evidence_id"]):
        raise AIError("ungrounded_output", "A resposta citou referências incompatíveis com as evidências e foi descartada.")
    prose = " ".join([analysis.summary, analysis.technical_explanation, analysis.potential_impact,
                      *analysis.recommendations, *analysis.limitations])
    # A conservative identifier filter supplements (not replaces) human semantic review.
    if re.search(r"https?://|www\.|/[A-Za-z_]|\b(?:\d{1,3}\.){3}\d{1,3}\b|\b[0-9a-f]{8}-[0-9a-f-]{27,}\b|\bCVSS\b", prose, re.I):
        raise AIError("ungrounded_output", "A resposta incluiu identificadores fora das referências estruturadas e foi descartada.")


def validate_saved_context(context: dict) -> str:
    """Validate an immutable, minimized snapshot against the fixed lab contracts.

    Returns the original run UUID. No current evidence is substituted here.
    """
    UUID(context["finding_id"])
    check = context["check_type"]
    severity, category, contracts = CONTRACTS[check]
    run_id = context["evidence"][0]["evidence_id"].split(":")[0]
    UUID(run_id)
    expected = {"finding_id": context["finding_id"], "check_type": check, "category": category,
                "severity": severity, "verdict": "vulnerable", "educational_fixture": True, "evidence": []}
    for index, (scenario, path, actor, mode, expected_status, status) in enumerate(contracts):
        if check == "bola" and index < 2:
            facts = {"owner": "alice" if index == 0 else "bob", "owner_matches_actor": index == 0}
        elif check == "data_exposure" and index < 2:
            facts = {"public_fields": ["id", "display_name"], "private_fields_returned": ["email", "internal_note"] if index == 1 else []}
        elif check == "security_misconfiguration":
            facts = {"simulated": True, "debug_fields_returned": ["exception", "file", "line"] if index == 1 else []}
        else:
            facts = {"access_denied": True}
        expected["evidence"].append({"evidence_id": f"{run_id}:{scenario}", "path": path, "actor": actor,
                                    "status": status, "method": "GET", "scenario": scenario,
                                    "expected_status": expected_status, "lab_mode": mode, "facts": facts})
    # JSON equality also distinguishes bool from int and rejects extra/untrusted fields.
    require(json.dumps(context, sort_keys=True) == json.dumps(expected, sort_keys=True))
    return run_id
