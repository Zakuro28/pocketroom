import { getSave } from '../game/store'

// Small sounds made on the fly with the Web Audio API (no files to download)
let ctx: AudioContext | null = null
const audio = () => {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, { at = 0, dur = 0.12, gain = 0.05, type = 'sine' as OscillatorType, to }: { at?: number; dur?: number; gain?: number; type?: OscillatorType; to?: number } = {}) {
  if (getSave().muted) return
  const c = audio()
  const t = c.currentTime + at
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

/** A soft tap */
export const blip = () => tone(660, { dur: 0.07, gain: 0.04, type: 'triangle', to: 880 })
/** Furniture landing in place */
export const place = () => {
  tone(220, { dur: 0.14, gain: 0.07, type: 'triangle', to: 140 })
  tone(520, { at: 0.04, dur: 0.1, gain: 0.03 })
}
/** Picking something up */
export const lift = () => tone(300, { dur: 0.12, gain: 0.04, type: 'triangle', to: 520 })
/** A heart collected */
export const heart = () => tone(1046, { dur: 0.16, gain: 0.03, to: 1318 })
/** Bought something */
export const buyChime = () => [784, 988, 1175].forEach((f, i) => tone(f, { at: i * 0.07, dur: 0.18, gain: 0.04 }))
/** Can't do that */
export const nope = () => tone(180, { dur: 0.14, gain: 0.05, type: 'triangle', to: 120 })
/** The reel passing a card */
export const tick = () => tone(1400, { dur: 0.03, gain: 0.025, type: 'square' })
/** A pet revealed: bigger tiers get a longer, brighter fanfare */
export function fanfare(level: number) {
  const notes = [523, 659, 784, 988, 1175, 1319, 1568].slice(0, 3 + level)
  notes.forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.22, gain: 0.04 }))
}
