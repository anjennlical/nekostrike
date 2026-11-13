const routeNames = ['overview', 'lab', 'findings', 'mochi', 'about'] as const
export type WorkspaceRoute = (typeof routeNames)[number]

/** Hashes name either one of our routes or a native in-page anchor, never both. */
export function routeFromHash(hash: string): WorkspaceRoute | null {
  return routeNames.find((name) => hash === `#${name}`) ?? null
}

/** Request immediately; reset scroll/focus only after React commits the destination. */
export function createRouteNavigation({
  initialPage,
  onRoute,
  resetViewport,
  focusHeading,
}: {
  initialPage: WorkspaceRoute
  onRoute: (page: WorkspaceRoute) => void
  resetViewport: () => void
  focusHeading: () => void
}) {
  let requested = initialPage
  let committed = initialPage
  return {
    request(hash: string) {
      const next = routeFromHash(hash)
      if (!next || next === requested) return
      requested = next
      onRoute(next)
    },
    afterCommit(page: WorkspaceRoute) {
      if (page !== requested || page === committed) return
      committed = page
      resetViewport()
      focusHeading()
    },
  }
}

type HashWindow = {
  location: { hash: string }
  history: { scrollRestoration?: 'auto' | 'manual' }
  addEventListener: (type: 'hashchange', handler: () => void) => void
  removeEventListener: (type: 'hashchange', handler: () => void) => void
}

/** Native links/back/forward own the URL and history; no timers or synthetic pushes. */
export function subscribeHashNavigation(
  browser: HashWindow,
  navigation: ReturnType<typeof createRouteNavigation>,
) {
  const previousRestoration = browser.history.scrollRestoration
  if (previousRestoration !== undefined) browser.history.scrollRestoration = 'manual'
  const changed = () => navigation.request(browser.location.hash)
  browser.addEventListener('hashchange', changed)
  changed()
  return () => {
    browser.removeEventListener('hashchange', changed)
    if (previousRestoration !== undefined) browser.history.scrollRestoration = previousRestoration
  }
}
