"""Reliability checks use temporary storage and the globally blocked real transport."""
import asyncio
import threading
import sqlite3
from uuid import uuid4
import httpx
import pytest
from app.main import create_app
from app.store import Store
from app.ai.config import AISettings

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return 'asyncio'


async def test_slow_run_write_does_not_freeze_health_or_configuration(tmp_path, monkeypatch):
    entered = threading.Event()
    release = threading.Event()
    timed_out = threading.Event()
    original = Store.save

    def slow_save(self, run, finding):
        entered.set()
        if not release.wait(2):
            timed_out.set()
        return original(self, run, finding)

    monkeypatch.setattr(Store, 'save', slow_save)
    app = create_app(tmp_path / 'slow.db', ai_settings=AISettings())
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://127.0.0.1') as api:
        pending = asyncio.create_task(api.post('/api/runs', json={'mode': 'vulnerable'}, headers={'X-NekoStrike-Client': 'workspace'}))
        try:
            assert await asyncio.to_thread(entered.wait, 3)
            health, config = await asyncio.wait_for(asyncio.gather(api.get('/api/health'), api.get('/api/ai/status')), 1)
            assert not timed_out.is_set(), 'SQLite write blocked the event loop until its wait expired'
            assert health.status_code == config.status_code == 200
            assert config.json()['status'] == 'disabled'
        finally:
            release.set()
            result = await pending
        assert result.status_code == 201
        snapshot = (await api.get('/api/workspace')).json()
        assert len(snapshot['runs']) == len(snapshot['findings']) == 1


async def test_missing_entities_and_local_only_routes(tmp_path):
    app = create_app(tmp_path/'missing.db', ai_settings=AISettings())
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://127.0.0.1') as api:
        absent = str(uuid4())
        headers = {'X-NekoStrike-Client': 'workspace'}
        assert (await api.get('/api/ai/analyses', params={'finding_id': absent})).json() == []
        assert (await api.patch('/api/findings/'+absent, json={'review_status':'reviewed'}, headers=headers)).status_code == 404
        assert (await api.patch('/api/ai/analyses/'+absent, json={'review_status':'reviewed'}, headers=headers)).status_code == 404
        assert (await api.post('/api/ai/analyze',json={'finding_id':absent},headers=headers)).status_code == 503
        assert (await api.get('/lab/orders/order-bob')).status_code == 404
        assert (await api.post('/api/runs', json={'mode':'vulnerable','target':'https://example.invalid'},headers=headers)).status_code == 422
        assert (await api.get('/api/health', headers={'Host':'external.invalid'})).status_code == 400


async def test_concurrent_local_checks_keep_evidence_and_findings_linked(tmp_path):
    app = create_app(tmp_path/'parallel.db', ai_settings=AISettings())
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://127.0.0.1') as api:
        results = await asyncio.gather(*(api.post('/api/runs',json={'mode':mode,'check_type':check},
            headers={'X-NekoStrike-Client':'workspace'}) for check in ('bola','data_exposure','security_misconfiguration') for mode in ('vulnerable','fixed')))
        assert all(r.status_code==201 for r in results)
        snapshot=(await api.get('/api/workspace')).json()
        runs={r['id']:r for r in snapshot['runs']}
        assert len(runs)==6 and len(snapshot['findings'])==3
        assert all(r['verdict']==('vulnerable' if r['mode']=='vulnerable' else 'protected') for r in runs.values())
        assert all(len(r['evidence'])==3 for r in runs.values())
        assert all(runs[f['run_id']]['verdict']=='vulnerable' for f in snapshot['findings'])


async def test_failed_run_write_is_sanitized_and_recovers_without_false_success(tmp_path, monkeypatch):
    path=tmp_path/'recovery.db'
    original=Store.save
    def unavailable(*args):
        raise sqlite3.OperationalError('private-path-diagnostic')
    app=create_app(path, ai_settings=AISettings())
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://127.0.0.1') as api:
        before=(await api.get('/api/workspace')).json()
        monkeypatch.setattr(Store,'save',unavailable)
        response=await api.post('/api/runs',json={'mode':'vulnerable'},headers={'X-NekoStrike-Client':'workspace'})
        assert response.status_code==503 and response.json()['code']=='storage_unavailable'
        assert 'private-path' not in response.text
        assert (await api.get('/api/workspace')).json()==before
        monkeypatch.setattr(Store,'save',original)
        response=await api.post('/api/runs',json={'mode':'fixed'},headers={'X-NekoStrike-Client':'workspace'})
        assert response.status_code==201
        saved=(await api.get('/api/workspace')).json()
        assert len(saved['runs'])==1 and not saved['findings']
