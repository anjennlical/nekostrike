import json
import sqlite3
import pytest
from fastapi import FastAPI, Header
from fastapi.responses import JSONResponse, PlainTextResponse
from httpx import ASGITransport, AsyncClient
from app.main import create_app
from app.exposure import create_profile_lab, PUBLIC_PROFILE, FULL_PROFILE
from app.store import Store

pytestmark = pytest.mark.anyio
HEADERS = {"X-NekoStrike-Client": "workspace", "Origin": "http://127.0.0.1:5173"}

@pytest.fixture
def anyio_backend():
    return "asyncio"

async def test_exposure_real_responses_review_report_and_restart(tmp_path):
    db = tmp_path / 'mixed.db'
    async with AsyncClient(transport=ASGITransport(app=create_app(db)), base_url='http://127.0.0.1') as client:
        old = (await client.post('/api/runs', json={'mode': 'vulnerable'}, headers=HEADERS)).json()
        assert old['check_type'] == 'bola'
        for mode, verdict, body in [('vulnerable', 'vulnerable', FULL_PROFILE), ('fixed', 'protected', PUBLIC_PROFILE)]:
            response = await client.post('/api/runs', json={'mode': mode, 'check_type': 'data_exposure'}, headers=HEADERS)
            assert response.status_code == 201
            run = response.json()
            assert run['check_type'] == 'data_exposure' and run['verdict'] == verdict
            assert [e['status'] for e in run['evidence']] == [200, 200, 401]
            assert run['evidence'][1]['body'] == body
            assert 'Bearer' not in response.text
        state = (await client.get('/api/workspace')).json()
        assert len(state['runs']) == 3 and len(state['findings']) == 2
        finding = next(f for f in state['findings'] if f['category'] == 'API3:2023')
        assert finding['severity'] == 'medium'
        await client.patch('/api/findings/' + finding['id'], json={'review_status':'reviewed'}, headers=HEADERS)
        report = (await client.get('/api/reports/markdown')).text
        for content in ['Alta: 1 | Média: 1', 'data_exposure', 'API3:2023', 'email', 'internal_note', 'sem IA']:
            assert content in report
        assert (await client.get('/lab/profiles/alice')).status_code == 404
    async with AsyncClient(transport=ASGITransport(app=create_app(db)), base_url='http://127.0.0.1') as client:
        state = (await client.get('/api/workspace')).json()
        assert len(state['runs']) == 3
        assert next(f for f in state['findings'] if f['id'] == finding['id'])['review_status'] == 'reviewed'

async def test_profile_fixture_requires_identity_and_minimizes_output():
    async with AsyncClient(transport=ASGITransport(app=create_profile_lab(protected=True)), base_url='http://lab.internal') as client:
        assert (await client.get('/lab/profiles/alice')).status_code == 401
        assert (await client.get('/lab/profiles/alice', headers={'Authorization':'Bearer unknown'})).status_code == 401
        assert (await client.get('/lab/profiles/alice', headers={'Authorization':'Bearer fixture-bob'})).json() == PUBLIC_PROFILE

@pytest.mark.parametrize('bad', ['unknown', None, {'url':'https://example.com'}])
async def test_check_allowlist_rejects_unknown_values(tmp_path, bad):
    async with AsyncClient(transport=ASGITransport(app=create_app(tmp_path/'db')), base_url='http://127.0.0.1') as client:
        assert (await client.post('/api/runs', json={'mode':'vulnerable','check_type':bad}, headers=HEADERS)).status_code == 422
        assert (await client.get('/api/workspace')).json() == {'runs':[], 'findings':[]}

@pytest.mark.parametrize('fault', ['baseline', 'target_body', 'target_status', 'non_json', 'negative_control'])
async def test_unexpected_responses_are_inconclusive_and_not_saved(tmp_path, monkeypatch, fault):
    def broken_lab(*, protected):
        lab = FastAPI()
        @lab.get('/lab/profiles/alice')
        def profile(authorization: str | None = Header(default=None)):
            if authorization is None:
                return JSONResponse({'detail':'Identidade fictícia necessária'}, status_code=200 if fault=='negative_control' else 401)
            if protected:
                return {} if fault == 'baseline' else PUBLIC_PROFILE
            if fault == 'non_json': return PlainTextResponse('bad json')
            if fault == 'target_status': return JSONResponse(FULL_PROFILE, status_code=500)
            if fault == 'target_body': return {**PUBLIC_PROFILE, 'unexpected': 'value'}
            return FULL_PROFILE
        return lab
    monkeypatch.setattr('app.exposure.create_profile_lab', broken_lab)
    async with AsyncClient(transport=ASGITransport(app=create_app(tmp_path/'db')), base_url='http://127.0.0.1') as client:
        response = await client.post('/api/runs', json={'mode':'vulnerable','check_type':'data_exposure'}, headers=HEADERS)
        assert response.status_code == 502
        assert 'inconclusivo' in response.text
        assert (await client.get('/api/workspace')).json() == {'runs':[], 'findings':[]}

async def test_legacy_migration_preserves_evidence_ids_and_review(tmp_path):
    path = tmp_path/'legacy.db'
    # Capture a complete real BOLA record, then represent it in the legacy schema.
    async with AsyncClient(transport=ASGITransport(app=create_app(tmp_path/'source.db')), base_url='http://127.0.0.1') as client:
        await client.post('/api/runs', json={'mode':'vulnerable'}, headers=HEADERS)
        original = (await client.get('/api/workspace')).json()
    run, finding = original['runs'][0], original['findings'][0]
    with sqlite3.connect(path) as db:
        db.executescript('CREATE TABLE runs (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, mode TEXT NOT NULL, verdict TEXT NOT NULL, evidence TEXT NOT NULL); CREATE TABLE findings (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), review_status TEXT NOT NULL, details TEXT NOT NULL);')
        db.execute('INSERT INTO runs VALUES (?,?,?,?,?)', (run['id'],run['created_at'],run['mode'],run['verdict'],json.dumps(run['evidence'])))
        db.execute('INSERT INTO findings VALUES (?,?,?,?)', (finding['id'],finding['run_id'],'reviewed',json.dumps(finding)))
    for _ in range(2):
        state = Store(path).snapshot()
        assert state['runs'] == [run]
        assert state['findings'] == [{**finding, 'review_status': 'reviewed'}]
