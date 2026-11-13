"""SDK wire metadata + complete local flows. Global conftest forbids real HTTP/.env."""
import json
import re
import sqlite3
import httpx
import pytest
from app.ai.config import AISettings
from app.ai.provider import OpenAIProvider
from app.main import create_app
from app.store import Store
from app.ai.service import AIService
from test_ai import HEADERS, settings, seed, response_envelope, valid_output, FakeProvider
from test_ai_storage import client, save_history_variant
from app.ai.context import prepare_context

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


USAGE = {"input_tokens": 763, "output_tokens": 680, "total_tokens": 1443,
         "input_tokens_details": {"cached_tokens": 0, "cache_write_tokens": 100},
         "output_tokens_details": {"reasoning_tokens": 217}}


def sdk_provider(calls, usage=USAGE, tier="default"):
    def handler(request):
        payload = json.loads(request.content)
        calls.append(payload)
        assert payload["service_tier"] == "default" and payload["store"] is False
        assert payload["tools"] == [] and payload["max_output_tokens"] == 4096
        response = response_envelope(valid_output(json.loads(payload["input"])))
        response.update(usage=usage, service_tier=tier, model="test-model-returned")
        return httpx.Response(200, json=response)
    return OpenAIProvider(settings(), transport=httpx.MockTransport(handler))


@pytest.mark.parametrize("check", ["bola", "data_exposure", "security_misconfiguration"])
async def test_complete_flow_tracks_original_usage_without_new_calls(tmp_path, check):
    path, calls = tmp_path / "e2e.db", []
    async with client(create_app(path, ai_settings=settings(), ai_provider=sdk_provider(calls))) as api:
        finding = await seed(api, check)
        before = (await api.get("/api/workspace")).json()
        response = await api.post("/api/ai/analyze", json={"finding_id": finding}, headers=HEADERS)
        assert response.status_code == 200
        result = response.json()
        consumption = result["consumption"]
        assert result["model"] == consumption["reported_model"] == "test-model-returned"
        assert consumption["service_tier"] == "default" and consumption["usage_status"] == "reported"
        assert consumption["usage"] == {"input_tokens": 763, "output_tokens": 680, "total_tokens": 1443,
                                       "cached_tokens": 0, "cache_write_tokens": 100, "reasoning_tokens": 217}
        assert result["record"]["run_id"] == before["findings"][0]["run_id"]
        cached = (await api.post("/api/ai/analyze", json={"finding_id": finding}, headers=HEADERS)).json()
        assert cached["cached"] and cached["consumption"] == consumption
        assert cached["record"]["id"] == result["record"]["id"] and len(calls) == 1
    forbidden = FakeProvider(lambda _: pytest.fail("Local reads must not invoke provider"))
    async with client(create_app(path, ai_settings=AISettings(), ai_provider=forbidden)) as api:
        saved = (await api.get("/api/ai/analyses", params={"finding_id": finding})).json()
        assert saved == [result]
        reviewed = await api.patch(f'/api/ai/analyses/{result["record"]["id"]}', headers=HEADERS,
                                   json={"review_status": "reviewed"})
        assert reviewed.status_code == 200
        latest = (await api.get("/api/ai/analyses", params={"finding_id": finding})).json()[0]
        assert latest["consumption"] == consumption and latest["record"]["review_status"] == "reviewed"
        assert (await api.get("/api/workspace")).json() == before
        plain = (await api.get("/api/reports/markdown")).text
        report = (await api.get("/api/reports/markdown?include_ai=true")).text
        assert "total 1443 tokens" in report and "raciocínio: 217 (já incluído na saída)" in report
        assert result["record"]["id"] in report and "total 1443 tokens" not in plain
        for evidence in result["analysis"]["evidence_used"]:
            assert evidence["evidence_id"] in re.sub(r"\\(.)", r"\1", report)
        assert len(calls) == 1 and not forbidden.contexts


@pytest.mark.parametrize("usage,status", [
    (None, "not_provided"),
    ({"input_tokens": 5, "output_tokens": 3, "total_tokens": 8}, "reported"),
    ({**USAGE, "total_tokens": 1660}, "invalid"),
    ({**USAGE, "input_tokens": -1}, "invalid"),
    ({**USAGE, "input_tokens": True}, "invalid"),
    ({**USAGE, "output_tokens_details": {"reasoning_tokens": 681}}, "invalid"),
    ({**USAGE, "input_tokens_details": {"cached_tokens": 764}}, "invalid"),
])
async def test_absent_and_invalid_usage_never_fabricates_zero(tmp_path, usage, status):
    calls = []
    async with client(create_app(tmp_path / "usage.db", ai_settings=settings(), ai_provider=sdk_provider(calls, usage, None))) as api:
        finding = await seed(api)
        result = (await api.post("/api/ai/analyze", json={"finding_id": finding}, headers=HEADERS)).json()
        assert result["consumption"]["usage_status"] == status
        assert result["consumption"]["service_tier"] is None
        if status != "reported":
            assert result["consumption"]["usage"] is None
        else:
            assert result["consumption"]["usage"]["cached_tokens"] is None
            assert result["consumption"]["usage"]["reasoning_tokens"] is None
        assert result["record"] and len(calls) == 1


async def test_failed_storage_keeps_consumption_without_retry(tmp_path, monkeypatch):
    calls = []
    async with client(create_app(tmp_path / "failure.db", ai_settings=settings(), ai_provider=sdk_provider(calls))) as api:
        finding = await seed(api)
        def fail(*args):
            raise sqlite3.OperationalError("test only")
        monkeypatch.setattr(Store, "save_analysis", fail)
        result = (await api.post("/api/ai/analyze", json={"finding_id": finding}, headers=HEADERS)).json()
        assert result["storage_warning"] and result["record"] is None
        assert result["consumption"]["usage"]["total_tokens"] == 1443 and len(calls) == 1


async def test_distinct_saved_analyses_keep_their_own_usage_and_effective_tier(tmp_path):
    path, calls = tmp_path / "history.db", []
    async with client(create_app(path)) as api:
        finding = await seed(api)
    first = await AIService(Store(path), settings(), sdk_provider(calls)).analyze(finding)
    second_usage = {"input_tokens": 10, "output_tokens": 20, "total_tokens": 30}
    context = prepare_context(Store(path).analysis_source(finding, 12000), finding, 12000)
    envelope = await sdk_provider(calls, second_usage, "flex").analyze(context)
    second = save_history_variant(Store(path), first, consumption=envelope.consumption)
    saved = {entry.record.id: entry for entry in Store(path).analyses(finding)}
    assert saved[first.record.id].consumption.usage.total_tokens == 1443
    assert saved[second.record.id].consumption.usage.total_tokens == 30
    assert saved[first.record.id].consumption.service_tier == "default"
    # Effective response tier is not overwritten with the requested standard tier.
    assert saved[second.record.id].consumption.service_tier == "flex"
    assert len(calls) == 2 and all(call["service_tier"] == "default" for call in calls)
