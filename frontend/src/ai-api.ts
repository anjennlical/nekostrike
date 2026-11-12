import type { Finding, Run } from './workspace-api'

export const aiStatuses = [
  'disabled',
  'missing_key',
  'missing_model',
  'invalid_config',
  'configured',
] as const
export type AIStatus = {
  status: (typeof aiStatuses)[number]
  provider: 'openai'
  model: string | null
  requests_remaining: number
  max_output_tokens: number
  timeout_seconds: number
  provider_verified: false
}
export type Analysis = {
  finding_id: string
  summary: string
  technical_explanation: string
  potential_impact: string
  evidence_used: { evidence_id: string; path: string; actor: string; status: number }[]
  recommendations: string[]
  limitations: string[]
}
export type AIResult = {
  analysis: Analysis
  provider: 'openai' | 'test_double'
  model: string
  cached: boolean
  requires_human_review: true
  deterministic_verdict: 'vulnerable'
  deterministic_severity: 'high' | 'medium'
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 1800
}
function texts(value: unknown): value is string[] {
  return Array.isArray(value) && value.length >= 1 && value.length <= 6 && value.every(text)
}
export function parseAIStatus(value: unknown): AIStatus {
  if (
    !record(value) ||
    !aiStatuses.includes(value.status as AIStatus['status']) ||
    value.provider !== 'openai' ||
    value.provider_verified !== false ||
    !(value.model === null || text(value.model)) ||
    !Number.isInteger(value.requests_remaining) ||
    Number(value.requests_remaining) < 0 ||
    !Number.isInteger(value.max_output_tokens) ||
    !Number.isInteger(value.timeout_seconds)
  ) {
    throw new Error('Estado da IA inválido. Atualize a configuração.')
  }
  return value as AIStatus
}

export function parseAIResult(value: unknown, finding: Finding, run: Run): AIResult {
  if (!record(value) || !record(value.analysis)) throw new Error('Resposta da IA inválida.')
  const a = value.analysis
  if (
    a.finding_id !== finding.id ||
    finding.run_id !== run.id ||
    !text(a.summary) ||
    !text(a.technical_explanation) ||
    !text(a.potential_impact) ||
    !texts(a.recommendations) ||
    !texts(a.limitations) ||
    value.requires_human_review !== true ||
    typeof value.cached !== 'boolean' ||
    !['openai', 'test_double'].includes(String(value.provider)) ||
    !text(value.model) ||
    value.deterministic_verdict !== run.verdict ||
    value.deterministic_verdict !== 'vulnerable' ||
    value.deterministic_severity !== finding.severity ||
    !Array.isArray(a.evidence_used) ||
    a.evidence_used.length !== 3 ||
    new Set(a.evidence_used.map((e) => (record(e) ? e.evidence_id : null))).size !== 3 ||
    !a.evidence_used.every(
      (e) =>
        record(e) &&
        run.evidence.some(
          (saved) =>
            e.evidence_id === `${run.id}:${saved.scenario}` &&
            e.path === saved.path &&
            e.actor === saved.actor &&
            e.status === saved.status,
        ),
    )
  ) {
    throw new Error('Resposta descartada: contrato ou referências incompatíveis com o achado.')
  }
  return value as AIResult
}

const messages: Record<string, string> = {
  disabled: 'IA indisponível: integração desativada no backend.',
  missing_key: 'IA indisponível: credencial ausente no backend. Não envie chaves pelo chat.',
  missing_model: 'Escolha o modelo na configuração local do backend.',
  invalid_config: 'Configuração local inválida. Confira o guia da Mochi.',
  finding_not_found: 'O achado não está mais no histórico. Atualize o workspace.',
  input_too_large: 'Evidências acima do limite; nenhum dado foi enviado ao provedor.',
  invalid_evidence: 'As evidências não correspondem ao contrato do laboratório.',
  storage_unavailable: 'Não foi possível ler o histórico local.',
  busy: 'Uma análise já está em andamento. Aguarde.',
  cooldown: 'Aguarde dez segundos antes de solicitar outra análise.',
  session_limit: 'Limite de chamadas do processo atingido. Revise os custos antes de reiniciar.',
  timeout: 'Tempo limite atingido. Não repetimos a chamada; pode haver cobrança no provedor.',
  authentication: 'O provedor recusou a credencial. Confira a configuração local.',
  provider_limit: 'Limite ou saldo do provedor indisponível. Confira sua conta.',
  provider_unavailable: 'Provedor indisponível ou configuração não aceita.',
  invalid_output: 'A resposta não passou pela validação e foi descartada.',
  ungrounded_output: 'A resposta citou dados incompatíveis com as evidências e foi descartada.',
  refusal: 'O provedor recusou esta análise.',
  incomplete: 'A resposta ficou incompleta e foi descartada.',
}

export async function aiRequest(
  path: 'status' | 'analyze',
  signal: AbortSignal,
  findingId?: string,
): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`/api/ai/${path}`, {
      method: path === 'analyze' ? 'POST' : 'GET',
      signal,
      cache: 'no-store',
      headers:
        path === 'analyze'
          ? {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'X-NekoStrike-Client': 'workspace',
            }
          : { Accept: 'application/json' },
      ...(path === 'analyze' ? { body: JSON.stringify({ finding_id: findingId }) } : {}),
    })
  } catch {
    throw new Error(
      path === 'analyze'
        ? 'Comunicação interrompida. A chamada pode ter chegado ao provedor e gerado custo. Não houve repetição automática.'
        : 'Não foi possível consultar a configuração. Verifique o backend e tente atualizar.',
    )
  }
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const code = record(data) && record(data.detail) ? String(data.detail.code) : ''
    throw new Error(
      messages[code] ??
        'Não foi possível confirmar a análise. Confira o backend; não repetimos a chamada.',
    )
  }
  return data
}
