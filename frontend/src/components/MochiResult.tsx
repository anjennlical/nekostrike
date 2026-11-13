import type { ReactNode, RefObject } from 'react'
import {
  FileCheck2,
  Fingerprint,
  ShieldCheck,
  BookOpen,
  Lightbulb,
  Search,
  TriangleAlert,
  ClipboardCheck,
} from 'lucide-react'
import type { AIResult } from '../ai-api'
import type { AIState } from '../useAI'
import { MochiConsumption } from './MochiConsumption'

function ResultCard({
  number,
  title,
  children,
  icon,
  identity,
  wide = false,
}: {
  number: number
  title: string
  children: ReactNode
  icon: ReactNode
  identity: string
  wide?: boolean
}) {
  return (
    <section
      className={`studio-result-card ${wide ? 'studio-card-wide' : ''}`}
      data-reveal="fade-up"
      data-reveal-index={Math.min(number - 1, 3)}
      data-reveal-key={`${identity}:${number}`}
    >
      <header>
        <span className="studio-card-number">0{number}</span>
        {icon}
        <h4>{title}</h4>
      </header>
      {children}
    </section>
  )
}

export default function MochiResult({
  result,
  ai,
  headingRef,
}: {
  result: AIResult
  ai: AIState
  headingRef: RefObject<HTMLHeadingElement | null>
}) {
  const a = result.analysis
  const identity = result.record?.id ?? a.finding_id
  const reviewed = result.record?.review_status === 'reviewed'
  return (
    <section className="ai-result studio-result" aria-label="Explicação da Mochi">
      <div className="studio-result-title">
        <FileCheck2 size={22} aria-hidden="true" />
        <div>
          <p className="studio-overline">
            INTERPRETAÇÃO GERADA POR IA · REVISÃO HUMANA OBRIGATÓRIA
          </p>
          <h3 ref={headingRef} tabIndex={-1}>
            Uma explicação para revisar
          </h3>
        </div>
      </div>
      <div className="studio-result-meta">
        <span>
          {result.provider === 'test_double' ? 'PROVEDOR SIMULADO DE TESTE' : 'Resposta da OpenAI'}
        </span>
        <span>{result.model}</span>
        {result.cached && <span>Análise existente reaproveitada, sem nova chamada.</span>}
      </div>
      {result.storage_warning && (
        <p role="alert" className="ai-error">
          A resposta chegou, mas não foi possível confirmar seu salvamento. Preserve esta tela. Não
          repita a chamada paga para tentar salvar.
        </p>
      )}
      {result.record?.evidence_status === 'historical' && (
        <p className="ai-historical" role="status">
          Análise histórica: o contexto atual do achado é diferente. As referências pertencem à
          execução original, não às evidências atuais.
        </p>
      )}
      <div className="studio-result-grid">
        <ResultCard
          number={1}
          title="Resumo do achado"
          icon={<BookOpen size={18} aria-hidden="true" />}
          identity={identity}
          wide
        >
          <p className="studio-summary-text">{a.summary}</p>
        </ResultCard>
        <ResultCard
          number={2}
          title="Explicação técnica"
          icon={<Search size={18} aria-hidden="true" />}
          identity={identity}
        >
          <p>{a.technical_explanation}</p>
        </ResultCard>
        <ResultCard
          number={3}
          title="Impacto potencial"
          icon={<TriangleAlert size={18} aria-hidden="true" />}
          identity={identity}
        >
          <p>{a.potential_impact}</p>
        </ResultCard>
        <ResultCard
          number={4}
          title="Evidências utilizadas"
          icon={<Fingerprint size={18} aria-hidden="true" />}
          identity={identity}
          wide
        >
          <ul className="studio-references ai-evidence-list">
            {a.evidence_used.map((e, i) => (
              <li key={e.evidence_id}>
                <span className="studio-reference-index">E0{i + 1}</span>
                <div>
                  <strong>GET {e.path}</strong>
                  <span>
                    {e.actor} · HTTP {e.status}
                  </span>
                  <code>{e.evidence_id}</code>
                </div>
              </li>
            ))}
          </ul>
        </ResultCard>
        <ResultCard
          number={5}
          title="Recomendações"
          icon={<Lightbulb size={18} aria-hidden="true" />}
          identity={identity}
        >
          <ol className="studio-recommendations">
            {a.recommendations.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </ResultCard>
        <ResultCard
          number={6}
          title="Limitações e incertezas"
          icon={<ShieldCheck size={18} aria-hidden="true" />}
          identity={identity}
        >
          <ul>
            {a.limitations.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </ResultCard>
        <ResultCard
          number={7}
          title="Revisão humana"
          icon={<ClipboardCheck size={18} aria-hidden="true" />}
          identity={identity}
          wide
        >
          <div className="studio-review" data-reviewed={reviewed}>
            <span className="studio-review-seal" aria-hidden="true">
              <ShieldCheck size={30} />
            </span>
            <div>
              <strong>
                {reviewed ? 'Revisada por você' : 'Sua leitura faz parte da análise.'}
              </strong>
              <p>
                A IA pode errar mesmo com referências válidas. Compare o texto com as evidências.
                Revisado não significa corrigido; veredito e severidade originais foram preservados.
              </p>
              <p className="studio-small">
                Esta análise{' '}
                {result.record
                  ? 'foi salva no SQLite e pode ser incluída opcionalmente no relatório.'
                  : 'fica apenas nesta sessão e será perdida ao recarregar a página.'}
              </p>
              {result.record && (
                <button
                  type="button"
                  className="sakura-button"
                  disabled={ai.pending || ai.localBusy}
                  onClick={() => void ai.reviewAnalysis(reviewed ? 'pending' : 'reviewed')}
                >
                  <ClipboardCheck size={17} aria-hidden="true" />
                  {reviewed ? 'Reabrir revisão da análise' : 'Marcar análise como revisada'}
                </button>
              )}
              <p className="studio-small">Esta revisão é separada da revisão do achado.</p>
            </div>
          </div>
        </ResultCard>
      </div>
      <div className="studio-record-tools">
        {result.record && (
          <details className="studio-disclosure">
            <summary>Identificação e origem da análise</summary>
            <div className="studio-disclosure-body">
              <p>
                Salva em{' '}
                <time dateTime={result.record.created_at}>
                  {new Date(result.record.created_at).toLocaleString('pt-BR')}
                </time>
              </p>
              <p>
                Execução original: <code>{result.record.run_id}</code>
              </p>
              <p>
                Análise: <code>{result.record.id}</code>
              </p>
              <p>Versão do formato: {result.format_version ?? 1}</p>
            </div>
          </details>
        )}
        <MochiConsumption result={result} />
      </div>
      <a className="studio-text-link" href="#findings">
        Comparar com as evidências em Findings →
      </a>
    </section>
  )
}
