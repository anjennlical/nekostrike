import type { ReactNode } from 'react'
import { PawPrint, Sparkles } from 'lucide-react'
import MochiStudio from './MochiStudio'
import type { AIState } from '../useAI'

export default function MochiCompanion({
  ai,
  selected,
  hasResult,
  controls,
}: {
  ai: AIState
  selected: boolean
  hasResult: boolean
  controls?: ReactNode
}) {
  const mood = ai.pending
    ? 'thinking'
    : ai.error
      ? 'concerned'
      : ai.celebrating
        ? 'success'
        : selected
          ? 'warning'
          : 'idle'
  const title = ai.pending
    ? 'Vamos examinar essas evidências.'
    : ai.error
      ? 'Vamos conferir o que aconteceu.'
      : hasResult
        ? 'Clareza para a sua investigação.'
        : 'Olá! Sou a Mochi. ♡'
  const description = ai.pending
    ? 'Requisição em andamento. Você pode navegar sem repetir a chamada.'
    : ai.error
      ? 'Confira a mensagem abaixo antes de tentar novamente. Não repetimos solicitações automaticamente.'
      : hasResult
        ? 'Uma interpretação para apoiar sua leitura. A decisão continua com você.'
        : 'Escolha uma evidência e vamos entendê-la juntas. Cada descoberta começa com uma boa pergunta.'
  return (
    <header className="studio-companion" data-has-result={hasResult} data-mood={mood}>
      <div className="studio-companion-copy">
        <p className="studio-overline">
          <Sparkles size={14} aria-hidden="true" /> 02 / MOCHI ANALYSIS
        </p>
        <h2>{title}</h2>
        <p>{description}</p>
        <span className="studio-signature">
          <PawPrint size={14} aria-hidden="true" /> Sua parceira de investigação
        </span>
      </div>
      <figure className="studio-companion-art">
        <MochiStudio mood={mood} />
        <figcaption>
          {ai.pending
            ? 'Concentrada na sua solicitação'
            : hasResult
              ? 'Evidências primeiro. Revisão humana, sempre.'
              : 'Música imaginária. Curiosidade de verdade.'}
        </figcaption>
      </figure>
      {controls && <div className="studio-motion-control">{controls}</div>}
    </header>
  )
}
