import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { normalizeTheme, resolveTheme } from '../src/theme.ts'

const source = readFileSync(new URL('../public/theme-init.js', import.meta.url), 'utf8')
function bootstrap(saved, dark, blocked = false) {
  const root = { dataset: {}, style: {} }
  vm.runInNewContext(source, {
    document: { documentElement: root },
    localStorage: {
      getItem() {
        if (blocked) throw new Error('denied')
        return saved
      },
    },
    matchMedia: () => ({ matches: dark }),
  })
  return root
}
test('saved explicit themes override system preference before React mounts', () => {
  for (const saved of ['light', 'dark']) {
    for (const systemDark of [true, false]) {
      const root = bootstrap(saved, systemDark)
      assert.equal(root.dataset.theme, saved)
      assert.equal(root.style.colorScheme, saved)
      assert.equal(resolveTheme(normalizeTheme(root.dataset.themePreference), systemDark), saved)
    }
  }
})
test('system mode resolves consistently during bootstrap and preference changes', () => {
  for (const dark of [true, false]) {
    const root = bootstrap('system', dark)
    assert.equal(root.dataset.themePreference, 'system')
    assert.equal(root.dataset.theme, dark ? 'dark' : 'light')
    assert.equal(resolveTheme('system', dark), root.dataset.theme)
  }
})
test('missing, invalid or blocked storage leaves a usable default without throwing', () => {
  for (const saved of [null, '', 'invalid', '<script>']) {
    assert.equal(bootstrap(saved, false).dataset.theme, 'dark')
    assert.equal(normalizeTheme(saved), 'dark')
  }
  assert.equal(bootstrap('light', false, true).dataset.theme, 'dark')
})
