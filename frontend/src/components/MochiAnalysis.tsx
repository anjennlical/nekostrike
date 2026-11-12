import { Sparkles, RefreshCw, FileCheck2 } from 'lucide-react'
import Panel from './Panel'
import type { AIState } from '../useAI'
import type { WorkspaceState } from '../useWorkspace'

const states = {
  disabled: 'IA indisponível · desativada no backend',
  missing_key: 'IA indisponível · credencial não configurada',
  missing_model: 'IA indisponível · modelo não configurado',
  invalid_config: 'IA indisponível · configuração inválida',
  configured: 'Provedor configurado localmente · conexão ainda não comprovada por esta consulta',
}

export default function MochiAnalysis({
  ai,
  workspace,
}: {
  ai: AIState
  workspace: WorkspaceState
}) {
  const findings = workspace.data?.findings ?? []
  const finding = findings.find((item) => item.id === ai.selected)
  const run = workspace.data?.runs.find((item) => item.id === finding?.run_id)
  const result = ai.result?.analysis.finding_id === finding?.id ? ai.result : null
  const analysis = result?.analysis
  return (
    <Panel
      className="mochi-analysis"
      eyebrow="EVIDÊNCIAS → EXPLICAÇÃO"
      title="Vamos entender um achado?"
      reveal={false}
    >
      <div className="ai-config-row">
        <p role="status">
          {ai.checking
            ? 'Consultando configuração local…'
            : ai.status
              ? states[ai.status.status]
              : 'Configuração indisponível'}
        </p>
        <button
          className="sakura-button"
          type="button"
          onClick={() => void ai.refresh()}
          disabled={ai.checking || ai.pending}
        >
          <RefreshCw size={16} aria-hidden="true" /> Atualizar configuração
        </button>
      </div>
      <p className="ai-help">
        Esta consulta não contata a OpenAI nem consome tokens. Backend online não significa IA
        conectada.
      </p>
      {ai.statusError && <p role="alert">{ai.statusError}</p>}
      {workspace.loading ? (
        <p role="status">Carregando achados salvos…</p>
      ) : workspace.error ? (
        <p role="alert">Histórico indisponível. Atualize o workspace antes de analisar.</p>
      ) : findings.length === 0 ? (
        <p>
          Nenhum achado salvo. Execute um cenário vulnerável no <a href="#lab">Security Lab</a> para
          começar. Um cenário corrigido não gera achado.
        </p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (finding && run) void ai.analyze(finding, run)
          }}
        >
          <label htmlFor="ai-finding">Achado salvo no laboratório</label>
          <select
            id="ai-finding"
            value={finding ? ai.selected : ''}
            disabled={ai.pending}
            onChange={(event) => ai.select(event.target.value)}
            aria-describedby="ai-sharing"
          >
            <option value="">Selecione um achado</option>
            {findings.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} · {item.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <p id="ai-sharing" className="ai-help">
            Ao analisar, você autoriza o envio de fatos minimizados deste laboratório fictício à
            OpenAI. A chamada pode gerar custo. Corpos brutos, chaves e histórico completo não são
            enviados.
          </p>
          <div className="ai-config-row">
            <button
              type="submit"
              className="sakura-button"
              disabled={
                !finding || !run || ai.pending || ai.checking || ai.status?.status !== 'configured'
              }
            >
              <Sparkles size={17} aria-hidden="true" />{' '}
              {ai.pending ? 'Mochi está analisando…' : 'Analisar com OpenAI'}
            </button>
            {ai.status?.status === 'configured' && (
              <span className="ai-help">
                {ai.status.requests_remaining} chamada(s) restante(s) neste processo ·{' '}
                {ai.status.model}
              </span>
            )}
          </div>
        </form>
      )}
      <div role="status" aria-live="polite" aria-atomic="true" className="ai-feedback">
        {ai.pending
          ? 'Requisição em andamento. Aguarde; você pode navegar sem repetir a chamada.'
          : analysis
            ? 'Análise recebida e validada estruturalmente. Revisão humana pendente.'
            : ''}
      </div>
      {ai.error && (
        <p className="ai-error" role="alert">
          {ai.error}
        </p>
      )}
      {analysis && result && (
        <section className="ai-result" aria-label="Explicação da Mochi">
          <div className="ai-result-heading">
            <FileCheck2 size={22} aria-hidden="true" />
            <h3>Uma explicação para revisar</h3>
          </div>
          <p className="ai-help">
            {result.provider === 'test_double'
              ? 'PROVEDOR SIMULADO DE TESTE'
              : 'Resposta da OpenAI'}{' '}
            · {result.model} ·{' '}
            {result.cached
              ? 'Reaproveitada por até 10 minutos, sem nova chamada.'
              : 'Nova resposta.'}
          </p>
          <p className="ai-review-note">
            A IA pode errar mesmo com formato e referências válidos. Compare o texto com as
            evidências antes de usar. Veredito e severidade originais foram preservados; esta
            análise não foi salva no relatório.
          </p>
          <h4>Resumo</h4>
          <p>{analysis.summary}</p>
          <h4>Explicação técnica</h4>
          <p>{analysis.technical_explanation}</p>
          <h4>Impacto potencial</h4>
          <p>{analysis.potential_impact}</p>
          <h4>Evidências utilizadas</h4>
          <ul className="ai-evidence-list">
            {analysis.evidence_used.map((item) => (
              <li key={item.evidence_id}>
                <code>{item.evidence_id}</code>
                <span>
                  GET {item.path} · identidade fictícia: {item.actor} · HTTP {item.status}
                </span>
              </li>
            ))}
          </ul>
          <h4>Recomendações</h4>
          <ul>
            {analysis.recommendations.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <h4>Limitações e incertezas</h4>
          <ul>
            {analysis.limitations.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <a className="sakura-button" href="#findings">
            Comparar com as evidências em Findings
          </a>
        </section>
      )}
    </Panel>
  )
}
