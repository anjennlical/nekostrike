import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveMochiState, mochiGaze } from '../src/mochi-state.ts'

const ready = { connection: 'online', busy: null, loading: false, error: null, lastRun: null }
test('connection success alone never celebrates a security result', () => {
  assert.equal(resolveMochiState(ready).emotion, 'idle')
  assert.match(resolveMochiState(ready).message, /sem IA/)
  assert.equal(resolveMochiState(ready, true).emotion, 'happy')
})
test('real operations produce contextual thinking without fake AI or progress', () => {
  assert.match(resolveMochiState({ ...ready, busy: 'run' }).message, /verificação do laboratório/)
  assert.match(resolveMochiState({ ...ready, busy: 'finding-id' }).message, /Salvando sua revisão/)
  assert.equal(resolveMochiState({ ...ready, loading: true }).emotion, 'thinking')
  assert.match(
    resolveMochiState({ ...ready, connection: 'loading' }).message,
    /não é uma análise de IA/,
  )
})
test('risk is distinct from completion and cannot be concealed by a greeting', () => {
  const risk = { ...ready, lastRun: { id: 'real-run', verdict: 'vulnerable' } }
  assert.equal(resolveMochiState(risk, true).emotion, 'warning')
  assert.match(resolveMochiState(risk).message, /encontrou um achado/)
  const safe = resolveMochiState({ ...ready, lastRun: { id: 'real-run', verdict: 'protected' } })
  assert.equal(safe.emotion, 'success')
  assert.match(safe.message, /não garante segurança fora dele/)
})
test('failed reads or offline health cannot present stale success', () => {
  const signals = { ...ready, lastRun: { id: 'old-run', verdict: 'protected' } }
  assert.equal(resolveMochiState({ ...signals, error: 'Failed read' }, true).emotion, 'error')
  assert.equal(resolveMochiState({ ...signals, connection: 'offline' }, true).emotion, 'error')
})
test('cursor offsets are bounded and non-finite input is neutral', () => {
  assert.deepEqual(mochiGaze(10, -10), { x: 2, y: -1, angle: 0.6 })
  assert.deepEqual(mochiGaze(NaN, Infinity), { x: 0, y: 0, angle: 0 })
  assert.deepEqual(mochiGaze(0, 0), { x: 0, y: 0, angle: 0 })
})
