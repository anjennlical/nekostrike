import { Info, RefreshCw, ShieldCheck } from 'lucide-react'
import StatusBadge from './StatusBadge'
import Tooltip from './Tooltip'
import type { Connection } from '../useHealth'
export default function SystemHeartbeat({
  connection,
  checkedAt,
  refresh,
}: {
  connection: Connection
  checkedAt: string | null
  refresh: () => Promise<void>
}) {
  return (
    <section
      className="system-heartbeat"
      aria-label="Conexão com o backend local"
      data-status={connection.status}
    >
      <div className="heartbeat-heading">
        <ShieldCheck size={17} aria-hidden="true" />
        <span>BACKEND LOCAL</span>
        <Tooltip
          label="O que esta conexão confirma?"
          text="Confirma somente uma resposta válida de /api/health. Não verifica banco, execução do laboratório ou provedor de IA."
        >
          <Info size={15} />
        </Tooltip>
      </div>
      <div className="heartbeat-state" role="status">
        <StatusBadge status={connection.status} />
        <span className="heartbeat-time">
          {checkedAt
            ? `Última resposta válida às ${checkedAt}`
            : 'Sem resposta válida nesta sessão'}
        </span>
      </div>
      <button
        type="button"
        className="heartbeat-refresh"
        disabled={connection.status === 'loading'}
        aria-busy={connection.status === 'loading'}
        onClick={() => void refresh()}
      >
        <RefreshCw size={14} aria-hidden="true" />
        {connection.status === 'offline' ? 'Tentar conexão novamente' : 'Verificar conexão'}
      </button>
    </section>
  )
}
