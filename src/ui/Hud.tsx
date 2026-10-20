import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, animate, motion } from 'motion/react'
import { Check, ChevronDown, PawPrint, Settings, Shirt, Sparkles, Users, X } from 'lucide-react'
import { ACTS, REWARD_MULT, USES_PER_DAY } from '../game/acts'
import { ITEMS, type Activity } from '../game/catalog'
import { cancel, goUse } from '../game/character'
import { getSession, styleScore, usePlaced, useSave, useSession } from '../game/store'
import { isDone } from '../game/petActions'
import { startCare, stopCare } from '../game/petCare'
import { feedHearts, petHearts, type PetBody } from '../game/pets'
import { coupleOf, otherOf, useTogether } from '../lib/together'

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
export function Hud({ onSettings, onWardrobe, onPeople, onPets, weatherLabel, say }: { onSettings: () => void; onWardrobe: () => void; onPeople: () => void; onPets: () => void; weatherLabel: string | null; say: (m: string) => void }) {
  const waiting = useSave((s) => s.deliveries.length)
  const hearts = useSave((s) => s.hearts)
  const style = useSave((s) => styleScore(s.placed))
  // Today's list: the room's activities and feeding room pets, and how many are done
  const { list: todos, done } = useToday(say)
  const pct = todos.length ? done / todos.length : 0
  // Living together, the Hearts are the couple's shared jar
  const living = useSave((s) => s.home)
  const partner = useTogether((t) => {
    const c = coupleOf(t)
    return c && c.id === living ? (t.cards[otherOf(c)]?.name ?? null) : null
  })
  const asking = useTogether((t) => t.links.filter((l) => l.status === 'pending' && l.b === t.me).length)
  const [today, setToday] = useState(false)
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-5">
      <div className="pointer-events-auto relative rounded-3xl bg-cream/95 px-4 py-3 shadow-[0_6px_0_rgba(74,52,40,0.12)] ring-2 ring-white">
        <p className="max-w-32 truncate text-xs font-semibold tracking-wide text-ink-soft uppercase sm:max-w-44">{partner ? `Jar with ${partner}` : 'PocketRoom'}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-2xl leading-none font-bold text-heart tabular-nums sm:text-3xl">
          💗 <Rolling value={hearts} />
        </p>
        {/* The Today bar opens a checklist of today's activities */}
        <button type="button" onClick={() => setToday((o) => !o)} aria-expanded={today} aria-label={`Today ${done} of ${todos.length} done. Show the list`} className="mt-2 block w-32 text-left sm:w-44">
          <div className="h-2.5 overflow-hidden rounded-full bg-[#f2dfe3]">
            <motion.div className="h-full origin-left rounded-full bg-heart" initial={false} animate={{ scaleX: pct }} transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }} />
          </div>
          <p className="mt-1 flex items-center gap-0.5 text-[11px] font-medium text-ink-soft">
            <span className="min-w-0 truncate">
              Today {done} / {todos.length} done
              {todos.length > 0 && pct >= 1 && ' 🎉'}
              {/* On phones the style score lives here, to leave room for the buttons */}
              <span className="sm:hidden"> · ✨ {fmt(style)}</span>
            </span>
            <ChevronDown className={`size-3.5 shrink-0 transition-transform duration-200 ${today ? 'rotate-180' : ''}`} aria-hidden />
          </p>
        </button>
        <AnimatePresence>{today && <TodayList onClose={() => setToday(false)} say={say} />}</AnimatePresence>
      </div>
      <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        {weatherLabel && <span className="hidden rounded-full bg-cream/90 px-3 py-2 text-sm font-medium text-ink-soft shadow-[0_4px_0_rgba(74,52,40,0.1)] sm:block">{weatherLabel}</span>}
        <span className="hidden items-center gap-1.5 rounded-full bg-cream/95 px-3.5 py-2 text-sm font-semibold shadow-[0_4px_0_rgba(74,52,40,0.12)] sm:flex" title="Room style grows with what you place">
          <Sparkles className="size-4 text-sun" aria-hidden /> <Rolling value={style} />
        </span>
        <button type="button" onClick={onPeople} aria-label={asking ? `People, ${asking} waiting` : 'People'} className="chunky relative grid size-10 place-items-center rounded-full bg-cream sm:size-11">
          <Users className="size-5" />
          {asking > 0 && <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-heart px-1 text-[11px] leading-5 font-bold text-white">{asking}</span>}
        </button>
        <button type="button" onClick={onPets} aria-label={waiting ? `Pets, ${waiting} waiting at the door` : 'Pets'} className="chunky relative grid size-10 place-items-center rounded-full bg-cream sm:size-11">
          <PawPrint className="size-5" />
          {waiting > 0 && <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-heart px-1 text-[11px] leading-5 font-bold text-white">{waiting}</span>}
        </button>
        <button type="button" onClick={onWardrobe} aria-label="Wardrobe" className="chunky grid size-10 place-items-center rounded-full bg-cream sm:size-11">
          <Shirt className="size-5" />
        </button>
        <button type="button" onClick={onSettings} aria-label="Settings" className="chunky grid size-10 place-items-center rounded-full bg-cream sm:size-11">
          <Settings className="size-5" />
        </button>
      </div>
    </div>
  )
}

