// Static component contract tests: do not claim browser layout or interaction coverage.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { buildSync } from 'esbuild'
import { mkdtempSync, unlinkSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { aiPresentation } from '../src/ai-presentation.ts'

const directory = mkdtempSync(join(tmpdir(), 'nekostrike-ai-view-'))
const output = join(directory, 'render.cjs')
buildSync({
  stdin: {
    contents: `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server';
    import MochiAnalysis from './components/MochiAnalysis';
    export { providerPresentation } from './components/AIProviderStatus';
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
const { render, providerPresentation } = createRequire(import.meta.url)(output)
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

test('provider status separates local configuration, request failures and saved-history failures', () => {
  const configured = { ...base, status: { status: 'configured', provider: 'openai' } }
  assert.equal(providerPresentation(base).state, 'disabled')
  for (const status of ['missing_key', 'missing_model', 'invalid_config'])
    assert.equal(providerPresentation({ ...base, status: { status } }).state, 'unconfigured')
  assert.equal(providerPresentation({ ...configured, pending: true }).state, 'processing')
  assert.equal(providerPresentation({ ...configured, statusError: 'offline' }).state, 'error')
  assert.equal(providerPresentation({ ...configured, generationError: 'timeout' }).state, 'error')
  // Local SQLite errors are not proof the OpenAI provider failed.
  assert.equal(
    providerPresentation({ ...configured, historyState: 'error', error: 'Local storage failed' })
      .state,
    'available',
  )
  assert.match(providerPresentation(configured).detail, /não comprova conexão/)
})

test('disabled Studio presents one provider status and preserves local-history access', () => {
  const data = { findings: [{ id: 'f', run_id: 'r', title: 'BOLA' }], runs: [{ id: 'r' }] }
  const html = render({ ai: { ...base, selected: 'f' }, workspace: { ...workspace, data } })
  assert.equal((html.match(/>Desativada</g) ?? []).length, 1)
  assert.match(html, /<button[^>]*type="submit"[^>]*disabled=""/)
  assert.match(html, /<button[^>]*>Consultar análises salvas<\/button>/)
  assert.match(html, /Escolha sua investigação/)
  assert.match(html, /Olá! Sou a Mochi/)
  assert.doesNotMatch(html, /IA indisponível · desativada no backend/)
})

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

test('presentation distinguishes six states and never displays another finding result', () => {
  const data = { findings: [{ id: 'f', run_id: 'r' }], runs: [{ id: 'r' }] }
  const ws = { ...workspace, data }
  const ready = { ...base, status: { status: 'configured' }, selected: 'f' }
  assert.equal(aiPresentation(base, ws).state, 'unavailable')
  assert.equal(aiPresentation({ ...ready, selected: '' }, ws).state, 'idle')
  assert.equal(aiPresentation(ready, ws).state, 'ready')
  assert.equal(aiPresentation({ ...ready, pending: true }, ws).state, 'analyzing')
  assert.equal(aiPresentation({ ...ready, error: 'Falhou' }, ws).state, 'error')
  assert.equal(
    aiPresentation({ ...ready, result: { analysis: { finding_id: 'f' } } }, ws).state,
    'completed',
  )
  assert.equal(
    aiPresentation({ ...ready, result: { analysis: { finding_id: 'other' } } }, ws).result,
    null,
  )
  assert.equal(aiPresentation(ready, { ...ws, error: 'offline' }).state, 'unavailable')
})

test('result separates deterministic facts, simulation, human review and session lifetime', () => {
  const data = {
    findings: [
      {
        id: 'f',
        run_id: 'r',
        title: 'BOLA',
        severity: 'high',
        category: 'API1:2023',
        impact: 'Resumo determinístico do impacto.',
      },
    ],
    runs: [{ id: 'r', check_type: 'bola' }],
  }
  const result = {
    provider: 'test_double',
    model: 'SIMULADO',
    cached: false,
    analysis: {
      finding_id: 'f',
      summary: 'Resumo de teste',
      technical_explanation: 'Explicação',
      potential_impact: 'Impacto',
      evidence_used: [
        { evidence_id: 'r:baseline', path: '/lab/orders', actor: 'alice', status: 200 },
      ],
      recommendations: ['Revisar'],
      limitations: ['Fictício'],
    },
  }
  const html = render({ ai: { ...base, selected: 'f', result }, workspace: { ...workspace, data } })
  for (const text of [
    'FATOS DO LABORATÓRIO',
    'Severidade original',
    'Alta',
    'PROVEDOR SIMULADO DE TESTE',
    'INTERPRETAÇÃO GERADA POR IA',
    'REVISÃO HUMANA OBRIGATÓRIA',
    'perdida ao recarregar',
    'r:baseline',
  ])
    assert.ok(html.includes(text), text)
  assert.match(html, /Backend online não significa IA conectada/)
  const persisted = {
    ...result,
    record: {
      id: '11111111-1111-4111-8111-111111111111',
      created_at: '2026-11-13T12:00:00+00:00',
      review_status: 'reviewed',
      usage: null,
    },
    storage_warning: false,
  }
  const savedHTML = render({
    ai: { ...base, selected: 'f', result: persisted },
    workspace: { ...workspace, data },
  })
  assert.match(savedHTML, /foi salva no SQLite/)
  assert.match(savedHTML, /Revisada por você/)
  assert.match(savedHTML, /revisão humana registrada/)
  assert.doesNotMatch(savedHTML, /Revisão humana pendente\./)
  assert.doesNotMatch(savedHTML, /perdida ao recarregar/)
  const failedHTML = render({
    ai: { ...base, selected: 'f', result: { ...result, storage_warning: true } },
    workspace: { ...workspace, data },
  })
  assert.match(failedHTML, /não foi possível confirmar seu salvamento/)
  assert.doesNotMatch(failedHTML, /foi salva no SQLite/)
  const consumptionHTML = render({
    ai: {
      ...base,
      selected: 'f',
      result: {
        ...persisted,
        consumption: {
          usage: {
            input_tokens: 763,
            output_tokens: 680,
            total_tokens: 1443,
            cached_tokens: 0,
            reasoning_tokens: 217,
            cache_write_tokens: null,
          },
          usage_status: 'reported',
          reported_model: 'SIMULADO',
          service_tier: 'default',
        },
      },
    },
    workspace: { ...workspace, data },
  })
  for (const expected of [
    'Consumo desta análise',
    '1.443',
    '217',
    'já está incluído na saída',
    'Não informado',
    'Valores simulados para teste',
    'Custo monetário não calculado',
  ])
    assert.ok(consumptionHTML.includes(expected), expected)
  assert.doesNotMatch(consumptionHTML, /Consumo não registrado/)
})

test('history has empty/loading/error states and identifies stored origin and review', () => {
  const data = {
    findings: [{ id: 'f', run_id: 'r', title: 'BOLA', severity: 'high' }],
    runs: [{ id: 'r', check_type: 'bola' }],
  }
  const props = {
    ai: { ...base, selected: 'f', saved: [], historyState: 'ready' },
    workspace: { ...workspace, data },
  }
  assert.match(render(props), /não tem uma análise salva para este achado/)
  assert.match(
    render({ ...props, ai: { ...props.ai, historyState: 'loading', localBusy: true } }),
    /Carregando histórico/,
  )
  assert.match(
    render({ ...props, ai: { ...props.ai, historyState: 'error' } }),
    /Tentar consultar novamente/,
  )
  const saved = {
    provider: 'test_double',
    model: 'SIMULADO-ANTERIOR',
    record: {
      id: 'saved',
      created_at: '2026-11-13T12:00:00+00:00',
      review_status: 'reviewed',
      run_id: 'original-run',
      evidence_status: 'historical',
    },
  }
  const html = render({ ...props, ai: { ...props.ai, saved: [saved] } })
  for (const text of [
    'Histórico de análises ♡',
    'SIMULADO-ANTERIOR',
    'Revisada',
    'original-run',
    'Histórica',
    'Abrir análise',
  ])
    assert.ok(html.includes(text), text)
  // Disabled provider does not disable local history reads.
  assert.match(html, /<button[^>]*>Atualizar histórico<\/button>/)
})
