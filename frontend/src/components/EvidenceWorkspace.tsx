import {
  ArrowUpRight,
  FileSearch,
  FolderHeart,
  History,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { AIState } from '../useAI'
import type { WorkspaceState } from '../useWorkspace'
import { aiPresentation } from '../ai-presentation'
import { labChecks } from '../lab-checks'

export default function EvidenceWorkspace({
  ai,
  workspace,
}: {
  ai: AIState
  workspace: WorkspaceState
}) {
  const findings = workspace.data?.findings ?? []
  const { finding, run } = aiPresentation(ai, workspace)
  return (
    <section
      className="studio-evidence studio-surface"
      aria-labelledby="studio-evidence-title"
      data-reveal="slide-right"
    >
      <header className="studio-section-heading">
        <span className="studio-section-icon">
          <FileSearch size={21} aria-hidden="true" />
        </span>
        <div>
          <p className="studio-overline">01 / EVIDENCE WORKSPACE</p>
          <h2 id="studio-evidence-title">Escolha sua investigação</h2>
        </div>
      </header>
      <p className="studio-section-intro">Um achado real. Evidências para entender.</p>
      {workspace.loading ? (
        <p className="studio-empty" role="status">
          Carregando achados salvos…
        </p>
      ) : workspace.error ? (
        <p role="alert" className="ai-error">
          Histórico indisponível. Atualize o workspace antes de analisar.
        </p>
      ) : findings.length === 0 ? (
        <div className="studio-empty">
          <FolderHeart size={34} aria-hidden="true" />
          <h3>Toda descoberta começa por aqui.</h3>
          <p>
            Nenhum achado salvo. Execute um cenário vulnerável no laboratório. Um cenário corrigido
            não gera achado.
          </p>
          <a className="sakura-button" href="#lab">
            Abrir Security Lab <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (finding && run) void ai.analyze(finding, run)
          }}
        >
          <label htmlFor="ai-finding">Achado salvo no laboratório</label>
          <div className="studio-select-wrap">
            <select
              id="ai-finding"
              value={finding ? ai.selected : ''}
              disabled={ai.pending || ai.localBusy}
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
          </div>
          {finding && run ? (
            <div className="studio-finding" key={finding.id}>
              <div className="studio-tags">
                <span className="studio-tag">{finding.category}</span>
                <span className="studio-tag studio-risk">
                  {finding.severity === 'high' ? 'Alta' : 'Média'} · severidade original
                </span>
              </div>
              <h3>{finding.title}</h3>
              <p>{finding.impact}</p>
              <dl className="studio-facts">
                <div>
                  <dt>Verificação</dt>
                  <dd>{labChecks[run.check_type ?? 'bola'].label}</dd>
                </div>
                <div>
                  <dt>Evidências</dt>
                  <dd>{run.evidence?.length ?? 0} registros</dd>
                </div>
                <div>
                  <dt>Revisão do achado</dt>
                  <dd>{finding.review_status === 'reviewed' ? 'Revisado' : 'Pendente'}</dd>
                </div>
              </dl>
              <details className="studio-disclosure">
                <summary>Conferir {run.evidence?.length ?? 0} evidências disponíveis</summary>
                <div className="studio-disclosure-body">
                  <p className="studio-overline">FATOS DO LABORATÓRIO · SEM IA</p>
                  <p>
                    Veredito: vulnerabilidade demonstrada. Severidade original:{' '}
                    {finding.severity === 'high' ? 'Alta' : 'Média'}. A IA não altera estes fatos.
                  </p>
                  <p>
                    Achado: <code>{finding.id}</code>
                  </p>
                  <ul className="ai-evidence-list">
                    {run.evidence?.map((item) => (
                      <li key={item.scenario}>
                        <code>
                          {run.id}:{item.scenario}
                        </code>
                        <span>
                          GET {item.path} · {item.actor} · HTTP {item.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </div>
          ) : (
            <div className="studio-selection-hint">
              <Sparkles size={20} aria-hidden="true" />
              <p>Selecione um achado para ver seu contexto antes de analisar.</p>
            </div>
          )}
          <button
            type="submit"
            className="sakura-button studio-primary"
            aria-busy={ai.pending}
            disabled={
              !finding ||
              !run ||
              ai.pending ||
              ai.checking ||
              ai.localBusy ||
              ai.status?.status !== 'configured'
            }
          >
            {ai.pending ? (
              <LoaderCircle size={18} aria-hidden="true" />
            ) : (
              <Sparkles size={18} aria-hidden="true" />
            )}
            {ai.pending ? 'Mochi está analisando…' : 'Analisar com Mochi AI ✨'}
          </button>
          <p id="ai-sharing" className="studio-cost-note">
            Uma nova análise envia fatos minimizados à OpenAI e pode gerar custo. Uma análise atual
            já salva é reaproveitada.
          </p>
          <div className="studio-local-action">
            <History size={18} aria-hidden="true" />
            <div>
              <strong>Já investigou este achado?</strong>
              <button
                type="button"
                className="studio-text-button"
                disabled={!finding || !run || ai.pending || ai.localBusy}
                onClick={() => {
                  if (finding && run) void ai.loadSaved(finding, run)
                }}
              >
                {ai.localBusy ? 'Consultando armazenamento…' : 'Consultar análises salvas'}
              </button>
              <span>Leitura local, sem gerar uma nova resposta.</span>
            </div>
          </div>
        </form>
      )}
      <p className="studio-evidence-foot">
        <ShieldCheck size={14} aria-hidden="true" /> Laboratório isolado · dados fictícios
      </p>
    </section>
  )
}
