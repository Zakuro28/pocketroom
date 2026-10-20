import { useEffect, useRef } from 'react'
import { addBonus, getSave, setSave, today } from './store'
import { heart } from '../lib/sound'

/**
 * Cuddle time: while you and your partner are both in your shared home, every few minutes together pays each of
 * you a few Hearts (into the shared jar), a few times a day.
 */
export const CUDDLE = { minutes: 5, hearts: 30, perDay: 6 }

/** How many cuddle payouts you've had today */
export const cuddlesToday = () => {
  const c = getSave().cuddle
  return c?.day === today() ? c.times : 0
}

/** Runs while `on` (you're both home): pays out every CUDDLE.minutes, only while the game is on screen */
export function useCuddleTime(on: boolean, partner: string | null, say: (msg: string) => void) {
  const sayRef = useRef(say)
  useEffect(() => {
    sayRef.current = say
  }, [say])
  useEffect(() => {
    if (!on) return
    let seen = 0
    const tick = 15_000
    const t = window.setInterval(() => {
      if (document.hidden) return
      seen += tick
      if (seen < CUDDLE.minutes * 60_000) return
      seen = 0
      const done = cuddlesToday()
      if (done >= CUDDLE.perDay) return
      setSave((s) => ({ ...s, cuddle: { day: today(), times: done + 1 } }))
      addBonus(CUDDLE.hearts)
      heart()
      sayRef.current(`💞 Cuddle time${partner ? ` with ${partner}` : ''}: +${CUDDLE.hearts} Hearts`)
    }, tick)
    return () => clearInterval(t)
  }, [on, partner])
}
