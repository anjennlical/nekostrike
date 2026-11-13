import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  canAdvanceJourney,
  journeyIndex,
  journeyInterval,
  scheduleJourneyAdvance,
} from '../src/journey-playback.ts'

const ready = { requested: true, motionEnabled: true, inView: true, hovered: false, focused: false }
function fakeClock() {
  const jobs = new Map()
  let now = 0
  return {
    jobs,
    setTimeout(callback, delay) {
      const id = Symbol()
      jobs.set(id, { callback, time: now + delay })
      return id
    },
    clearTimeout(id) {
      jobs.delete(id)
    },
    advance(ms) {
      now += ms
      for (const [id, job] of jobs) {
        if (job.time <= now) {
          jobs.delete(id)
          job.callback()
        }
      }
    },
  }
}

test('four-step navigation wraps both ways, including Home/End and empty defensive bounds', () => {
  assert.equal(journeyIndex(-1, 4), 3)
  assert.equal(journeyIndex(4, 4), 0)
  assert.equal(journeyIndex(0, 4), 0)
  assert.equal(journeyIndex(3, 4), 3)
  assert.equal(journeyIndex(1, 0), 0)
})

test('autoplay is opt-in and all reading/motion guards take precedence', () => {
  assert.equal(canAdvanceJourney(ready), true)
  for (const changed of [
    { requested: false },
    { motionEnabled: false },
    { inView: false },
    { hovered: true },
    { focused: true },
  ]) {
    const clock = fakeClock()
    const state = { ...ready, ...changed }
    assert.equal(canAdvanceJourney(state), false)
    const dispose = scheduleJourneyAdvance(
      state,
      () => assert.fail('Paused presentation advanced'),
      clock,
    )
    clock.advance(20000)
    assert.equal(clock.jobs.size, 0)
    dispose()
  }
})

test('one advance waits seven seconds; disposal cancels and resume gets a full reading interval', () => {
  const clock = fakeClock()
  let calls = 0
  const advance = () => calls++
  const cancel = scheduleJourneyAdvance(ready, advance, clock)
  clock.advance(journeyInterval - 1)
  assert.equal(calls, 0)
  cancel()
  clock.advance(100)
  assert.equal(calls, 0)
  const dispose = scheduleJourneyAdvance(ready, advance, clock)
  clock.advance(journeyInterval - 1)
  assert.equal(calls, 0)
  clock.advance(1)
  assert.equal(calls, 1)
  clock.advance(20000)
  assert.equal(calls, 1)
  dispose()
})