/** The activities this room offers, in the order they appear in ACTS. A sofa or chair turns into TV time once there's a TV. */
function roomActivities(acts: (Activity | undefined)[]) {
  const have = new Set(acts.filter((a): a is Activity => !!a))
  if (have.has('tv')) have.delete('sit')
  return (Object.keys(ACTS) as Activity[]).filter((a) => have.has(a))
}

// One shared empty list, so the store doesn't hand React a new array every time (that would re-render forever)
const NO_PETS: PetBody[] = []

/** One thing to do today: an activity in the room, or feeding a room pet */
type Todo = { key: string; emoji: string; label: string; hearts: number; done: boolean; run: () => void }

/** Today's list: the room's activities plus feeding each room pet, and how many are done */
function useToday(say: (m: string) => void, onDone?: () => void) {
  const placed = usePlaced()
  const uses = useSave((s) => s.uses)
  const pets = useSave((s) => s.pets)
  const acts = useMemo(() => roomActivities(placed.map((p) => ITEMS[p.id]?.act)), [placed])
  // Living together: your partner's pets are on the list too, and what either of you did shows for both
  const living = useSave((s) => s.home)
  useTogether((t) => t.home?.care)
  const partnerPets = useTogether((t) => {
    const c = coupleOf(t)
    return (c && living === c.id ? t.cards[otherOf(c)]?.room?.pets : undefined) ?? NO_PETS
  })
  const list: Todo[] = [
    ...acts.map((a) => ({
      key: a,
      emoji: ACTS[a].emoji,
      label: ACTS[a].label,
      hearts: ACTS[a].hearts * REWARD_MULT,
      done: (uses[a] ?? 0) >= USES_PER_DAY,
      // Walk over and do it (TV time happens on a seat facing the TV)
      run: () => {
        if (getSession().mode !== 'play') return say('Finish decorating first ✨')
        const item = placed.find((p) => ITEMS[p.id]?.act === a) ?? (a === 'tv' ? placed.find((p) => ITEMS[p.id]?.act === 'sit') : undefined)
        if (!item) return
        goUse(item, placed, say)
        onDone?.()
      },
    })),
    // Each room pet (yours, and your partner's when you live together): feed it, and separately pet it
    ...[...pets.filter((p) => p.place === 'room').map((p) => ({ p, own: true })), ...partnerPets.map((p) => ({ p, own: false }))].flatMap(({ p, own }) => [
      {
        key: `feed-${p.uid}`,
        emoji: '🍖',
        label: `Feed ${p.name}${own ? '' : ' 💞'}`,
        hearts: feedHearts(p),
        done: isDone(p, 'fed'),
        // Your character walks over to the pet; the Hearts arrive once it's been fed
        run: () => void startCare(p, 'fed', !own, say),
      },
      {
        key: `pet-${p.uid}`,
        emoji: '🫶',
        label: `Pet ${p.name}${own ? '' : ' 💞'}`,
        hearts: petHearts(p),
        done: isDone(p, 'petted'),
        run: () => void startCare(p, 'petted', !own, say),
      },
    ]),
  ]
  return { list, done: list.filter((t) => t.done).length }
}

