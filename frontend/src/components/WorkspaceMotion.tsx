import { createContext, useContext, type ReactNode } from 'react'
import { Pause, Play } from 'lucide-react'
import { useMochiMotion } from '../useMochiState'

const MotionContext = createContext<ReturnType<typeof useMochiMotion> | null>(null)

/** One environment subscription and pause state across all routes. */
export function WorkspaceMotionProvider({ children }: { children: ReactNode }) {
  const motion = useMochiMotion()
  return <MotionContext.Provider value={motion}>{children}</MotionContext.Provider>
}

export function useWorkspaceMotion() {
  const motion = useContext(MotionContext)
  if (!motion) throw new Error('WorkspaceMotionProvider ausente')
  return motion
}

export function MotionToggle({ compact = false }: { compact?: boolean }) {
  const motion = useWorkspaceMotion()
  if (motion.reduced)
    return <span className="motion-preference">Movimento reduzido pelo sistema</span>
  const label = motion.paused ? 'Retomar animações' : 'Pausar animações'
  return (
    <button
      type="button"
      className={`motion-toggle ${compact ? 'motion-toggle-compact' : ''}`}
      onClick={motion.toggle}
      aria-label={label}
    >
      {motion.paused ? (
        <Play size={15} aria-hidden="true" />
      ) : (
        <Pause size={15} aria-hidden="true" />
      )}
      <span>{label}</span>
    </button>
  )
}
