import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readMotionEnvironment, subscribeMotionEnvironment } from '../src/mochi-motion.ts'

test('motion environment honors both reduced preference and hidden tabs', () => {
  assert.deepEqual(readMotionEnvironment({ matches: true }, { hidden: false }), {
    reduced: true,
    visible: true,
  })
  assert.deepEqual(readMotionEnvironment({ matches: false }, { hidden: true }), {
    reduced: false,
    visible: false,
  })
})
test('preference and visibility changes update locally and cleanup removes both listeners', () => {
  const media = Object.assign(new EventTarget(), { matches: false })
  const page = Object.assign(new EventTarget(), { hidden: false })
  const states = []
  const stop = subscribeMotionEnvironment((value) => states.push(value), media, page)
  media.matches = true
  media.dispatchEvent(new Event('change'))
  page.hidden = true
  page.dispatchEvent(new Event('visibilitychange'))
  assert.deepEqual(states, [
    { reduced: false, visible: true },
    { reduced: true, visible: true },
    { reduced: true, visible: false },
  ])
  stop()
  media.dispatchEvent(new Event('change'))
  page.dispatchEvent(new Event('visibilitychange'))
  assert.equal(states.length, 3)
  const again = subscribeMotionEnvironment((value) => states.push(value), media, page)
  page.hidden = false
  page.dispatchEvent(new Event('visibilitychange'))
  assert.equal(states.length, 5)
  again()
})
