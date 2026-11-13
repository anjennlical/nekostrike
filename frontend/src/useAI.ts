import { useCallback, useEffect, useRef, useState } from 'react'
import { aiRequest, parseAIResult, parseAIStatus, savedAIRequest } from './ai-api'
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
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [celebrating, setCelebrating] = useState(false)
  const [saved, setSaved] = useState<AIResult[]>([])
  const [localBusy, setLocalBusy] = useState(false)
  const [localNotice, setLocalNotice] = useState<string | null>(null)
  const [historyState, setHistoryState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
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
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current)
    }
  }, [refresh])
  function select(id: string) {
    if (lock.current) return
    setSelected(id)
    setResult(null)
    setError(null)
    setCelebrating(false)
    setSaved([])
    setLocalNotice(null)
    setHistoryState('idle')
  }
  async function loadSaved(finding: Finding, run: Run) {
    if (lock.current || finding.id !== selected) return
    lock.current = true
    setLocalBusy(true)
    setHistoryState('loading')
    setError(null)
    setLocalNotice(null)
    setResult(null)
    setSaved([])
    try {
      const raw = await savedAIRequest(finding.id)
      if (!Array.isArray(raw)) throw new Error('Histórico de análises inválido.')
      const entries = raw.map((item) => parseAIResult(item, finding, run))
      if (entries.some((item) => !item.record)) throw new Error('Histórico de análises inválido.')
      if (alive.current) {
        setSaved(entries)
        setHistoryState('ready')
        setResult(entries[0] ?? null)
        setCelebrating(false)
        setLocalNotice(
          entries.length
            ? 'Análises recuperadas do SQLite, sem chamada ao provedor.'
            : 'Nenhuma análise salva para este achado.',
        )
      }
    } catch {
      if (alive.current) {
        setHistoryState('error')
        setError(
          'Não foi possível carregar as análises salvas. Preserve o banco e confira o backend; nenhuma chamada de IA foi feita.',
        )
      }
    } finally {
      lock.current = false
      if (alive.current) setLocalBusy(false)
    }
  }
  function openSaved(id: string) {
    if (lock.current) return
    setResult(saved.find((item) => item.record?.id === id) ?? null)
    setCelebrating(false)
    setError(null)
    setLocalNotice('Análise recuperada do SQLite, sem chamada ao provedor.')
  }
  async function reviewAnalysis(review_status: 'pending' | 'reviewed') {
    if (lock.current || !result?.record) return
    const current = result
    const id = result.record.id
    lock.current = true
    setLocalBusy(true)
    setError(null)
    try {
      const response = (await savedAIRequest(id, review_status)) as {
        id?: string
        review_status?: string
      }
      if (response?.id !== id || response.review_status !== review_status) throw new Error()
      const next = { ...current, record: { ...current.record!, review_status } }
      if (alive.current) {
        setResult(next)
        setSaved((items) => items.map((item) => (item.record?.id === id ? next : item)))
        setLocalNotice('Revisão da análise salva. O estado do achado não foi alterado.')
      }
    } catch {
      if (alive.current)
        setError(
          'Não foi possível confirmar a revisão. Consulte as análises salvas antes de repetir.',
        )
    } finally {
      lock.current = false
      if (alive.current) setLocalBusy(false)
    }
  }
  async function analyze(finding: Finding, run: Run) {
    if (
      lock.current ||
      checking ||
      status?.status !== 'configured' ||
      finding.id !== selected ||
      finding.run_id !== run.id ||
      run.verdict !== 'vulnerable'
    )
      return
    lock.current = true
    setPending(true)
    setGenerationError(null)
    setResult(null)
    setError(null)
    setLocalNotice(null)
    setCelebrating(false)
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current)
    const controller = new AbortController()
    activeRequest.current = controller
    try {
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(70000)])
      const next = parseAIResult(await aiRequest('analyze', signal, finding.id), finding, run)
      if (alive.current) {
        setResult(next)
        if (next.record)
          setSaved((items) => [
            next,
            ...items.filter((item) => item.record?.id !== next.record?.id),
          ])
        // A newly generated entry is visible; it is not a complete history query.
        setCelebrating(!next.cached)
        if (!next.cached)
          celebrationTimer.current = setTimeout(() => {
            if (alive.current) setCelebrating(false)
          }, 1600)
      }
    } catch (e) {
      if (alive.current) {
        const message = e instanceof Error ? e.message : 'Análise indisponível.'
        setError(message)
        setGenerationError(message)
      }
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
    celebrating,
    saved,
    localBusy,
    localNotice,
    historyState,
    loadSaved,
    openSaved,
    reviewAnalysis,
    select,
    analyze,
    refresh,
    generationError,
  }
}
export type AIState = ReturnType<typeof useAI>
