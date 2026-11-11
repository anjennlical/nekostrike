import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseWorkspace, parseRun, workspaceRequest } from '../src/workspace-api.ts'
const run = {
  id: 'run-1',
  created_at: '2026-11-11T18:00:00Z',
  mode: 'vulnerable',
  verdict: 'vulnerable',
  evidence: ['baseline', 'cross_user', 'negative_control'].map((scenario, index) => ({
    scenario,
    method: 'GET',
    path: '/lab/orders/order-bob',
    actor: 'alice',
    lab_mode: index === 2 ? 'fixed' : 'vulnerable',
    expected_status: index ? 403 : 200,
    status: index === 2 ? 403 : 200,
    body: { owner: 'bob' },
  })),
}
const finding = {
  id: 'finding-1',
  run_id: 'run-1',
  title: 'BOLA',
  severity: 'high',
  review_status: 'pending',
  category: 'API1:2023',
  reference: 'https://owasp.org',
  impact: 'Read',
  remediation: 'Authorize',
  severity_reason: 'Cross-user read',
}
test('accepts empty history and linked real-shaped evidence', () => {
  assert.deepEqual(parseWorkspace({ runs: [], findings: [] }), { runs: [], findings: [] })
  assert.equal(parseWorkspace({ runs: [run], findings: [finding] }).findings.length, 1)
})
test('rejects malformed evidence and orphan findings instead of displaying false counts', () => {
  for (const value of [
    null,
    {},
    { runs: [], findings: [finding] },
    { runs: [run, run], findings: [] },
    { runs: [{ ...run, created_at: 'bad' }], findings: [] },
    { runs: [{ ...run, evidence: [] }], findings: [] },
    { runs: [run], findings: [{ ...finding, review_status: 'fixed' }] },
  ]) {
    assert.throws(() => parseWorkspace(value))
  }
  assert.throws(() =>
    parseRun({ ...run, evidence: run.evidence.map((e) => ({ ...e, status: '200' })) }),
  )
})
test('writes only to local API with the required JSON and workspace header', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/runs')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers['X-NekoStrike-Client'], 'workspace')
    assert.equal(options.headers['Content-Type'], 'application/json')
    assert.deepEqual(JSON.parse(options.body), { mode: 'fixed' })
    assert.ok(options.signal instanceof AbortSignal)
    return new Response(JSON.stringify(run))
  })
  assert.deepEqual(await workspaceRequest('runs', 'POST', { mode: 'fixed' }), run)
})
test('surfaces persistence and request errors', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 503 }))
  await assert.rejects(workspaceRequest('workspace'), /503/)
})
