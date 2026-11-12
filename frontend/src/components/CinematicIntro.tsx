import { useEffect } from 'react'
import Mochi from './Mochi'
import Dialog from './Dialog'
import { useWorkspaceMotion } from './WorkspaceMotion'
export default function CinematicIntro({
  open,
  onClose,
  automatic,
}: {
  open: boolean
  onClose: () => void
  automatic: boolean
}) {
  const motion = useWorkspaceMotion()
  useEffect(() => {
    if (!open) return
    if (motion.reduced || motion.paused || !motion.enabled) {
      onClose()
      return
    }
    const timer = setTimeout(onClose, 2200)
    return () => clearTimeout(timer)
  }, [open, motion.reduced, motion.paused, motion.enabled, onClose])
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="intro-title"
      className="cinematic-intro"
      onAfterClose={
        automatic
          ? () => document.getElementById('main-content')?.focus({ preventScroll: true })
          : undefined
      }
    >
      <div className="intro-stage">
        <button type="button" className="intro-skip" onClick={onClose} autoFocus>
          Pular introdução <span aria-hidden="true">→</span>
        </button>
        <div className="intro-grid" aria-hidden="true" />
        <div className="intro-lights" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <svg className="intro-sigil" viewBox="0 0 120 120" aria-hidden="true">
          <path pathLength="1" d="M60 9 100 25v30c0 25-19 43-40 56C39 98 20 80 20 55V25Z" />
          <g>
            <ellipse cx="60" cy="69" rx="17" ry="13" />
            <ellipse cx="39" cy="49" rx="6" ry="9" />
            <ellipse cx="58" cy="39" rx="6" ry="9" />
            <ellipse cx="79" cy="49" rx="6" ry="9" />
          </g>
        </svg>
        <div className="intro-mochi" aria-hidden="true">
          <Mochi decorative />
          <span>✦</span>
        </div>
        <div className="intro-wordmark">
          <p className="eyebrow">WELCOME TO</p>
          <h2 id="intro-title">
            NekoStrike<span>♡</span>
          </h2>
          <p>
            Security with precision.
            <br />A touch of Mochi.
          </p>
        </div>
      </div>
    </Dialog>
  )
}
