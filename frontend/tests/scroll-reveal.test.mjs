import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRevealController, revealDelay } from '../src/scroll-reveal.ts'

function harness(options = {}) {
  let enter
  const calls = [],
    observed = new Set(),
    seen = new Set()
  let disconnected = 0
  const controller = createRevealController({
    seen,
    shouldAnimate: () => true,
    reveal: (target, animate) => calls.push([target, animate]),
    createObserver: (callback) => {
      enter = callback
      return {
        observe: (target) => observed.add(target),
        unobserve: (target) => observed.delete(target),
        disconnect: () => {
          disconnected++
          observed.clear()
        },
      }
    },
    ...options,
  })
  return {
    controller,
    calls,
    observed,
    seen,
    enter: (targets) => enter(targets),
    disconnected: () => disconnected,
  }
}
test('entry reveals once and unobserves; late duplicate callbacks do nothing', () => {
  const h = harness(),
    card = {}
  h.controller.register(card, 'finding-1')
  h.enter([card, card])
  h.enter([card])
  assert.deepEqual(h.calls, [[card, true]])
  assert.equal(h.observed.size, 0)
  assert.equal(h.seen.has('finding-1'), true)
})
test('remounting a consumed finding after filtering does not replay it', () => {
  const h = harness(),
    original = {},
    remounted = {}
  h.controller.register(original, 'id')
  h.enter([original])
  h.controller.register(remounted, 'id')
  assert.deepEqual(h.calls, [
    [original, true],
    [remounted, false],
  ])
})
test('removing an unseen card does not consume its identity or accept late entry', () => {
  const h = harness(),
    card = {}
  h.controller.register(card, 'id')
  h.controller.release(card)
  h.enter([card])
  assert.equal(h.calls.length, 0)
  assert.equal(h.seen.size, 0)
  h.controller.register(card, 'id')
  h.enter([card])
  assert.deepEqual(h.calls, [[card, true]])
})
test('disposal disconnects and ignores queued callbacks and registrations', () => {
  const h = harness(),
    card = {}
  h.controller.register(card)
  h.controller.dispose()
  h.enter([card])
  h.controller.register({})
  assert.equal(h.disconnected(), 1)
  assert.equal(h.calls.length, 0)
})
test('missing observer reveals immediately and continues working for dynamic cards', () => {
  const h = harness({
      createObserver: () => {
        throw new Error('unsupported')
      },
    }),
    a = {},
    b = {}
  h.controller.register(a)
  h.controller.register(b)
  assert.deepEqual(h.calls, [
    [a, false],
    [b, false],
  ])
})
test('observe failure releases already pending cards as well', () => {
  let count = 0
  const h = harness({
      createObserver: () => ({
        observe: () => {
          if (++count === 2) throw new Error('failed')
        },
        unobserve() {},
        disconnect() {},
      }),
    }),
    a = {},
    b = {}
  h.controller.register(a)
  h.controller.register(b)
  assert.deepEqual(h.calls, [
    [a, false],
    [b, false],
  ])
})
test('motion disabled skips observation; focus cancels pending animation immediately', () => {
  const off = harness({ shouldAnimate: () => false }),
    card = {}
  off.controller.register(card)
  assert.deepEqual(off.calls, [[card, false]])
  const h = harness()
  h.controller.register(card)
  h.controller.finish(card)
  h.enter([card])
  assert.deepEqual(h.calls, [[card, false]])
})
test('stagger stays bounded even for long lists and invalid indexes', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 100, -1, NaN].map(revealDelay),
    [0, 80, 160, 240, 240, 240, 0, 0],
  )
})
