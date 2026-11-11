import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse, PlainTextResponse
from httpx import ASGITransport, AsyncClient
from app.main import create_app
from app.misconfiguration import BASELINE, GENERIC_ERROR, VERBOSE_ERROR, create_error_lab

pytestmark = pytest.mark.anyio
HEADERS = {"X-NekoStrike-Client": "workspace", "Origin": "http://127.0.0.1:5173"}


@pytest.fixture
def anyio_backend():
    return "asyncio"


async def test_mixed_checks_persist_review_and_report(tmp_path):
    database = tmp_path / 'mixed.db'
    app = create_app(database)
    assert not app.debug and not create_error_lab(protected=False).debug
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://127.0.0.1') as client:
        for check in ['bola', 'data_exposure', 'security_misconfiguration']:
            for mode in ['vulnerable', 'fixed']:
                response = await client.post('/api/runs', json={'mode':mode, 'check_type':check}, headers=HEADERS)
                assert response.status_code == 201
                run = response.json()
                assert run['verdict'] == ('vulnerable' if mode == 'vulnerable' else 'protected')
                if check == 'security_misconfiguration':
                    assert [e['status'] for e in run['evidence']] == [200, 500, 500]
                    assert run['evidence'][1]['body'] == (VERBOSE_ERROR if mode == 'vulnerable' else GENERIC_ERROR)
                    assert run['evidence'][2]['body'] == GENERIC_ERROR
                    assert all(e['actor'] == 'anonymous' for e in run['evidence'])
        state = (await client.get('/api/workspace')).json()
        assert len(state['runs']) == 6 and len(state['findings']) == 3
        finding = next(f for f in state['findings'] if f['category'] == 'API8:2023')
        assert finding['severity'] == 'medium'
        assert (await client.patch('/api/findings/'+finding['id'], json={'review_status':'reviewed'}, headers=HEADERS)).status_code == 200
        for path in ['/lab/error', '/lab/status', '/lab/profiles/alice']:
            assert (await client.get(path)).status_code == 404
        assert (await client.get('/api/health')).json()['ai']['status'] == 'not_implemented'
    async with AsyncClient(transport=ASGITransport(app=create_app(database)), base_url='http://127.0.0.1') as client:
        state = (await client.get('/api/workspace')).json()
        assert len(state['runs']) == 6
        assert next(f for f in state['findings'] if f['id'] == finding['id'])['review_status'] == 'reviewed'
        report = (await client.get('/api/reports/markdown')).text
        for content in ['Execuções: 6 | Achados: 3 | Alta: 1 | Média: 2', 'API8:2023', 'security_misconfiguration', '/fictional/', 'Revisados: 1']:
            assert content in report


@pytest.mark.parametrize('fault', ['baseline_body','baseline_status','target_body','target_status','non_json','control_body','control_status'])
async def test_bad_fixture_is_inconclusive_without_saved_success(tmp_path, monkeypatch, fault):
    def broken_lab(*, protected):
        lab = FastAPI()
        @lab.get('/lab/status')
        def status():
            return JSONResponse({} if fault == 'baseline_body' else BASELINE,
                                status_code=500 if fault == 'baseline_status' else 200)
        @lab.get('/lab/error')
        def error():
            if protected:
                return JSONResponse({} if fault == 'control_body' else GENERIC_ERROR,
                                    status_code=200 if fault == 'control_status' else 500)
            if fault == 'non_json': return PlainTextResponse('invalid', status_code=500)
            return JSONResponse({'debug':'unexpected'} if fault == 'target_body' else VERBOSE_ERROR,
                                status_code=200 if fault == 'target_status' else 500)
        return lab
    monkeypatch.setattr('app.misconfiguration.create_error_lab', broken_lab)
    async with AsyncClient(transport=ASGITransport(app=create_app(tmp_path/'db')), base_url='http://127.0.0.1') as client:
        response = await client.post('/api/runs', json={'mode':'vulnerable','check_type':'security_misconfiguration'}, headers=HEADERS)
        assert response.status_code == 502 and 'inconclusivo' in response.text
        assert (await client.get('/api/workspace')).json() == {'runs':[], 'findings':[]}


async def test_new_check_preserves_workspace_write_boundary(tmp_path):
    async with AsyncClient(transport=ASGITransport(app=create_app(tmp_path/'db')), base_url='http://127.0.0.1') as client:
        payload = {'mode':'vulnerable','check_type':'security_misconfiguration'}
        assert (await client.post('/api/runs', json=payload)).status_code == 403
        assert (await client.post('/api/runs', json=payload, headers={**HEADERS,'Origin':'https://example.invalid'})).status_code == 403
        assert (await client.post('/api/runs', json={**payload,'url':'https://example.invalid'}, headers=HEADERS)).status_code == 422
        assert (await client.get('/api/workspace')).json() == {'runs':[], 'findings':[]}
