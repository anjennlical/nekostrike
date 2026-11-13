"""Durable reuse and version compatibility; all providers use blocked/mock transport."""
import json
import sqlite3
import pytest
from app.main import create_app
from app.store import Store
from app.ai.service import AIService
from app.ai.provider import AIError
from test_ai import FakeProvider, HEADERS, seed, settings
from test_ai_storage import client
from test_ai_usage import sdk_provider

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return 'asyncio'


async def prepared(path):
    provider = FakeProvider()
    async with client(create_app(path, ai_settings=settings(), ai_provider=provider)) as api:
        finding = await seed(api)
        original = (await api.post('/api/ai/analyze', headers=HEADERS, json={'finding_id': finding})).json()
        assert original['format_version'] == 1 and len(provider.contexts) == 1
    return finding, original


async def test_restart_reuses_saved_analysis_without_spending_attempt(tmp_path):
    path = tmp_path / 'restart.db'
    finding, original = await prepared(path)
    Store(path).review_analysis(original['record']['id'], 'reviewed')
    forbidden = FakeProvider(lambda _: pytest.fail('Saved analysis must not regenerate'))
    service = AIService(Store(path), settings(), forbidden)
    # Even a process with exhausted attempts must be able to reuse saved output.
    service.attempts = service.settings.max_requests
    result = await service.analyze(finding)
    assert result.cached and result.record.id == original['record']['id']
    assert result.record.review_status == 'reviewed'
    assert not forbidden.contexts and len(Store(path).analyses(finding)) == 1


async def test_changed_full_evidence_does_not_reuse_historical_output(tmp_path):
    path = tmp_path / 'changed.db'
    finding, original = await prepared(path)
    with sqlite3.connect(path) as db:
        evidence = json.loads(db.execute('SELECT evidence FROM runs WHERE id=?', (original['record']['run_id'],)).fetchone()[0])
        evidence[0]['body']['total'] = 999
        db.execute('UPDATE runs SET evidence=? WHERE id=?', (json.dumps(evidence), original['record']['run_id']))
    provider = FakeProvider()
    result = await AIService(Store(path), settings(), provider).analyze(finding)
    assert not result.cached and result.record.id != original['record']['id']
    assert len(provider.contexts) == 1
    assert {r.record.evidence_status for r in Store(path).analyses(finding)} == {'current', 'historical'}


async def test_mock_history_cannot_substitute_for_real_adapter_output(tmp_path):
    path = tmp_path / 'providers.db'
    finding, original = await prepared(path)
    wire_calls = []
    result = await AIService(Store(path), settings(), sdk_provider(wire_calls)).analyze(finding)
    assert result.provider == 'openai' and not result.cached
    assert result.record.id != original['record']['id'] and len(wire_calls) == 1


@pytest.mark.parametrize('damage', ['malformed_json', 'future_format'])
async def test_unreadable_saved_history_never_triggers_replacement_call(tmp_path, damage):
    path = tmp_path / 'damaged.db'
    finding, original = await prepared(path)
    original['format_version'] = 99
    raw = 'broken' if damage == 'malformed_json' else json.dumps(original)
    with sqlite3.connect(path) as db:
        db.execute('UPDATE mochi_analyses SET result=?', (raw,))
    provider = FakeProvider()
    service = AIService(Store(path), settings(), provider)
    with pytest.raises(AIError, match='storage_unavailable'):
        await service.analyze(finding)
    assert not provider.contexts and service.attempts == 0


async def test_unversioned_legacy_record_is_read_without_rewriting(tmp_path):
    path = tmp_path / 'legacy.db'
    finding, original = await prepared(path)
    original.pop('format_version')
    raw = json.dumps(original)
    with sqlite3.connect(path) as db:
        db.execute('UPDATE mochi_analyses SET result=?', (raw,))
    result = await AIService(Store(path), settings(), FakeProvider()).analyze(finding)
    assert result.format_version == 1 and result.cached
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT result FROM mochi_analyses').fetchone()[0] == raw
