import { useId } from 'react'
import type { LucideIcon } from 'lucide-react'

/** A saved count is distinct from loading, refreshing, or an unavailable read. */
export default function MetricCard({
  title,
  icon: Icon,
  tone,
  sub,
  value,
  loading,
}: {
  title: string
  icon: LucideIcon
  tone: string
  sub: string
  value: number | undefined
  loading: boolean
}) {
  const titleId = useId()
  const state = loading
    ? value === undefined
      ? 'Carregando…'
      : 'Atualizando…'
    : value === undefined
      ? 'Dados indisponíveis'
      : 'No histórico local'
  return (
    <section className="metric-card" aria-labelledby={titleId} aria-busy={loading}>
      <div className="metric-top">
        <h2 id={titleId}>{title}</h2>
        <span className={`metric-icon ${tone}`} aria-hidden="true">
          <Icon size={20} />
        </span>
      </div>
      <div className="metric-value">
        {value ?? '—'} <span>{state}</span>
      </div>
      <p>{sub}</p>
    </section>
  )
}
