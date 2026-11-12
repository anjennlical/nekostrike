import { useEffect, useRef, useState } from 'react'
import { resolveMochiState, type MochiSignals } from './mochi-state'
import {
  readMotionEnvironment,
  reducedMotionQuery,
  subscribeMotionEnvironment,
} from './mochi-motion'

export function useMochiState(signals: MochiSignals) {
  const [greeted, setGreeted] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  const greet = () => {
    if (timer.current) clearTimeout(timer.current)
    setGreeted(true)
    timer.current = setTimeout(() => setGreeted(false), 2400)
  }
  return { ...resolveMochiState(signals, greeted), greet }
}

export function useMochiMotion() {
  const [paused, setPaused] = useState(false)
  const [{ reduced, visible }, setEnvironment] = useState(() =>
    readMotionEnvironment(window.matchMedia(reducedMotionQuery), document),
  )
  useEffect(() => subscribeMotionEnvironment(setEnvironment), [])
  return {
    enabled: !paused && !reduced && visible,
    reduced,
    paused,
    toggle: () => setPaused((value) => !value),
  }
}
