export default function StatusBadge({ status }: { status: 'loading' | 'online' | 'offline' }) {
  return (
    <span key={status} className={`status-badge ${status}`}>
      <span className="status-dot" />
      {status === 'online'
        ? 'API conectada'
        : status === 'loading'
          ? 'Conectando…'
          : 'API desconectada'}
    </span>
  )
}
