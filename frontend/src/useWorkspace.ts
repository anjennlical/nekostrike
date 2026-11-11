import { useCallback, useEffect, useRef, useState } from 'react'
import { parseRun, parseWorkspace, workspaceRequest } from './workspace-api'
import type { CheckType, Run, Workspace } from './workspace-api'

export function useWorkspace() {
  const [data, setData] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [lastRun, setLastRun] = useState<Run | null>(null)
  const generation = useRef(0)
  const lock = useRef(false)
  const refresh = useCallback(async () => {
    const current = ++generation.current
    setLoading(true)
    setError(null)
    try {
      const next = parseWorkspace(await workspaceRequest('workspace'))
      if (current === generation.current) setData(next)
    } catch {
      if (current === generation.current) {
        setData(null)
        setError(
          'Não foi possível carregar o histórico. Os contadores estão indisponíveis; verifique o backend e tente atualizar.',
        )
      }
    } finally {
      if (current === generation.current) setLoading(false)
    }
  }, [])
  useEffect(() => {
    void refresh()
    return () => {
      generation.current++
    }
  }, [refresh])
  async function execute(mode: 'vulnerable' | 'fixed', check_type: CheckType = 'bola') {
    if (lock.current) return null
    lock.current = true
    setBusy('run')
    setError(null)
    setNotice(null)
    setLastRun(null)
    try {
      const run = parseRun(
        await workspaceRequest('runs', 'POST', {
          mode,
          ...(check_type === 'bola' ? {} : { check_type }),
        }),
      )
      setLastRun(run)
      setNotice('Execução concluída e salva no histórico local.')
      await refresh()
      return run
    } catch {
      setError(
        'Não foi possível confirmar a execução. Atualize o histórico antes de repetir: a resposta pode ter sido interrompida após o salvamento.',
      )
      return null
    } finally {
      lock.current = false
      setBusy(null)
    }
  }
  async function review(id: string, review_status: 'pending' | 'reviewed') {
    if (lock.current) return
    lock.current = true
    setBusy(id)
    setError(null)
    setNotice(null)
    try {
      await workspaceRequest(`findings/${encodeURIComponent(id)}`, 'PATCH', { review_status })
      setNotice('Estado de revisão salvo. Revisado não significa corrigido.')
      await refresh()
    } catch {
      setError(
        'Não foi possível confirmar a revisão. Atualize o histórico para consultar o estado salvo.',
      )
    } finally {
      lock.current = false
      setBusy(null)
    }
  }
  return { data, loading, busy, error, notice, lastRun, refresh, execute, review }
}
export type WorkspaceState = ReturnType<typeof useWorkspace>
