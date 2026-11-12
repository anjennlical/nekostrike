import { useEffect, useRef, useState, type ReactNode, type ComponentProps } from 'react'
import { useWorkspaceMotion } from './WorkspaceMotion'

/** Native modal supplies focus containment and background inertness; CSS supplies motion. */
function DialogContent({
  open,
  titleId,
  onClose,
  onAfterClose,
  className = '',
  children,
}: {
  open: boolean
  titleId: string
  onClose: () => void
  onAfterClose?: () => void
  className?: string
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const overflow = useRef<string | null>(null)
  const afterClose = useRef(onAfterClose)
  afterClose.current = onAfterClose
  const [closing, setClosing] = useState(false)
  const motion = useWorkspaceMotion()
  useEffect(() => {
    const element = dialog.current!
    let timer: ReturnType<typeof setTimeout> | undefined
    if (open) {
      setClosing(false)
      if (!element.open) {
        returnFocus.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null
        overflow.current = document.documentElement.style.overflow
        document.documentElement.style.overflow = 'hidden'
        element.showModal()
      }
    } else if (element.open) {
      setClosing(true)
      const finish = () => {
        element.close()
        if (overflow.current !== null) document.documentElement.style.overflow = overflow.current
        overflow.current = null
        if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true })
        afterClose.current?.()
      }
      if (motion.enabled) timer = setTimeout(finish, 180)
      else finish()
    }
    return () => clearTimeout(timer)
  }, [open, motion.enabled])
  useEffect(() => {
    const element = dialog.current
    return () => {
      element?.close()
      if (overflow.current !== null) document.documentElement.style.overflow = overflow.current
      overflow.current = null
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className={`sakura-dialog ${className}`}
      data-closing={closing || undefined}
      data-motion={motion.enabled ? 'on' : 'off'}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0)
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (!first) {
          event.preventDefault()
          return
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {children}
    </dialog>
  )
}

/** Keep the modal mounted for its exit, then release its DOM and internal controls. */
export default function Dialog(props: ComponentProps<typeof DialogContent>) {
  const [present, setPresent] = useState(props.open)
  useEffect(() => {
    if (props.open) setPresent(true)
  }, [props.open])
  if (!present) return null
  return (
    <DialogContent
      {...props}
      onAfterClose={() => {
        setPresent(false)
        props.onAfterClose?.()
      }}
    />
  )
}
