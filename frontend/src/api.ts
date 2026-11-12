import { aiStatuses } from './ai-api.ts'
import type { AIStatus } from './ai-api'

export type Health = {
  status: 'ok'
  service: 'nekostrike-api'
  version: string
  environment: 'local'
  timestamp: string
  lab: { status: 'ready'; checks?: ('bola' | 'data_exposure' | 'security_misconfiguration')[] }
  ai: { status: 'not_implemented' | AIStatus['status'] }
}

export function parseHealth(value: unknown): Health {
  if (!value || typeof value !== 'object') throw new Error('Resposta inválida da API.')
  const data = value as Partial<Health>
  if (
    data.status !== 'ok' ||
    data.service !== 'nekostrike-api' ||
    data.environment !== 'local' ||
    typeof data.version !== 'string' ||
    typeof data.timestamp !== 'string' ||
    !Number.isFinite(Date.parse(data.timestamp)) ||
    data.lab?.status !== 'ready' ||
    (data.lab.checks !== undefined &&
      (!Array.isArray(data.lab.checks) ||
        !data.lab.checks.every((check) =>
          ['bola', 'data_exposure', 'security_misconfiguration'].includes(check),
        ))) ||
    (data.ai?.status !== 'not_implemented' &&
      !aiStatuses.includes(data.ai?.status as AIStatus['status']))
  )
    throw new Error('A resposta não corresponde ao contrato do NekoStrike.')
  return data as Health
}

export async function fetchHealth(signal: AbortSignal): Promise<Health> {
  const response = await fetch('/api/health', {
    signal,
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`A conexão retornou HTTP ${response.status}.`)
  return parseHealth(await response.json())
}
