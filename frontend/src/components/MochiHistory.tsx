import type { AIState } from '../useAI'
import type { Finding, Run } from '../workspace-api'
import { History } from 'lucide-react'
import { labChecks } from '../lab-checks'

export default function MochiHistory({
  ai,
  finding,
  run,
  onOpen,
}: {
  ai: AIState
  finding?: Finding
  run?: Run
  onOpen: (id: string) => void
}) {
  const entries = ai.saved ?? []
  return (
    <section
      className="ai-history-section studio-surface studio-history"
      aria-labelledby="mochi-history-title"
      aria-busy={ai.historyState === 'loading'}
      data-reveal="fade-up"
      data-reveal-key="studio-history"
    >
      <div className="studio-section-heading">
        <span className="studio-section-icon">
          <History size={21} aria-hidden="true" />
        </span>
        <div>
          <p className="studio-overline">03 / SEU CADERNO DE INVESTIGAÇÕES</p>
          <h3 id="mochi-history-title">Histórico de análises ♡</h3>
        </div>
      </div>
      <p className="ai-help">
        {finding
          ? `Achado selecionado: ${finding.title}`
          : 'Selecione um achado para consultar suas análises.'}{' '}
        Consultar ou abrir um registro não chama a OpenAI.
      </p>
      <button
        type="button"
        className="sakura-button"
        disabled={!finding || !run || ai.pending || ai.localBusy}
        onClick={() => {
          if (finding && run) void ai.loadSaved(finding, run)
        }}
      >
        {ai.historyState === 'loading'
          ? 'Carregando histórico…'
          : ai.historyState === 'error'
            ? 'Tentar consultar novamente'
            : 'Atualizar histórico'}
      </button>
      {ai.historyState === 'loading' && (
        <p role="status">Mochi está buscando os registros no armazenamento local…</p>
      )}
      {ai.historyState === 'error' && (
        <p role="alert">
          Não foi possível carregar o histórico. Tente consultar novamente; nenhuma chamada de IA
          será feita.
        </p>
      )}
      {ai.historyState === 'ready' && entries.length === 0 && (
        <p className="ai-history-empty" role="status">
          Nossa Mochi ainda não tem uma análise salva para este achado. Vamos começar? ♡
        </p>
      )}
      {entries.length > 0 && (
        <ul className="ai-history-list">
          {entries.map((item, index) => {
            const saved = item.record!
            const selected = ai.result?.record?.id === saved.id
            return (
              <li
                key={saved.id}
                className="ai-history-card"
                data-selected={selected}
                data-reveal={index < 4 ? 'fade-up' : undefined}
                data-reveal-index={index}
                data-reveal-key={`history:${saved.id}`}
              >
                <p className="studio-overline">
                  {saved.check_type
                    ? labChecks[saved.check_type].label
                    : (finding?.category ?? 'Análise salva')}
                </p>
                <div className="ai-config-row">
                  <strong>{item.model}</strong>
                  <span className="subtle-tag">
                    {saved.review_status === 'reviewed' ? 'Revisada' : 'Revisão pendente'}
                  </span>
                </div>
                <p>
                  <time dateTime={saved.created_at}>
                    {new Date(saved.created_at).toLocaleString('pt-BR')}
                  </time>{' '}
                  · {item.provider === 'test_double' ? 'Simulação de teste' : 'OpenAI'}
                </p>
                <p className="ai-help">
                  Execução original: <code>{saved.run_id ?? run?.id}</code>
                  <br />
                  Análise: <code>{saved.id}</code>
                </p>
                {saved.evidence_status === 'historical' && (
                  <p className="ai-historical">
                    Histórica · evidências atuais diferentes da execução interpretada.
                  </p>
                )}
                <button
                  type="button"
                  className="sakura-button"
                  aria-pressed={selected}
                  disabled={ai.pending || ai.localBusy}
                  onClick={() => onOpen(saved.id)}
                >
                  {selected ? 'Análise aberta' : 'Abrir análise'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
