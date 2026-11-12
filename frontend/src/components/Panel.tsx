import { useId, type ReactNode } from 'react'
import type { RevealVariant } from '../scroll-reveal'

export default function Panel({
  title,
  eyebrow,
  action,
  children,
  className = '',
  reveal = 'fade-up',
  revealIndex = 0,
}: {
  title: string
  eyebrow?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  reveal?: RevealVariant | false
  revealIndex?: number
}) {
  const titleId = useId()
  return (
    <section
      className={`panel sakura-panel ${className}`}
      aria-labelledby={titleId}
      data-reveal={reveal || undefined}
      data-reveal-index={revealIndex}
    >
      <div className="panel-heading">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 id={titleId}>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
