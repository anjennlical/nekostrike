import type { Evidence } from '../workspace-api'
const labels = {
  baseline: 'Controle: pedido da Alice',
  cross_user: 'Teste: pedido do Bob',
  negative_control: 'Controle negativo: versão corrigida',
}
export default function EvidenceView({ evidence }: { evidence: Evidence[] }) {
  return (
    <div className="evidence-list">
      {evidence.map((item) => (
        <details key={item.scenario} className="evidence-item">
          <summary>
            <span>{labels[item.scenario]}</span>
            <span className="subtle-tag">
              HTTP {item.status}
              {item.status === 200 ? ' · Permitido' : item.status === 403 ? ' · Negado' : ''}
            </span>
          </summary>
          <p>
            Ator: <strong>{item.actor}</strong> · Modo:{' '}
            {item.lab_mode === 'fixed' ? 'corrigido' : 'vulnerável'} · Esperado: HTTP{' '}
            {item.expected_status}
          </p>
          <div className="response-frame">
            <div className="response-heading">
              <span>
                {item.method} {item.path}
              </span>
            </div>
            <pre className="response-code" aria-label={`Resposta: ${labels[item.scenario]}`}>
              {JSON.stringify(item.body, null, 2)}
            </pre>
          </div>
        </details>
      ))}
    </div>
  )
}
