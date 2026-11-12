import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  workspaceRequest,
  workspaceResponseError,
  storageRecoveryHint,
} from '../src/workspace-api.ts'

test('known storage errors give recovery instructions without reflecting raw diagnostics', async (t) => {
  for (const [code, expected] of [
    ['stored_data_invalid', /Preserve o banco/],
    ['storage_unavailable', /sem apagar arquivos/],
  ]) {
    t.mock.method(globalThis, 'fetch', async () =>
      Response.json({ code, detail: 'secret raw diagnostic' }, { status: 503 }),
    )
    await assert.rejects(workspaceRequest('workspace'), (error) => {
      assert.match(storageRecoveryHint(error), expected)
      assert.doesNotMatch(storageRecoveryHint(error), /secret/)
      return true
    })
    t.mock.restoreAll()
  }
})

test('unknown or malformed errors keep generic fallback and cannot inject recovery hints', async () => {
  for (const response of [
    Response.json({ code: 'unknown', detail: 'secret' }, { status: 503 }),
    new Response('invalid json', { status: 503 }),
    Response.json({ code: 'stored_data_invalid' }, { status: 500 }),
  ]) {
    const error = await workspaceResponseError(response)
    assert.equal(storageRecoveryHint(error), null)
    assert.match(error.message, /HTTP 50[03]/)
  }
  assert.equal(storageRecoveryHint(new Error('raw secret')), null)
})
