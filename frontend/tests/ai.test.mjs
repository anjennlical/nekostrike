import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aiRequest, parseAIResult, parseAIStatus } from '../src/ai-api.ts'
import { parseHealth } from '../src/api.ts'

const finding = { id: 'finding-local', run_id: 'run-local', severity: 'high' }
const run = {
  id: 'run-local',
  verdict: 'vulnerable',
  evidence: ['baseline', 'cross_user', 'negative_control'].map((scenario, i) => ({
    scenario,
    path: '/lab/orders/order-bob',
    actor: 'alice',
    status: i === 2 ? 403 : 200,
  })),
}
const result = {
  provider: 'openai',
  model: 'test-model',
  cached: false,
  requires_human_review: true,
  deterministic_verdict: 'vulnerable',
  deterministic_severity: 'high',
  analysis: {
    finding_id: finding.id,
    summary: 'Resumo.',
    technical_explanation: 'Explicação.',
    potential_impact: 'Impacto potencial.',
    evidence_used: run.evidence.map((e) => ({
      evidence_id: `${run.id}:${e.scenario}`,
      path: e.path,
      actor: e.actor,
      status: e.status,
    })),
    recommendations: ['Revise o controle.'],
    limitations: ['Revisão humana necessária.'],
  },
}

test('AI configuration is not a verified provider connection; health remains compatible', () => {
  for (const status of [
    'disabled',
    'missing_key',
    'missing_model',
    'invalid_config',
    'configured',
  ]) {
    assert.equal(
      parseAIStatus({
        status,
        provider: 'openai',
        model: null,
        requests_remaining: 3,
        max_output_tokens: 4096,
        timeout_seconds: 45,
        provider_verified: false,
      }).status,
      status,
    )
    assert.equal(
      parseHealth({
        status: 'ok',
        service: 'nekostrike-api',
        version: '0.4.0',
        environment: 'local',
        timestamp: '2026-11-12T15:00:00Z',
        lab: { status: 'ready' },
        ai: { status },
      }).ai.status,
      status,
    )
  }
  assert.throws(() => parseAIStatus({ status: 'online', provider_verified: true }))
})

test('AI result references must match all saved evidence and deterministic verdict', () => {
  assert.deepEqual(parseAIResult(result, finding, run), result)
  for (const edit of [
    (r) => {
      r.analysis.finding_id = 'unknown'
    },
    (r) => {
      r.analysis.evidence_used[0].evidence_id = 'invented'
    },
    (r) => {
      r.analysis.evidence_used[0].path = '/external'
    },
    (r) => {
      r.analysis.evidence_used[0].actor = 'invented-user'
    },
    (r) => {
      r.analysis.evidence_used[0].status = 418
    },
    (r) => {
      r.analysis.evidence_used[1] = r.analysis.evidence_used[0]
    },
    (r) => {
      r.analysis.recommendations = []
    },
    (r) => {
      r.deterministic_verdict = 'protected'
    },
    (r) => {
      r.deterministic_severity = 'critical'
    },
    (r) => {
      r.requires_human_review = false
    },
  ]) {
    const invalid = structuredClone(result)
    edit(invalid)
    assert.throws(() => parseAIResult(invalid, finding, run))
  }
})

test('analysis sends only finding ID to relative backend endpoint with CSRF headers', async (t) => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++
    assert.equal(url, '/api/ai/analyze')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers['X-NekoStrike-Client'], 'workspace')
    assert.deepEqual(JSON.parse(options.body), { finding_id: finding.id })
    assert.equal(options.cache, 'no-store')
    return Response.json(result)
  })
  assert.deepEqual(await aiRequest('analyze', new AbortController().signal, finding.id), result)
  assert.equal(calls, 1)
})

test('backend communication failure is honest about uncertainty and never auto-retries', async (t) => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => {
    calls++
    throw new TypeError('offline')
  })
  await assert.rejects(
    aiRequest('analyze', new AbortController().signal, finding.id),
    /pode ter chegado ao provedor/,
  )
  assert.equal(calls, 1)
})

test('controlled errors do not reflect arbitrary server content into UI', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(
      { detail: { code: 'authentication', message: 'secret raw credential' } },
      { status: 503 },
    ),
  )
  await assert.rejects(
    aiRequest('analyze', new AbortController().signal, finding.id),
    (error) => error.message.includes('recusou a credencial') && !error.message.includes('secret'),
  )
})

test('status lookup is read-only and sends no finding or credential', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/ai/status')
    assert.equal(options.method, 'GET')
    assert.equal(options.body, undefined)
    assert.equal(options.headers.Authorization, undefined)
    return Response.json({ status: 'disabled' })
  })
  assert.deepEqual(await aiRequest('status', new AbortController().signal), { status: 'disabled' })
})
