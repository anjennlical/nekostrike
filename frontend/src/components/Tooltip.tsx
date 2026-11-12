import { useId, useState, type ReactNode } from 'react'
export default function Tooltip({
  text,
  label,
  children,
}: {
  text: string
  label: string
  children: ReactNode
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <span
      className="tooltip-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="tooltip-trigger"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false)
            event.stopPropagation()
          }
        }}
      >
        {children}
      </button>
      <span
        id={id}
        role="tooltip"
        className="sakura-tooltip"
        data-open={open || undefined}
        aria-hidden={!open}
      >
        {text}
      </span>
    </span>
  )
}
