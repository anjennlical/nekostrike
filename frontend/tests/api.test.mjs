import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseHealth, fetchHealth } from '../src/api.ts'

const health = {
  status: 'ok',
  service: 'nekostrike-api',
  version: '0.1.0',
  environment: 'local',
  timestamp: '2026-11-11T18:30:00Z',
  lab: { status: 'ready' },
  ai: { status: 'not_implemented' },
}

test('accepts the health contract', () => {
  assert.deepEqual(parseHealth(health), health)
})
test('rejects malformed or unrelated responses', () => {
  for (const value of [
    null,
    {},
    '<html></html>',
    { ...health, timestamp: 'invalid' },
    { ...health, service: 'other-api' },
    { ...health, lab: { status: 'not_implemented' } },
    { ...health, environment: 'production' },
  ]) {
    assert.throws(() => parseHealth(value))
  }
})
test('fetches the local endpoint and validates the response', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/health')
    assert.equal(options.cache, 'no-store')
    assert.ok(options.signal instanceof AbortSignal)
    return new Response(JSON.stringify(health), { status: 200 })
  })
  assert.deepEqual(await fetchHealth(new AbortController().signal), health)
})
test('surfaces HTTP errors instead of reporting an online backend', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }))
  await assert.rejects(fetchHealth(new AbortController().signal), /HTTP 503/)
})
test('propagates unavailable network and invalid JSON responses', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Failed to fetch')
  })
  await assert.rejects(fetchHealth(new AbortController().signal), /Failed to fetch/)
  fetchMock.mock.mockImplementation(async () => new Response('not JSON'))
  await assert.rejects(fetchHealth(new AbortController().signal), SyntaxError)
})
