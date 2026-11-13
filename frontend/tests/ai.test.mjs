import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aiRequest, parseAIResult, parseAIStatus, savedAIRequest } from '../src/ai-api.ts'
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

test('analysis format accepts legacy or v1 and rejects unknown versions', () => {
  assert.equal(parseAIResult(result, finding, run).format_version, undefined)
  assert.equal(parseAIResult({ ...result, format_version: 1 }, finding, run).format_version, 1)
  for (const version of [2, '1', true, null])
    assert.throws(
      () => parseAIResult({ ...result, format_version: version }, finding, run),
      /formato/,
    )
})

test('usage preserves subsets without double counting and rejects inconsistent metadata', () => {
  const measured = {
    ...result,
    consumption: {
      usage: {
        input_tokens: 763,
        output_tokens: 680,
        total_tokens: 1443,
        cached_tokens: 0,
        reasoning_tokens: 217,
        cache_write_tokens: null,
      },
      usage_status: 'reported',
      reported_model: 'test-model',
      service_tier: 'default',
    },
  }
  assert.equal(parseAIResult(measured, finding, run).consumption.usage.total_tokens, 1443)
  for (const edit of [
    (r) => (r.consumption.usage.total_tokens += 217),
    (r) => (r.consumption.usage.input_tokens = -1),
    (r) => (r.consumption.usage.reasoning_tokens = 681),
    (r) => (r.consumption.usage.cached_tokens = 764),
    (r) => (r.consumption.usage.cache_write_tokens = '0'),
    (r) => (r.consumption.service_tier = '<script>'),
    (r) => (r.consumption.usage_status = 'not_provided'),
  ]) {
    const invalid = structuredClone(measured)
    edit(invalid)
    assert.throws(() => parseAIResult(invalid, finding, run), /Consumo/)
  }
  assert.equal(
    parseAIResult(
      {
        ...result,
        consumption: { ...measured.consumption, usage: null, usage_status: 'not_provided' },
      },
      finding,
      run,
    ).consumption.usage,
    null,
  )
})

test('saved metadata is validated and unknown usage is never treated as zero', () => {
  const saved = {
    ...result,
    record: {
      id: '11111111-1111-4111-8111-111111111111',
      created_at: '2026-11-13T12:00:00+00:00',
      review_status: 'pending',
      usage: null,
    },
    storage_warning: false,
  }
  assert.equal(parseAIResult(saved, finding, run).record.usage, null)
  for (const edit of [
    (r) => (r.record.usage = 0),
    (r) => (r.record.review_status = 'fixed'),
    (r) => (r.record.created_at = 'bad'),
    (r) => (r.record.id = 'bad'),
    (r) => (r.storage_warning = true),
  ]) {
    const invalid = structuredClone(saved)
    edit(invalid)
    assert.throws(() => parseAIResult(invalid, finding, run))
  }
})

test('saved reads and review use only local storage routes and never request analysis', async (t) => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push([url, options])
    return new Response(JSON.stringify([]), { status: 200 })
  })
  await savedAIRequest('finding-local')
  await savedAIRequest('analysis-local', 'reviewed')
  assert.equal(calls[0][0], '/api/ai/analyses?finding_id=finding-local')
  assert.equal(calls[0][1].method, 'GET')
  assert.equal(calls[1][0], '/api/ai/analyses/analysis-local')
  assert.equal(calls[1][1].method, 'PATCH')
  assert.equal(calls[1][1].headers['X-NekoStrike-Client'], 'workspace')
  assert.deepEqual(JSON.parse(calls[1][1].body), { review_status: 'reviewed' })
})

test('historical results retain original references and cannot borrow the selected run', () => {
  const oldRun = '11111111-1111-4111-8111-111111111111'
  const historical = structuredClone(result)
  historical.record = {
    id: '22222222-2222-4222-8222-222222222222',
    created_at: '2026-11-13T12:00:00+00:00',
    review_status: 'pending',
    usage: null,
    run_id: oldRun,
    check_type: 'bola',
    evidence_status: 'historical',
  }
  historical.analysis.evidence_used.forEach((e, i) => {
    e.evidence_id = `${oldRun}:${['baseline', 'cross_user', 'negative_control'][i]}`
    if (i === 0) e.path = '/lab/orders/order-alice'
  })
  assert.equal(parseAIResult(historical, finding, run).record.run_id, oldRun)
  const wrong = structuredClone(historical)
  wrong.analysis.evidence_used[0].evidence_id = `${run.id}:baseline`
  assert.throws(() => parseAIResult(wrong, finding, run))
  const noOrigin = structuredClone(historical)
  noOrigin.record.run_id = null
  assert.throws(() => parseAIResult(noOrigin, finding, run))
})

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
