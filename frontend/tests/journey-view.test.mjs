// Static accessibility contract only. Browser scrolling/focus/swipe require manual QA.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { buildSync } from 'esbuild'
import { mkdtempSync, unlinkSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'

const directory = mkdtempSync(join(tmpdir(), 'nekostrike-journey-view-'))
const output = join(directory, 'render.cjs')
buildSync({
  stdin: {
    contents: `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server';
      import JourneyCarousel from './components/JourneyCarousel';
      import { WorkspaceMotionProvider } from './components/WorkspaceMotion';
      export const render = () => renderToStaticMarkup(<WorkspaceMotionProvider><JourneyCarousel /></WorkspaceMotionProvider>);`,
    resolveDir: resolve('src'),
    loader: 'tsx',
  },
  outfile: output,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  jsx: 'automatic',
})
const { render } = createRequire(import.meta.url)(output)
after(() => {
  unlinkSync(output)
  rmdirSync(directory)
})

test('journey exposes native links, named keyboard controls and paused reduced-motion content', () => {
  const oldWindow = globalThis.window
  const oldDocument = globalThis.document
  globalThis.window = { matchMedia: () => ({ matches: true }) }
  globalThis.document = { visibilityState: 'visible' }
  try {
    const html = render()
    // Regression: Overview's legacy .journey is a horizontal flex strip that
    // squeezed the entire carousel into one row, including its heading/controls.
    const carouselClasses = html.match(/<section[^>]*class="([^"]+)"/)?.[1].split(' ')
    assert.ok(carouselClasses?.includes('journey-carousel'))
    assert.ok(!carouselClasses?.includes('journey'))
    assert.equal((html.match(/class="journey-slide"/g) ?? []).length, 4)
    assert.match(html, /href="#overview"/)
    assert.match(html, /href="#lab"/)
    assert.equal((html.match(/href="#findings"/g) ?? []).length, 2)
    assert.match(html, /aria-label="Etapa anterior"/)
    assert.match(html, /aria-label="Próxima etapa"/)
    assert.match(html, /tabindex="0" aria-label="As quatro etapas da investigação"/)
    assert.match(html, /aria-pressed="false" disabled=""/)
    assert.match(html, /Movimento pausado. Navegação manual disponível./)
    assert.match(html, /sem nova geração de IA/)
    assert.doesNotMatch(html, /aria-hidden="true"[^>]*>Explore/)
  } finally {
    if (oldWindow === undefined) delete globalThis.window
    else globalThis.window = oldWindow
    if (oldDocument === undefined) delete globalThis.document
    else globalThis.document = oldDocument
  }
})
