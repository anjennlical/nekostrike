import { useCallback, useEffect, useRef, useState } from 'react'
import { aiRequest, parseAIResult, parseAIStatus } from './ai-api'
import type { AIResult, AIStatus } from './ai-api'
import type { Finding, Run } from './workspace-api'

/** Lives in App so route navigation cannot abort or duplicate a potentially paid request. */
export function useAI() {
  const [status, setStatus] = useState<AIStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [selected, setSelected] = useState('')
  const [result, setResult] = useState<AIResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lock = useRef(false)
  const alive = useRef(true)
  const statusGeneration = useRef(0)
  const activeRequest = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    const generation = ++statusGeneration.current
    setChecking(true)
    setStatusError(null)
    try {
      const next = parseAIStatus(await aiRequest('status', AbortSignal.timeout(10000)))
      if (alive.current && generation === statusGeneration.current) setStatus(next)
    } catch (e) {
      if (alive.current && generation === statusGeneration.current) {
        setStatus(null)
        setStatusError(e instanceof Error ? e.message : 'Configuração indisponível.')
      }
    } finally {
      if (alive.current && generation === statusGeneration.current) setChecking(false)
    }
  }, [])
  useEffect(() => {
    alive.current = true
    void refresh()
    return () => {
      alive.current = false
      statusGeneration.current++
      activeRequest.current?.abort()
    }
  }, [refresh])
  function select(id: string) {
    if (lock.current) return
    setSelected(id)
    setResult(null)
    setError(null)
  }
  async function analyze(finding: Finding, run: Run) {
    if (lock.current || status?.status !== 'configured') return
    lock.current = true
    setPending(true)
    setResult(null)
    setError(null)
    const controller = new AbortController()
    activeRequest.current = controller
    try {
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(70000)])
      const next = parseAIResult(await aiRequest('analyze', signal, finding.id), finding, run)
      if (alive.current) setResult(next)
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Análise indisponível.')
    } finally {
      lock.current = false
      activeRequest.current = null
      if (alive.current) {
        setPending(false)
        void refresh()
      }
    }
  }
  return {
    status,
    checking,
    statusError,
    pending,
    selected,
    result,
    error,
    select,
    analyze,
    refresh,
  }
}
export type AIState = ReturnType<typeof useAI>
