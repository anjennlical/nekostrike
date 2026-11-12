import { CircleCheck, CircleHelp, TriangleAlert } from 'lucide-react'

export default function StatusBadge({
  status,
}: {
  status: 'unknown' | 'loading' | 'online' | 'offline'
}) {
  return (
    <span key={status} className={`status-badge ${status}`}>
      {status === 'online' ? (
        <CircleCheck className="status-confirmation" size={14} aria-hidden="true" />
      ) : status === 'offline' ? (
        <TriangleAlert size={14} aria-hidden="true" />
      ) : status === 'unknown' ? (
        <CircleHelp size={14} aria-hidden="true" />
      ) : (
        <span className="status-dot" aria-hidden="true" />
      )}
      {status === 'online'
        ? 'API conectada'
        : status === 'loading'
          ? 'Verificando conexão…'
          : status === 'offline'
            ? 'API indisponível'
            : 'Conexão não verificada'}
    </span>
  )
}
