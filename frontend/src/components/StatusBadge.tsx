import { CircleCheck } from 'lucide-react'

export default function StatusBadge({ status }: { status: 'loading' | 'online' | 'offline' }) {
  return (
    <span key={status} className={`status-badge ${status}`}>
      {status === 'online' ? (
        <CircleCheck className="status-confirmation" size={14} aria-hidden="true" />
      ) : (
        <span className="status-dot" aria-hidden="true" />
      )}
      {status === 'online'
        ? 'API conectada'
        : status === 'loading'
          ? 'Conectando…'
          : 'API desconectada'}
    </span>
  )
}
