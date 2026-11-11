export type CheckType = 'bola' | 'data_exposure'
export type Evidence = {
  scenario: 'baseline' | 'cross_user' | 'profile_response' | 'negative_control'
  method: 'GET'
  path: string
  actor: string
  lab_mode: 'vulnerable' | 'fixed'
  expected_status: number
  status: number
  body: Record<string, unknown>
}
export type Run = {
  check_type: CheckType
  id: string
  created_at: string
  mode: 'vulnerable' | 'fixed'
  verdict: 'vulnerable' | 'protected'
  evidence: Evidence[]
}
export type Finding = {
  id: string
  run_id: string
  title: string
  severity: 'high' | 'medium'
  review_status: 'pending' | 'reviewed'
  category: string
  reference: string
  impact: string
  remediation: string
  severity_reason: string
}
export type Workspace = { runs: Run[]; findings: Finding[] }

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function hasStrings(value: Record<string, unknown>, keys: string[]) {
  return keys.every((key) => typeof value[key] === 'string' && value[key] !== '')
}
export function parseRun(value: unknown): Run {
  const check = record(value) ? (value.check_type === undefined ? 'bola' : value.check_type) : null
  if (
    !record(value) ||
    !['bola', 'data_exposure'].includes(check as string) ||
    !hasStrings(value, ['id', 'created_at']) ||
    !Number.isFinite(Date.parse(value.created_at as string)) ||
    !['vulnerable', 'fixed'].includes(value.mode as string) ||
    !['vulnerable', 'protected'].includes(value.verdict as string) ||
    !Array.isArray(value.evidence) ||
    value.evidence.length !== 3 ||
    !value.evidence.every(
      (e, index) =>
        record(e) &&
        e.scenario ===
          [
            'baseline',
            check === 'data_exposure' ? 'profile_response' : 'cross_user',
            'negative_control',
          ][index] &&
        e.method === 'GET' &&
        hasStrings(e, ['path', 'actor']) &&
        ['vulnerable', 'fixed'].includes(e.lab_mode as string) &&
        Number.isInteger(e.status) &&
        Number(e.status) >= 100 &&
        Number(e.status) <= 599 &&
        Number.isInteger(e.expected_status) &&
        record(e.body),
    )
  ) {
    throw new Error('Resposta de execução inválida.')
  }
  return { ...value, check_type: check } as unknown as Run
}
export function parseWorkspace(value: unknown): Workspace {
  if (!record(value) || !Array.isArray(value.runs) || !Array.isArray(value.findings)) {
    throw new Error('Resposta do workspace inválida.')
  }
  const runs = value.runs.map(parseRun)
  if (
    new Set(runs.map((run) => run.id)).size !== runs.length ||
    !value.findings.every(
      (f) =>
        record(f) &&
        hasStrings(f, [
          'id',
          'run_id',
          'title',
          'category',
          'reference',
          'impact',
          'remediation',
          'severity_reason',
        ]) &&
        ['high', 'medium'].includes(f.severity as string) &&
        ['pending', 'reviewed'].includes(f.review_status as string) &&
        runs.some(
          (run) =>
            run.id === f.run_id &&
            run.verdict === 'vulnerable' &&
            f.category === (run.check_type === 'data_exposure' ? 'API3:2023' : 'API1:2023') &&
            f.severity === (run.check_type === 'data_exposure' ? 'medium' : 'high'),
        ),
    )
  ) {
    throw new Error('Evidências do workspace inválidas.')
  }
  return { runs, findings: value.findings as Finding[] }
}
export async function workspaceRequest(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`/api/${path}`, {
    method,
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json', 'X-NekoStrike-Client': 'workspace' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!response.ok) throw new Error(`A operação retornou HTTP ${response.status}.`)
  return response.json() as Promise<unknown>
}
