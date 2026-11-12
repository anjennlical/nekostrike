// Static component contract tests: do not claim browser layout or interaction coverage.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { buildSync } from 'esbuild'
import { mkdtempSync, unlinkSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'

const directory = mkdtempSync(join(tmpdir(), 'nekostrike-ai-view-'))
const output = join(directory, 'render.cjs')
buildSync({
  stdin: {
    contents: `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server';
    import MochiAnalysis from './components/MochiAnalysis';
    export const render = (props) => renderToStaticMarkup(React.createElement(MochiAnalysis, props));`,
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
const base = {
  status: { status: 'disabled' },
  checking: false,
  statusError: null,
  pending: false,
  selected: '',
  result: null,
  error: null,
  refresh() {},
  select() {},
  analyze() {},
}
const workspace = { data: { findings: [], runs: [] }, loading: false, error: null }

test('empty and unavailable history have distinct instructions', () => {
  assert.match(render({ ai: base, workspace }), /Nenhum achado salvo/)
  assert.match(
    render({ ai: base, workspace: { ...workspace, error: 'offline', data: null } }),
    /Histórico indisponível/,
  )
  assert.match(
    render({ ai: base, workspace: { ...workspace, loading: true } }),
    /Carregando achados/,
  )
})

test('pending analysis announces real work and disables duplicate submit', () => {
  const data = { findings: [{ id: 'f', run_id: 'r', title: 'BOLA' }], runs: [{ id: 'r' }] }
  const html = render({
    ai: { ...base, pending: true, selected: 'f', status: { status: 'configured' } },
    workspace: { ...workspace, data },
  })
  assert.match(html, /Requisição em andamento/)
  assert.match(html, /<button[^>]*type="submit"[^>]*disabled=""/)
  assert.match(html, /<select[^>]*disabled=""/)
})

test('provider error is an alert and does not masquerade as a result', () => {
  const html = render({ ai: { ...base, error: 'Provedor indisponível.' }, workspace })
  assert.match(html, /role="alert">Provedor indisponível/)
  assert.doesNotMatch(html, /Uma explicação para revisar/)
})
