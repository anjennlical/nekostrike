import { useEffect, useState } from 'react'
import { CircleCheck, X } from 'lucide-react'
import { useWorkspaceMotion } from './WorkspaceMotion'
export default function Notice({ message }: { message: string }) {
  const [closing, setClosing] = useState(false)
  const [hidden, setHidden] = useState(false)
  const motion = useWorkspaceMotion()
  useEffect(() => {
    if (!closing) return
    if (!motion.enabled) {
      setHidden(true)
      return
    }
    const timer = setTimeout(() => setHidden(true), 180)
    return () => clearTimeout(timer)
  }, [closing, motion.enabled])
  if (hidden) return null
  return (
    <div
      className="experience-notice"
      data-closing={closing || undefined}
      inert={closing || undefined}
    >
      <CircleCheck size={18} aria-hidden="true" />
      <p role="status">{message}</p>
      <button
        type="button"
        aria-label="Dispensar confirmação"
        onClick={() => {
          document.getElementById('main-content')?.focus({ preventScroll: true })
          setClosing(true)
        }}
      >
        <X size={16} />
      </button>
    </div>
  )
}
