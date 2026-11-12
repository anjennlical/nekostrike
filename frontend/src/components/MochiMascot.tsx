import { memo, useEffect, useId, useRef, type PointerEvent } from 'react'
import { CodeXml, ShieldCheck } from 'lucide-react'
import Mochi from './Mochi'
import { mochiGaze, mochiLabels, type MochiSignals } from '../mochi-state'
import { useMochiState } from '../useMochiState'
import { MotionToggle, useWorkspaceMotion } from './WorkspaceMotion'

/** Overview pilot. Local state and bounded pointer writes never update the app root. */
export default memo(function MochiMascot(signals: MochiSignals) {
  const { emotion, message, greet } = useMochiState(signals)
  const motion = useWorkspaceMotion()
  const description = useId()
  const button = useRef<HTMLButtonElement>(null)
  const bounds = useRef<DOMRect | null>(null)
  const frame = useRef<number | null>(null)
  const point = useRef({ x: 0, y: 0 })

  function resetGaze() {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    bounds.current = null
    button.current?.style.removeProperty('--mochi-look-x')
    button.current?.style.removeProperty('--mochi-look-y')
    button.current?.style.removeProperty('--mochi-look-angle')
  }
  useEffect(() => {
    if (!motion.enabled) resetGaze()
    return resetGaze
  }, [motion.enabled])

  function look(event: PointerEvent<HTMLButtonElement>) {
    if (!motion.enabled || event.pointerType !== 'mouse' || !bounds.current) return
    const rect = bounds.current
    point.current = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: ((event.clientY - rect.top) / rect.height) * 2 - 1,
    }
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      const gaze = mochiGaze(point.current.x, point.current.y)
      button.current?.style.setProperty('--mochi-look-x', `${gaze.x}px`)
      button.current?.style.setProperty('--mochi-look-y', `${gaze.y}px`)
      button.current?.style.setProperty('--mochi-look-angle', `${gaze.angle}deg`)
    })
  }

  return (
    <div
      className="mochi-mascot"
      data-emotion={emotion}
      data-motion={motion.enabled ? 'on' : 'off'}
    >
      <div className="mochi-portrait">
        <span className="art-label label-code" aria-hidden="true">
          <CodeXml size={16} /> evidence first
        </span>
        <button
          type="button"
          className="mochi-pet"
          ref={button}
          aria-label="Fazer carinho na Mochi"
          aria-describedby={description}
          onClick={greet}
          onPointerEnter={(event) => {
            if (motion.enabled && event.pointerType === 'mouse')
              bounds.current = event.currentTarget.getBoundingClientRect()
          }}
          onPointerMove={look}
          onPointerLeave={resetGaze}
          onPointerCancel={resetGaze}
          onBlur={resetGaze}
        >
          <Mochi emotion={emotion} decorative />
        </button>
        <span className="art-label label-safe" aria-hidden="true">
          <ShieldCheck size={14} /> safe little workspace
        </span>
      </div>
      <div
        className="mochi-caption"
        id={description}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <strong>{mochiLabels[emotion]}</strong>
        <p>{message}</p>
      </div>
      <MotionToggle />
    </div>
  )
})
