export type RevealVariant = 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right' | 'scale'
export const revealDelay = (index: number) =>
  Math.min(3, Math.max(0, Number.isFinite(index) ? Math.floor(index) : 0)) * 80

type Observer<T> = {
  observe: (target: T) => void
  unobserve: (target: T) => void
  disconnect: () => void
}

/** One observer per scope; consumed keys survive filtering, never route unmounts. */
export function createRevealController<T extends object>({
  createObserver,
  reveal,
  shouldAnimate,
  seen = new Set<string>(),
}: {
  createObserver: (enter: (targets: T[]) => void) => Observer<T>
  reveal: (target: T, animate: boolean) => void
  shouldAnimate: (target: T) => boolean
  seen?: Set<string>
}) {
  const pending = new Map<T, string | undefined>()
  let observer: Observer<T> | undefined
  let failed = false
  let disposed = false
  const finish = (target: T, animate = false) => {
    if (disposed) return
    const key = pending.get(target)
    pending.delete(target)
    observer?.unobserve(target)
    if (key) seen.add(key)
    reveal(target, animate && shouldAnimate(target))
  }
  const failOpen = () => {
    failed = true
    observer?.disconnect()
    observer = undefined
    for (const target of pending.keys()) finish(target)
  }
  return {
    register(target: T, key?: string, presentedByRoute = false) {
      if (disposed || pending.has(target)) return
      pending.set(target, key)
      if (presentedByRoute || failed || (key && seen.has(key)) || !shouldAnimate(target)) {
        finish(target)
        return
      }
      try {
        observer ??= createObserver((targets) => {
          if (disposed) return
          for (const target of targets) if (pending.has(target)) finish(target, true)
        })
        observer.observe(target)
      } catch {
        failOpen()
      }
    },
    finish,
    release(target: T) {
      observer?.unobserve(target)
      pending.delete(target)
    },
    dispose() {
      disposed = true
      observer?.disconnect()
      pending.clear()
    },
  }
}
