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
    const addAll = (targets: HTMLElement[], presentedByRoute = false) => {
      // Batch geometry before any dataset/style writes; never measure on scroll.
      const bounds = root?.getBoundingClientRect()
      const bottom = bounds?.bottom ?? window.innerHeight
      const top = bounds?.top ?? 0
      const routeOwnsEntrance = presentedByRoute && !!container.closest('.route-surface')
      const measured = targets
        .filter((target) => container.contains(target) && !target.closest('dialog'))
        .map((target) => {
          const rect = target.getBoundingClientRect()
          return { target, aboveFold: rect.height > 0 && rect.top < bottom && rect.bottom > top }
        })
      for (const { target, aboveFold } of measured) {
        target.dataset.revealQuick = aboveFold ? 'true' : 'false'
        target.style.setProperty(
          '--reveal-delay',
          `${aboveFold ? Math.min(80, revealDelay(Number(target.dataset.revealIndex ?? 0))) : revealDelay(Number(target.dataset.revealIndex ?? 0))}ms`,
        )
        // One entrance for visible content. Below-fold sections keep their scroll reveal.
        controller.register(target, target.dataset.revealKey, aboveFold && routeOwnsEntrance)
      }
    }
    addAll(targetsIn(container), true)
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
        const added = new Set<HTMLElement>()
        for (const record of records) {
          record.removedNodes.forEach((node) =>
            targetsIn(node).forEach((target) => controller.release(target)),
          )
          record.addedNodes.forEach((node) =>
            targetsIn(node).forEach((target) => added.add(target)),
          )
        }
        if (added.size) addAll([...added])
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
