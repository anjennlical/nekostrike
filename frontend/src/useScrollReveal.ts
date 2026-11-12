import { useEffect, useRef } from 'react'
import { useWorkspaceMotion } from './components/WorkspaceMotion'
import { createRevealController, revealDelay } from './scroll-reveal'

/** Pages scroll in the document. An explicit root supports a future nested scroll surface. */
export function useScrollReveal(root: Element | null = null) {
  const scope = useRef<HTMLDivElement>(null)
  const seen = useRef(new Set<string>())
  const { enabled } = useWorkspaceMotion()
  useEffect(() => {
    const container = scope.current
    if (!container) return
    const controller = createRevealController<HTMLElement>({
      seen: seen.current,
      createObserver: (enter) =>
        new IntersectionObserver(
          (entries) =>
            enter(
              entries
                .filter((entry) => entry.isIntersecting)
                .map((entry) => entry.target as HTMLElement),
            ),
          { root, threshold: 0.12, rootMargin: '0px 0px 48px 0px' },
        ),
      shouldAnimate: (target) =>
        enabled && target.dataset.revealState !== 'complete' && !target.matches(':focus-within'),
      reveal: (target, animate) => {
        target.dataset.revealState = animate ? 'entered' : 'complete'
      },
    })
    const targetsIn = (node: Node) => {
      if (!(node instanceof HTMLElement)) return []
      return [
        ...(node.matches('[data-reveal]') ? [node] : []),
        ...node.querySelectorAll<HTMLElement>('[data-reveal]'),
      ]
    }
    const add = (target: HTMLElement) => {
      if (target.closest('dialog')) return
      // Read geometry once at registration, never on a scroll event.
      const rect = target.getBoundingClientRect()
      const bounds = root?.getBoundingClientRect()
      const aboveFold =
        rect.height > 0 &&
        rect.top < (bounds?.bottom ?? window.innerHeight) &&
        rect.bottom > (bounds?.top ?? 0)
      target.dataset.revealQuick = aboveFold ? 'true' : 'false'
      target.style.setProperty(
        '--reveal-delay',
        `${aboveFold ? Math.min(80, revealDelay(Number(target.dataset.revealIndex ?? 0))) : revealDelay(Number(target.dataset.revealIndex ?? 0))}ms`,
      )
      controller.register(target, target.dataset.revealKey)
    }
    targetsIn(container).forEach(add)
    const focus = (event: FocusEvent) => {
      let target =
        event.target instanceof HTMLElement
          ? event.target.closest<HTMLElement>('[data-reveal]')
          : null
      while (target && container.contains(target)) {
        controller.finish(target)
        target = target.parentElement?.closest<HTMLElement>('[data-reveal]') ?? null
      }
    }
    const completed = (event: AnimationEvent) => {
      if (
        event.animationName.startsWith('reveal-') &&
        event.target instanceof HTMLElement &&
        event.target.hasAttribute('data-reveal')
      )
        controller.finish(event.target)
    }
    container.addEventListener('focusin', focus)
    container.addEventListener('animationend', completed)
    let mutations: MutationObserver | undefined
    try {
      mutations = new MutationObserver((records) => {
        for (const record of records) {
          record.removedNodes.forEach((node) =>
            targetsIn(node).forEach((target) => controller.release(target)),
          )
          record.addedNodes.forEach((node) => targetsIn(node).forEach(add))
        }
      })
      mutations.observe(container, { childList: true, subtree: true })
    } catch {
      /* Dynamic content remains visible without enhancement. */
    }
    return () => {
      mutations?.disconnect()
      controller.dispose()
      container.removeEventListener('focusin', focus)
      container.removeEventListener('animationend', completed)
    }
  }, [enabled, root])
  return scope
}
