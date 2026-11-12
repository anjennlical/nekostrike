export const reducedMotionQuery = '(prefers-reduced-motion: reduce)'
type MotionPreference = Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>
type PageVisibility = Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>

export function readMotionEnvironment(
  media: Pick<MediaQueryList, 'matches'>,
  page: Pick<Document, 'hidden'>,
) {
  return { reduced: media.matches, visible: !page.hidden }
}

/** One subscription per mounted pilot, including cleanup under React StrictMode. */
export function subscribeMotionEnvironment(
  notify: (state: ReturnType<typeof readMotionEnvironment>) => void,
  media: MotionPreference = window.matchMedia(reducedMotionQuery),
  page: PageVisibility = document,
) {
  const update = () => notify(readMotionEnvironment(media, page))
  media.addEventListener('change', update)
  page.addEventListener('visibilitychange', update)
  update()
  return () => {
    media.removeEventListener('change', update)
    page.removeEventListener('visibilitychange', update)
  }
}
