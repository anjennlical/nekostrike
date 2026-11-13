import { test } from 'node:test'
import assert from 'node:assert/strict'
import { exitDuration } from '../src/motion-timing.ts'

test('modal exit accepts shared CSS time units and immediate reduced exits', () => {
  assert.equal(exitDuration(' 180ms '), 180)
  assert.equal(exitDuration('0.22s'), 220)
  assert.equal(exitDuration('0ms'), 0)
})

test('invalid or unbounded exit tokens cannot indefinitely retain modal focus and scroll lock', () => {
  for (const token of ['', '-1ms', 'NaNs', 'Infinitys', '20000ms', 'calc(1s)', '180']) {
    assert.equal(exitDuration(token), 180)
  }
})
