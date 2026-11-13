import type { AIResult } from '../ai-api'

export function MochiConsumption({ result }: { result: AIResult }) {
  const metadata = result.consumption
  const usage = metadata?.usage
  const display = (value: number | null) =>
    value === null ? 'Não informado' : value.toLocaleString('pt-BR')
  return (
    <details className="ai-consumption">
      <summary>Consumo desta análise</summary>
      {result.provider === 'test_double' && <p>Valores simulados para teste, sem cobrança.</p>}
      {usage ? (
        <>
          <dl>
            <div>
              <dt>Entrada</dt>
              <dd>{display(usage.input_tokens)} tokens</dd>
            </div>
            <div>
              <dt>Saída</dt>
              <dd>{display(usage.output_tokens)} tokens</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{display(usage.total_tokens)} tokens</dd>
            </div>
            <div>
              <dt>Entrada em cache</dt>
              <dd>{display(usage.cached_tokens)}</dd>
            </div>
            <div>
              <dt>Raciocínio</dt>
              <dd>{display(usage.reasoning_tokens)}</dd>
            </div>
            <div>
              <dt>Gravação de cache</dt>
              <dd>{display(usage.cache_write_tokens)}</dd>
            </div>
          </dl>
          <p>Raciocínio já está incluído na saída. O total soma apenas entrada e saída.</p>
        </>
      ) : (
        <p>
          {metadata?.usage_status === 'invalid'
            ? 'O provedor retornou consumo inconsistente; os números não foram aceitos.'
            : 'Consumo não registrado; não significa custo zero.'}
        </p>
      )}
      <p>
        Modelo informado pelo provedor: {metadata?.reported_model ?? 'Não informado'}. Modalidade
        efetiva: {metadata?.service_tier ?? 'Não informada'}.
      </p>
      <p>
        Custo monetário não calculado: ainda não há tabela de preços e câmbio versionada no produto.
        Estes dados não substituem a fatura do provedor.
      </p>
      {result.cached && (
        <p>
          Resposta reaproveitada localmente: os tokens pertencem à geração original, sem nova
          chamada.
        </p>
      )}
    </details>
  )
}
