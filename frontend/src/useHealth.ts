import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchHealth, type Health } from './api'

export type Connection =
  | { status: 'loading'; data: null; message: null }
  | { status: 'online'; data: Health; message: null }
  | { status: 'offline'; data: null; message: string }

export function useHealth() {
  const [connection, setConnection] = useState<Connection>({
    status: 'loading',
    data: null,
    message: null,
  })
  const active = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    setConnection({ status: 'loading', data: null, message: null })
    const timer = window.setTimeout(() => controller.abort(), 5000)
    try {
      const data = await fetchHealth(controller.signal)
      if (active.current === controller) setConnection({ status: 'online', data, message: null })
    } catch (error) {
      if (active.current === controller) {
        setConnection({
          status: 'offline',
          data: null,
          message: controller.signal.aborted
            ? 'O backend não respondeu em 5 segundos.'
            : error instanceof Error
              ? error.message
              : 'Não foi possível conectar ao backend.',
        })
      }
    } finally {
      window.clearTimeout(timer)
    }
  }, [])
  useEffect(() => {
    void refresh()
    return () => {
      active.current?.abort()
      active.current = null
    }
  }, [refresh])
  return { connection, refresh }
}