/** Today's checklist: what you've done and what's left, with the Hearts each pays */
function TodayList({ onClose, say }: { onClose: () => void; say: (m: string) => void }) {
  const { list, done } = useToday(say, onClose)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      style={{ transformOrigin: 'top left' }}
      className="absolute top-full left-0 z-20 mt-2 w-64 rounded-3xl bg-cream p-3 shadow-[0_8px_24px_rgba(74,52,40,0.2)] ring-2 ring-white"
      role="region"
      aria-label="Today's list"
    >
      <div className="flex items-baseline justify-between px-1">
        <p className="font-bold">Today</p>
        <p className="text-xs font-semibold text-ink-soft tabular-nums">
          {done} / {list.length} done
        </p>
      </div>
      <p className="px-1 pb-2 text-[11px] text-ink-soft">{done === list.length && list.length ? 'All done for today 🎉 New ones tomorrow!' : 'Tap one to do it.'}</p>
      <ul className="max-h-[45dvh] space-y-1 overflow-y-auto">
        {list.map((t) => (
          <li key={t.key}>
            <button
              type="button"
              onClick={t.run}
              disabled={t.done}
              aria-label={t.done ? `${t.label}, done today` : `${t.label} for ${t.hearts} Hearts`}
              className={`flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-1.5 text-left transition-transform duration-150 enabled:active:scale-[0.98] ${t.done ? 'bg-[#e6f7ee]' : 'bg-white hover:bg-[#fff3f6]'}`}
            >
              <span className="text-lg" aria-hidden>
                {t.emoji}
              </span>
              <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${t.done ? 'text-ink-soft line-through decoration-2' : ''}`}>{t.label}</span>
              {t.done ? (
                <span className="flex items-center gap-1 text-xs font-bold text-mint">
                  <Check className="size-4" strokeWidth={3} aria-hidden /> Done
                </span>
              ) : (
                <span className="text-xs font-bold text-heart tabular-nums">+{t.hearts}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {!list.length && <p className="px-1 py-2 text-sm text-ink-soft">No furniture to use yet. Decorate to add some!</p>}
      <p className="px-1 pt-2 text-[11px] text-ink-soft">Buy more furniture for more ways to earn.</p>
    </motion.div>
  )
}

/** Looking after a pet: walking over, then a short moment while the pet sits and enjoys it */
export function CarePill() {
  const caring = useSession((s) => s.caring)
  return (
    <AnimatePresence>
      {caring && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="pointer-events-auto absolute top-[calc(max(0.75rem,env(safe-area-inset-top))+6.5rem)] left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-cream py-2 pr-2 pl-4 shadow-[0_5px_0_rgba(74,52,40,0.14)] ring-2 ring-white sm:top-6"
          role="status"
        >
          <span className="text-xl" aria-hidden>
            {caring.kind === 'fed' ? '🍖' : '🫶'}
          </span>
          <p className="min-w-32 text-sm leading-tight font-semibold">
            {caring.phase === 'walk' ? `Going to ${caring.kind === 'fed' ? 'feed' : 'pet'} ${caring.name}…` : `${caring.kind === 'fed' ? 'Feeding' : 'Petting'} ${caring.name}…`}
          </p>
          <span className="size-4 animate-spin rounded-full border-2 border-line border-t-heart" aria-hidden />
          <button type="button" onClick={() => (stopCare(), cancel())} aria-label="Stop" className="grid size-8 place-items-center rounded-full bg-paper text-ink-soft transition-colors hover:text-ink">
            <X className="size-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
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
