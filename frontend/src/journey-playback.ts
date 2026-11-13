export const journeyInterval = 7000

export function journeyIndex(index: number, length: number) {
  return length > 0 ? ((index % length) + length) % length : 0
}

export type JourneyPlayback = {
  requested: boolean
  motionEnabled: boolean
  inView: boolean
  hovered: boolean
  focused: boolean
}

export function canAdvanceJourney(state: JourneyPlayback) {
  return state.requested && state.motionEnabled && state.inView && !state.hovered && !state.focused
}

/** One advance per subscription. Pausing/disposal cancels the pending advance. */
export function scheduleJourneyAdvance(
  state: JourneyPlayback,
  advance: () => void,
  clock = { setTimeout, clearTimeout },
) {
  if (!canAdvanceJourney(state)) return () => {}
  const timer = clock.setTimeout(advance, journeyInterval)
  return () => clock.clearTimeout(timer)
}
