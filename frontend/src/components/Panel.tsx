import { useId, type ReactNode } from 'react'

export default function Panel({
  title,
  eyebrow,
  action,
  children,
  className = '',
}: {
  title: string
  eyebrow?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  const titleId = useId()
  return (
    <section className={`panel sakura-panel ${className}`} aria-labelledby={titleId}>
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
