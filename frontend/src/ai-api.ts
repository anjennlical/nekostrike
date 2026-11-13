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
  provider: 'openai' | 'test_double'
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
  format_version?: 1
  analysis: Analysis
  provider: 'openai' | 'test_double'
  model: string
  cached: boolean
  requires_human_review: true
  deterministic_verdict: 'vulnerable'
  deterministic_severity: 'high' | 'medium'
  record?: {
    id: string
    created_at: string
    review_status: 'pending' | 'reviewed'
    usage: null
    run_id?: string | null
    check_type?: Run['check_type'] | null
    evidence_status?: 'current' | 'historical'
  } | null
  storage_warning?: boolean
  consumption?: {
    usage: {
      input_tokens: number
      output_tokens: number
      total_tokens: number
      cached_tokens: number | null
      reasoning_tokens: number | null
      cache_write_tokens: number | null
    } | null
    usage_status: 'reported' | 'not_provided' | 'invalid'
    service_tier: string | null
    reported_model: string | null
  } | null
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
    !['openai', 'test_double'].includes(String(value.provider)) ||
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
  if (value.format_version !== undefined && value.format_version !== 1)
    throw new Error('Versão do formato da análise não suportada. Atualize o aplicativo.')
  if (!validConsumption(value.consumption)) throw new Error('Consumo da análise inválido.')
  const a = value.analysis
  if (value.record !== undefined && value.record !== null) {
    const r = value.record
    if (
      !record(r) ||
      typeof r.id !== 'string' ||
      !/^[0-9a-f-]{36}$/.test(r.id) ||
      typeof r.created_at !== 'string' ||
      !Number.isFinite(Date.parse(r.created_at)) ||
      !['pending', 'reviewed'].includes(String(r.review_status)) ||
      r.usage !== null ||
      (r.run_id != null && (typeof r.run_id !== 'string' || !/^[0-9a-f-]{36}$/.test(r.run_id))) ||
      (r.check_type != null &&
        !['bola', 'data_exposure', 'security_misconfiguration'].includes(String(r.check_type))) ||
      (r.evidence_status !== undefined &&
        !['current', 'historical'].includes(String(r.evidence_status))) ||
      value.storage_warning === true
    ) {
      throw new Error('Metadados da análise salva inválidos.')
    }
  }
  if (value.storage_warning !== undefined && typeof value.storage_warning !== 'boolean')
    throw new Error('Estado de salvamento inválido.')
  const metadata = value.record as AIResult['record']
  const historical = metadata?.evidence_status === 'historical'
  const expectedRunId = historical ? metadata?.run_id : run.id
  if (
    metadata &&
    (historical
      ? !metadata.run_id || !metadata.check_type
      : (metadata.run_id != null && metadata.run_id !== run.id) ||
        (metadata.check_type != null && metadata.check_type !== run.check_type))
  )
    throw new Error('Execução da análise incompatível.')
  const references = historical ? historicalReferences(metadata!.check_type!) : run.evidence
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
    value.deterministic_severity !==
      (historical ? (metadata!.check_type === 'bola' ? 'high' : 'medium') : finding.severity) ||
    !Array.isArray(a.evidence_used) ||
    a.evidence_used.length !== 3 ||
    new Set(a.evidence_used.map((e) => (record(e) ? e.evidence_id : null))).size !== 3 ||
    !a.evidence_used.every(
      (e) =>
        record(e) &&
        references.some(
          (saved) =>
            e.evidence_id === `${expectedRunId}:${saved.scenario}` &&
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

function validConsumption(value: unknown): boolean {
  if (value === undefined || value === null) return true // Historical records.
  if (!record(value)) return false
  if (!['reported', 'not_provided', 'invalid'].includes(String(value.usage_status))) return false
  if (
    value.service_tier !== null &&
    !['auto', 'default', 'flex', 'scale', 'priority', 'fast', 'ultrafast'].includes(
      String(value.service_tier),
    )
  )
    return false
  if (
    value.reported_model !== null &&
    (typeof value.reported_model !== 'string' ||
      !/^[a-zA-Z0-9._:-]{1,100}$/.test(value.reported_model))
  )
    return false
  const u = value.usage
  if (u === null) return value.usage_status !== 'reported'
  if (!record(u) || value.usage_status !== 'reported') return false
  const count = (n: unknown): n is number => Number.isSafeInteger(n) && Number(n) >= 0
  if (!count(u.input_tokens) || !count(u.output_tokens) || !count(u.total_tokens)) return false
  if (u.total_tokens !== u.input_tokens + u.output_tokens) return false
  return (
    [u.cached_tokens, u.cache_write_tokens].every(
      (n) => n === null || (count(n) && n <= Number(u.input_tokens)),
    ) &&
    (u.reasoning_tokens === null ||
      (count(u.reasoning_tokens) && u.reasoning_tokens <= u.output_tokens))
  )
}

function historicalReferences(check: Run['check_type']) {
  // Same fixed fictional contracts as the laboratory; no arbitrary historical targets.
  const contracts = {
    bola: [
      ['baseline', '/lab/orders/order-alice', 'alice', 200],
      ['cross_user', '/lab/orders/order-bob', 'alice', 200],
      ['negative_control', '/lab/orders/order-bob', 'alice', 403],
    ],
    data_exposure: [
      ['baseline', '/lab/profiles/alice', 'bob', 200],
      ['profile_response', '/lab/profiles/alice', 'bob', 200],
      ['negative_control', '/lab/profiles/alice', 'anonymous', 401],
    ],
    security_misconfiguration: [
      ['baseline', '/lab/status', 'anonymous', 200],
      ['error_response', '/lab/error', 'anonymous', 500],
      ['negative_control', '/lab/error', 'anonymous', 500],
    ],
  } as const
  return contracts[check].map(([scenario, path, actor, status]) => ({
    scenario,
    path,
    actor,
    status,
  }))
}

/** Local storage only. Neither operation invokes the AI provider. */
export async function savedAIRequest(
  id: string,
  review?: 'pending' | 'reviewed',
): Promise<unknown> {
  const response = await fetch(
    review === undefined
      ? `/api/ai/analyses?finding_id=${encodeURIComponent(id)}`
      : `/api/ai/analyses/${encodeURIComponent(id)}`,
    {
      method: review === undefined ? 'GET' : 'PATCH',
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
      headers:
        review === undefined
          ? { Accept: 'application/json' }
          : {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'X-NekoStrike-Client': 'workspace',
            },
      ...(review === undefined ? {} : { body: JSON.stringify({ review_status: review }) }),
    },
  )
  if (!response.ok)
    throw new Error(
      'Não foi possível confirmar o histórico de análises. Preserve o banco e confira o backend; nenhuma chamada de IA foi feita nesta operação.',
    )
  return response.json()
}

const messages: Record<string, string> = {
  disabled: 'IA indisponível: integração desativada no backend.',
  missing_key: 'IA indisponível: credencial ausente no backend. Não envie chaves pelo chat.',
  missing_model: 'Escolha o modelo na configuração local do backend.',
  model_unavailable:
    'O modelo não está disponível para esta credencial. Confira o nome configurado e o acesso na sua conta.',
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
