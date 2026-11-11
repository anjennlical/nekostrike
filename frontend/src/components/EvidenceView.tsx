import type { CheckType, Evidence } from '../workspace-api'
const bolaLabels = {
  baseline: 'Controle: pedido da Alice',
  cross_user: 'Teste: pedido do Bob',
  profile_response: 'Teste: campos do perfil público',
  negative_control: 'Controle negativo: versão corrigida',
}
export default function EvidenceView({
  evidence,
  checkType = 'bola',
}: {
  evidence: Evidence[]
  checkType?: CheckType
}) {
  const labels =
    checkType === 'data_exposure'
      ? {
          ...bolaLabels,
          baseline: 'Controle: perfil público mínimo',
          negative_control: 'Controle: sem identidade',
        }
      : bolaLabels
  return (
    <div className="evidence-list">
      {checkType === 'data_exposure' && (
        <p className="evidence-expectation">
          Campos permitidos: <code>id</code> e <code>display_name</code>. <code>email</code> e{' '}
          <code>internal_note</code> não devem aparecer. HTTP 200 apenas confirma que houve uma
          resposta.
        </p>
      )}
      {evidence.map((item) => (
        <details key={item.scenario} className="evidence-item">
          <summary>
            <span>{labels[item.scenario]}</span>
            <span className="subtle-tag">
              HTTP {item.status}
              {item.status === 200
                ? checkType === 'data_exposure'
                  ? ' · Resposta recebida'
                  : ' · Permitido'
                : item.status === 403 || item.status === 401
                  ? ' · Negado'
                  : ''}
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
