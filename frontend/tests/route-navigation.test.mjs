import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createRouteNavigation,
  routeFromHash,
  subscribeHashNavigation,
} from '../src/route-navigation.ts'

function harness(initialPage = 'about') {
  const calls = []
  let rendered = initialPage
  const navigation = createRouteNavigation({
    initialPage,
    onRoute: (page) => calls.push(['request', page]),
    resetViewport: () => calls.push(['scroll', rendered]),
    focusHeading: () => calls.push(['focus', rendered]),
  })
  return {
    navigation,
    calls,
    commit(page) {
      rendered = page
      navigation.afterCommit(page)
    },
  }
}

test('route parsing leaves in-page anchors and unknown hashes to native navigation', () => {
  for (const page of ['overview', 'lab', 'findings', 'mochi', 'about'])
    assert.equal(routeFromHash(`#${page}`), page)
  for (const hash of ['', '#about-how', '#main-content', '#unknown', '#lab/extra'])
    assert.equal(routeFromHash(hash), null)
  const h = harness()
  h.navigation.request('#about-how')
  h.navigation.request('#about')
  h.commit('about')
  assert.deepEqual(h.calls, [])
})

test('About → Lab → Findings → Mochi responds immediately and scrolls only the committed destination', () => {
  const h = harness()
  for (const page of ['lab', 'findings', 'mochi']) {
    h.calls.length = 0
    h.navigation.request(`#${page}`)
    // Regression: the outgoing page must not be scrolled while React still renders it.
    assert.deepEqual(h.calls, [['request', page]])
    h.commit(page)
    assert.deepEqual(h.calls, [
      ['request', page],
      ['scroll', page],
      ['focus', page],
    ])
    h.commit(page)
    assert.equal(h.calls.length, 3)
  }
})

test('rapid navigation ignores stale commits and can return to the already rendered route', () => {
  const h = harness('overview')
  h.navigation.request('#lab')
  h.navigation.request('#findings')
  h.navigation.request('#mochi')
  h.commit('lab')
  h.commit('findings')
  assert.equal(h.calls.filter(([kind]) => kind === 'scroll').length, 0)
  h.commit('mochi')
  assert.deepEqual(h.calls.slice(-2), [
    ['scroll', 'mochi'],
    ['focus', 'mochi'],
  ])
  h.navigation.request('#lab')
  h.navigation.request('#mochi')
  h.calls.length = 0
  h.commit('mochi')
  assert.deepEqual(h.calls, [])
})

test('native hash traversal supports back/forward, restores scroll policy and removes listeners', () => {
  const listeners = new Set()
  const browser = {
    location: { hash: '#overview' },
    history: { scrollRestoration: 'auto' },
    addEventListener: (type, handler) => {
      assert.equal(type, 'hashchange')
      listeners.add(handler)
    },
    removeEventListener: (type, handler) => listeners.delete(handler),
  }
  const h = harness('overview')
  const unsubscribe = subscribeHashNavigation(browser, h.navigation)
  assert.equal(browser.history.scrollRestoration, 'manual')
  assert.equal(listeners.size, 1)
  // The browser owns history entries; the application only observes these events.
  for (const page of ['about', 'lab', 'about', 'lab']) {
    browser.location.hash = `#${page}`
    listeners.forEach((callback) => callback())
    assert.deepEqual(h.calls.at(-1), ['request', page])
    h.commit(page)
    assert.deepEqual(h.calls.at(-1), ['focus', page])
  }
  unsubscribe()
  assert.equal(browser.history.scrollRestoration, 'auto')
  assert.equal(listeners.size, 0)
  const stopAgain = subscribeHashNavigation(browser, h.navigation)
  assert.equal(listeners.size, 1)
  stopAgain()
  assert.equal(listeners.size, 0)
})

test('subscribing catches an early hash change without assuming scroll-restoration support', () => {
  const h = harness('overview')
  const browser = {
    location: { hash: '#about' },
    history: {},
    addEventListener() {},
    removeEventListener() {},
  }
  const stop = subscribeHashNavigation(browser, h.navigation)
  assert.deepEqual(h.calls, [['request', 'about']])
  h.commit('about')
  assert.deepEqual(h.calls.slice(-2), [
    ['scroll', 'about'],
    ['focus', 'about'],
  ])
  stop()
  assert.equal('scrollRestoration' in browser.history, false)
})
