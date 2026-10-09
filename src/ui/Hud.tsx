import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion } from 'motion/react'
import { Settings, Sparkles, X } from 'lucide-react'
import { ACTS, DAILY_CAP } from '../game/acts'
import type { Activity } from '../game/catalog'
import { cancel } from '../game/character'
import { styleScore, useSave, useSession } from '../game/store'

const fmt = (n: number) => n.toLocaleString('en-US')

/** A number that rolls to its new value instead of jumping */
function Rolling({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const last = useRef(value)
  useEffect(() => {
    const c = animate(last.current, value, { duration: 0.5, ease: [0.23, 1, 0.32, 1], onUpdate: (v) => ref.current && (ref.current.textContent = fmt(Math.round(v))) })
    last.current = value
    return () => c.stop()
  }, [value])
  return <span ref={ref}>{fmt(value)}</span>
}

/** Hearts, today's progress toward the daily limit, and the room's style score */
export function Hud({ onSettings, weatherLabel }: { onSettings: () => void; weatherLabel: string | null }) {
  const hearts = useSave((s) => s.hearts)
  const earned = useSave((s) => s.earnedToday)
  const style = useSave((s) => styleScore(s.placed))
  const pct = Math.min(1, earned / DAILY_CAP)
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-5">
      <div className="pointer-events-auto rounded-3xl bg-cream/95 px-4 py-3 shadow-[0_6px_0_rgba(74,52,40,0.12)] ring-2 ring-white">
        <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">PocketRoom</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-2xl leading-none font-bold text-heart tabular-nums sm:text-3xl">
          💗 <Rolling value={hearts} />
        </p>
        <div className="mt-2 w-36 sm:w-44" aria-label={`Today ${earned} of ${DAILY_CAP} Hearts`}>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#f2dfe3]">
            <motion.div className="h-full origin-left rounded-full bg-heart" initial={false} animate={{ scaleX: pct }} transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }} />
          </div>
          <p className="mt-1 text-[11px] font-medium text-ink-soft">
            Today {fmt(earned)} / {fmt(DAILY_CAP)}
            {pct >= 1 && ' · full 💗'}
          </p>
        </div>
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        {weatherLabel && <span className="hidden rounded-full bg-cream/90 px-3 py-2 text-sm font-medium text-ink-soft shadow-[0_4px_0_rgba(74,52,40,0.1)] sm:block">{weatherLabel}</span>}
        <span className="flex items-center gap-1.5 rounded-full bg-cream/95 px-3.5 py-2 text-sm font-semibold shadow-[0_4px_0_rgba(74,52,40,0.12)]" title="Room style grows with what you place">
          <Sparkles className="size-4 text-sun" aria-hidden /> <Rolling value={style} />
        </span>
        <button type="button" onClick={onSettings} aria-label="Settings" className="chunky grid size-11 place-items-center rounded-full bg-cream">
          <Settings className="size-5" />
        </button>
      </div>
    </div>
  )
}

/** What your character is up to, with a progress bar and the Hearts it's earning */
export function DoingPill() {
  const doing = useSession((s) => s.doing)
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    if (!doing?.started) return
    const { started, seconds } = doing
    const id = setInterval(() => setProgress(Math.min(1, (Date.now() - started) / (seconds * 1000))), 200)
    return () => {
      clearInterval(id)
      setProgress(0)
    }
  }, [doing])
  const a = doing ? ACTS[doing.act as Activity] : null
  return (
    <AnimatePresence>
      {doing && a && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="pointer-events-auto absolute top-[calc(max(0.75rem,env(safe-area-inset-top))+6.5rem)] left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-cream py-2 pr-2 pl-4 shadow-[0_5px_0_rgba(74,52,40,0.14)] ring-2 ring-white sm:top-6"
        >
          <span className="text-xl" aria-hidden>
            {a.emoji}
          </span>
          <div className="min-w-32">
            <p className="text-sm leading-tight font-semibold">{doing.started ? a.verb : `Going to ${a.label.toLowerCase()}…`}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full origin-left rounded-full bg-mint" style={{ transform: `scaleX(${progress})`, transition: 'transform 200ms linear' }} />
            </div>
          </div>
          <span className="text-sm font-bold text-heart tabular-nums">{doing.total ? `+${doing.earned}/${doing.total}` : 'no 💗'}</span>
          <button
            type="button"
            onClick={cancel}
            aria-label="Stop"
            className="grid size-8 place-items-center rounded-full bg-paper text-ink-soft transition-colors hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
