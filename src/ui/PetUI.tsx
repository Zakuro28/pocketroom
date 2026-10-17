import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, Check, Gift, Home, Package, X } from 'lucide-react'
import { adoptAway, feedPet, fosterPets, movePet, renamePet, rollDelivery, roomPets, swapPets, type Roll } from '../game/petActions'
import {
  EVENTS,
  FOSTER_SLOTS,
  GROW_DAYS,
  IV_NAMES,
  MUTATIONS,
  ROOM_SLOTS,
  STORK,
  TIER_INFO,
  ageDays,
  avgIv,
  bonusOf,
  feedHearts,
  randomSpecies,
  randomTier,
  specialTier,
  speciesIn,
  speciesOf,
  type Pet,
  type Species,
  type Tier,
} from '../game/pets'
import { today, useSave, type Delivery } from '../game/store'
import { blip, fanfare, heart, nope, tick } from '../lib/sound'
import { canSignIn, signInWithGoogle, useUser } from '../lib/auth'
import { petThumb } from '../scene/petModel'

const EASE = [0.23, 1, 0.32, 1] as const
const TIER_LEVEL: Record<Tier, number> = { common: 0, rare: 1, epic: 2, legendary: 3, seasonal: 3, mythical: 4, divine: 4 }

export function PetPic({ sp, coat = 0, color = null, className = '' }: { sp: Species; coat?: number; color?: Pet['color']; className?: string }) {
  const src = useMemo(() => petThumb({ sp, coat, color }), [sp, coat, color])
  return src ? <img src={src} alt="" draggable={false} className={`object-contain ${className}`} /> : <span className={`grid place-items-center text-3xl ${className}`}>🐾</span>
}

const thumbOf = (p: Pet) => ({ sp: speciesOf(p), coat: p.coat, color: p.color })

function deliveryTitle(d: Delivery) {
  if (d.kind === 'daily') return 'Your daily pet'
  if (d.kind === 'birthday') return 'Birthday pet 🎂'
  if (d.kind === 'monthsary') return 'Monthsary pet 💞'
  const ev = EVENTS.find((e) => e.id === d.event)
  return `${ev?.name ?? 'Seasonal'} pet ${ev?.emoji ?? '🎁'}`
}

function deliveryOdds(d: Delivery) {
  if (d.kind === 'seasonal') return `One of ${speciesIn('seasonal', d.event).map((s) => s.name).join(' or ')}`
  if (d.kind === 'daily') return 'Any pet, Common to Divine'
  return '75% Legendary · 25% Mythical'
}

// ---- The reel ----

type Card = { sp: Species; tier: Tier; mystery: boolean }
const CARD_W = 112
const STEP = 120
const WIN = 46
const LEN = 54

function card(tier: Tier, sp: Species): Card {
  return { sp: tier === 'mythical' ? STORK : sp, tier, mystery: tier === 'mythical' || tier === 'divine' }
}

function strip(roll: Roll): Card[] {
  const d = roll.delivery
  const filler = () => {
    const tier: Tier = d.kind === 'seasonal' ? 'seasonal' : d.kind === 'daily' ? randomTier() : specialTier()
    return card(tier, randomSpecies(tier, d.event))
  }
  return Array.from({ length: LEN }, (_, i) => (i === WIN ? card(roll.tier, speciesOf(roll.pet)) : filler()))
}

function ReelCard({ c, win }: { c: Card; win: boolean }) {
  const t = TIER_INFO[c.tier]
  return (
    <div
      className={`relative flex h-36 shrink-0 flex-col items-center justify-end overflow-hidden rounded-2xl bg-white pb-2 transition-transform duration-300 ${win ? 'scale-105 ring-4' : 'ring-1 ring-line'}`}
      style={{ width: CARD_W, background: c.mystery ? `radial-gradient(circle at 50% 40%, ${t.glow}, #ffffff 70%)` : undefined, ['--tw-ring-color' as string]: t.color }}
    >
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: t.color }} />
      {c.tier === 'divine' ? <span className="mb-4 text-5xl" aria-hidden>✨</span> : <PetPic sp={c.sp} className="mb-1 size-24" />}
      <p className="w-full truncate px-1 text-center text-[11px] font-bold" style={{ color: t.color }}>
        {c.tier === 'mythical' ? 'Mythical?' : c.tier === 'divine' ? 'Divine?' : c.sp.name}
      </p>
    </div>
  )
}

function Reel({ roll, onDone }: { roll: Roll; onDone: () => void }) {
  const cards = useMemo(() => strip(roll), [roll])
  const box = useRef<HTMLDivElement>(null)
  const row = useRef<HTMLDivElement>(null)
  const [landed, setLanded] = useState(false)
  const reduce = useReducedMotion()

  useLayoutEffect(() => {
    const w = box.current?.clientWidth ?? 360
    // Land somewhere inside the winning card, not always dead center
    const jitter = (Math.random() - 0.5) * CARD_W * 0.6
    const target = WIN * STEP + CARD_W / 2 - w / 2 + jitter
    let last = -1
    const c = animate(0, target, {
      duration: reduce ? 1 : 6,
      ease: [0.08, 0.72, 0.12, 1],
      onUpdate: (v) => {
        if (row.current) row.current.style.transform = `translateX(${-v}px)`
        const i = Math.floor((v + w / 2) / STEP)
        if (i !== last) {
          last = i
          tick()
        }
      },
      onComplete: () => {
        setLanded(true)
        window.setTimeout(onDone, 900)
      },
    })
    return () => c.stop()
  }, [roll, onDone, reduce])

  return (
    <div ref={box} className="relative w-full min-w-0 overflow-hidden rounded-3xl bg-paper py-4">
      <div ref={row} className="flex gap-2 will-change-transform" style={{ paddingLeft: 0 }}>
        {cards.map((c, i) => (
          <ReelCard key={i} c={c} win={landed && i === WIN} />
        ))}
      </div>
      {/* The pointer the reel stops under */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-heart shadow-[0_0_12px_#ff5d86]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-paper" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-paper" />
    </div>
  )
}

// ---- What a pet is like ----

function Mutations({ p }: { p: Pet }) {
  const list = [p.color, p.sizeMut].filter(Boolean) as (keyof typeof MUTATIONS)[]
  if (!list.length) return null
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {list.map((m) => (
        <span key={m} className="rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-cream" title={MUTATIONS[m].about}>
          🧬 {MUTATIONS[m].label} +{Math.round(MUTATIONS[m].bonus * 100)}%
        </span>
      ))}
    </div>
  )
}

function Ivs({ p }: { p: Pet }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
      {IV_NAMES.map((n, i) => (
        <div key={n} className="min-w-0">
          <div className="flex justify-between text-[11px] font-semibold text-ink-soft">
            <span className="truncate">{n}</span>
            <span className="tabular-nums">{p.ivs[i]}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-mint" style={{ width: `${p.ivs[i]}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** The average IV, front and center: it decides how many Hearts a pet earns */
function AvgIv({ p, big = false }: { p: Pet; big?: boolean }) {
  const v = Math.round(avgIv(p))
  const color = v >= 90 ? '#e6b422' : v >= 75 ? '#5ccf9a' : v >= 60 ? '#4f9cf5' : '#a0938a'
  return (
    <div className={`flex items-center gap-2 rounded-2xl bg-white ring-2 ${big ? 'px-4 py-2' : 'px-3 py-1'}`} style={{ ['--tw-ring-color' as string]: color }}>
      <span className="text-xs font-bold tracking-wide text-ink-soft uppercase">Average IV</span>
      <span className={`font-bold tabular-nums ${big ? 'text-3xl' : 'text-xl'}`} style={{ color }}>
        {v}
      </span>
    </div>
  )
}

/** Pets grow a little every day until they're adults on day 30 */
function Growth({ p }: { p: Pet }) {
  const age = ageDays(p, today())
  const pct = Math.min(1, age / GROW_DAYS)
  if (pct >= 1) return <p className="text-xs font-semibold text-mint">Fully grown 🎉 · {age} days with you</p>
  return (
    <div className="w-full max-w-60">
      <div className="flex justify-between text-xs font-semibold text-ink-soft">
        <span>Growing up 🌱</span>
        <span className="tabular-nums">
          Day {age + 1} of {GROW_DAYS}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-mint" style={{ width: `${Math.max(4, pct * 100)}%` }} />
      </div>
    </div>
  )
}

function TierTag({ tier }: { tier: Tier }) {
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: TIER_INFO[tier].color }}>
      {TIER_INFO[tier].label}
    </span>
  )
}

// ---- Deliveries: door → reel → reveal → (adoption if foster is full) ----

export function DeliveryFlow({ open, onClose, say }: { open: boolean; onClose: () => void; say: (m: string) => void }) {
  const deliveries = useSave((s) => s.deliveries)
  const adopting = useSave((s) => s.adopting)
  const [roll, setRoll] = useState<Roll | null>(null)
  const [step, setStep] = useState<'door' | 'spin' | 'reveal'>('door')
  // Pets are for signed-in players only, so nobody can farm them with throwaway guest games
  const user = useUser()
  const guest = canSignIn && !user
  const [name, setName] = useState('')

  // Closing always comes back to the door next time
  const close = () => {
    setRoll(null)
    setStep('door')
    onClose()
  }

  const start = (d: Delivery) => {
    if (guest) return nope()
    blip()
    const r = rollDelivery(d.id)
    if (!r) return nope()
    setRoll(r)
    setName(r.pet.name)
    setStep('spin')
  }
  const landed = () => {
    if (!roll) return
    fanfare(TIER_LEVEL[roll.tier] + (roll.pet.color || roll.pet.sizeMut ? 1 : 0))
    setStep('reveal')
  }
  const welcome = () => {
    if (!roll) return
    renamePet(roll.pet.uid, name)
    say(roll.pet.place === 'room' ? `${name.trim() || roll.pet.name} moved in! 🐾` : `${name.trim() || roll.pet.name} went to foster care 🏡`)
    setRoll(null)
    setStep('door')
    if (!deliveries.length && !adopting) close()
  }

  const show = open && !(step === 'door' && adopting)
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Pet delivery"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', duration: 0.45, bounce: 0.2 }}
            className="relative w-full max-w-2xl min-w-0 rounded-[2rem] bg-cream p-5 shadow-2xl"
          >
            {step === 'door' && (
              <>
                <button type="button" onClick={close} aria-label="Close" className="absolute top-4 right-4 grid size-9 place-items-center rounded-full text-ink-soft hover:bg-white">
                  <X className="size-5" />
                </button>
                <p className="text-3xl" aria-hidden>
                  📦
                </p>
                <h2 className="mt-1 text-xl font-bold">{deliveries.length ? 'A delivery for you!' : 'No deliveries right now'}</h2>
                {guest && deliveries.length > 0 ? (
                  <>
                    <p className="mt-1 text-sm text-ink-soft">Please sign in to get your pet. Pets live in your account, so they’re safe on any device.</p>
                    <button type="button" onClick={() => void signInWithGoogle()} className="chunky mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-semibold ring-1 ring-line">
                      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.1 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12S6.6 21.8 12 21.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12Z" />
                      </svg>
                      Sign in with Google
                    </button>
                    <button type="button" onClick={close} className="mt-2 w-full py-2 text-sm font-semibold text-ink-soft">
                      Later
                    </button>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-ink-soft">{deliveries.length ? 'Roll now, or keep it for later. It waits at the door.' : 'A new pet comes every day. Check back tomorrow!'}</p>
                )}
                <ul className={`mt-4 space-y-2 ${guest ? 'hidden' : ''}`}>
                  {deliveries.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 rounded-2xl bg-white p-3">
                      <Gift className="size-6 shrink-0 text-heart" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{deliveryTitle(d)}</p>
                        <p className="truncate text-xs text-ink-soft">{deliveryOdds(d)}</p>
                      </div>
                      <button type="button" onClick={() => start(d)} className="chunky shrink-0 rounded-full bg-heart px-4 py-2.5 text-sm font-bold text-white">
                        Roll now
                      </button>
                    </li>
                  ))}
                </ul>
                {deliveries.length > 0 && !guest && (
                  <button type="button" onClick={close} className="mt-3 w-full py-2 text-sm font-semibold text-ink-soft">
                    Later
                  </button>
                )}
              </>
            )}

            {step === 'spin' && roll && (
              <>
                <p className="text-center text-sm font-semibold text-ink-soft">Rolling…</p>
                <h2 className="mb-3 text-center text-lg font-bold">{deliveryTitle(roll.delivery)}</h2>
                <Reel roll={roll} onDone={landed} />
              </>
            )}

            {step === 'reveal' && roll && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', duration: 0.6, bounce: 0.35 }} className="flex flex-col items-center gap-3 text-center">
                {roll.tier === 'mythical' && <p className="text-sm font-semibold text-ink-soft">The stork brought you…</p>}
                {roll.tier === 'divine' && <p className="text-sm font-semibold text-ink-soft">Something divine arrived…</p>}
                <div className="grid size-44 place-items-center rounded-full" style={{ background: `radial-gradient(circle, ${TIER_INFO[roll.tier].glow}, transparent 70%)` }}>
                  <PetPic {...thumbOf(roll.pet)} className="size-40" />
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">{speciesOf(roll.pet).name}</h2>
                  <TierTag tier={roll.tier} />
                </div>
                <Mutations p={roll.pet} />
                <AvgIv p={roll.pet} big />
                <p className="text-sm text-ink-soft">
                  Feeding pays <b className="text-heart tabular-nums">+{feedHearts(roll.pet)} 💗</b> a day
                </p>
                <label className="w-full max-w-xs text-left text-sm font-semibold text-ink-soft">
                  Name
                  <input value={name} onChange={(e) => setName(e.target.value.slice(0, 16))} className="mt-1 w-full rounded-2xl bg-white px-4 py-3 text-base text-ink ring-2 ring-line outline-none focus:ring-sun" />
                </label>
                <p className="text-xs text-ink-soft">{roll.full ? 'Foster care is full, so someone needs a new home first.' : roll.pet.place === 'room' ? 'Moving into your room.' : 'Your room is full, so they’ll stay in foster care.'}</p>
                <button type="button" onClick={welcome} className="chunky w-full max-w-xs rounded-2xl bg-heart py-3.5 font-bold text-white">
                  Welcome home! 🐾
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Foster care is full and a new pet arrived: pick a foster pet to be adopted (it leaves right away) */
export function AdoptPicker({ say }: { say: (m: string) => void }) {
  const adopting = useSave((s) => s.adopting)
  const pets = useSave((s) => s.pets)
  const [pick, setPick] = useState<Pet | null>(null)
  const fresh = pets.find((p) => p.uid === adopting)
  const choices = fosterPets(pets).filter((p) => p.uid !== adopting)
  return (
    <AnimatePresence>
      {adopting && fresh && (
        <motion.div className="pointer-events-auto fixed inset-0 z-[55] grid place-items-center bg-ink/40 p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="adopt-title" className="w-full max-w-lg rounded-[2rem] bg-cream p-5 shadow-2xl">
            <h2 id="adopt-title" className="text-xl font-bold">
              Foster care is full
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              To make room for {fresh.name}, choose a foster pet to be adopted by a loving family. They’ll leave right away.
            </p>
            {pick ? (
              <div className="mt-4 flex flex-col items-center gap-2 text-center">
                <PetPic {...thumbOf(pick)} className="size-28" />
                <p className="font-semibold">Say goodbye to {pick.name}?</p>
                <div className="mt-2 flex w-full gap-2">
                  <button type="button" onClick={() => setPick(null)} className="chunky flex-1 rounded-2xl bg-white py-3 font-semibold">
                    Choose again
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      adoptAway(pick.uid)
                      say(`${pick.name} found a loving family 💗`)
                      setPick(null)
                    }}
                    className="chunky flex-1 rounded-2xl bg-heart py-3 font-bold text-white"
                  >
                    Goodbye 👋
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid max-h-[55dvh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                {choices.map((p) => (
                  <button key={p.uid} type="button" onClick={() => (blip(), setPick(p))} className="chunky flex flex-col items-center rounded-2xl bg-white p-2">
                    <PetPic {...thumbOf(p)} className="size-16" />
                    <span className="w-full truncate text-xs font-semibold">{p.name}</span>
                    <span className="text-[10px] font-bold" style={{ color: TIER_INFO[speciesOf(p).tier].color }}>
                      {TIER_INFO[speciesOf(p).tier].label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---- Your pets: room and foster ----

function PetTile({ p, onClick }: { p: Pet; onClick: () => void }) {
  const fed = p.place === 'room' && p.fed === today()
  const tier = speciesOf(p).tier
  return (
    <button type="button" onClick={onClick} className="chunky relative flex flex-col items-center rounded-2xl bg-white p-2 text-center">
      <span className="absolute inset-x-3 top-0 h-1 rounded-b-full" style={{ background: TIER_INFO[tier].color }} />
      <PetPic {...thumbOf(p)} className="size-20" />
      <span className="w-full truncate text-sm font-semibold">{p.name}</span>
      <span className="text-[11px] font-bold text-ink tabular-nums">IV {Math.round(avgIv(p))}</span>
      <span className="text-[11px] font-semibold text-ink-soft">
        {(p.color || p.sizeMut) && '🧬 '}
        {p.place === 'room' ? (fed ? 'Fed ✓' : `Feed +${feedHearts(p)}`) : TIER_INFO[tier].label}
      </span>
    </button>
  )
}

function PetCard({ p, onBack, say }: { p: Pet; onBack: () => void; say: (m: string) => void }) {
  const pets = useSave((s) => s.pets)
  const sp = speciesOf(p)
  const d = today()
  const fed = p.fed === d
  const [confirm, setConfirm] = useState<string | null>(null)
  const [swapping, setSwapping] = useState(false)
  const room = roomPets(pets)
  const feed = () => {
    const n = feedPet(p.uid)
    if (!n) return nope()
    heart()
    say(`${p.name} enjoyed that! +${n} 💗`)
  }
  const move = (to: 'room' | 'foster') => {
    const err = movePet(p.uid, to)
    if (err) return (nope(), say(err))
    blip()
    say(to === 'room' ? `${p.name} moved into your room 🏠` : `${p.name} went to foster care 🏡`)
    onBack()
  }
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={onBack} className="flex w-fit items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All pets
      </button>
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="grid size-36 place-items-center rounded-full" style={{ background: `radial-gradient(circle, ${TIER_INFO[sp.tier].glow}, transparent 70%)` }}>
          <PetPic {...thumbOf(p)} className="size-32" />
        </div>
        <input
          defaultValue={p.name}
          key={p.uid}
          onBlur={(e) => renamePet(p.uid, e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          aria-label="Pet name"
          className="w-48 rounded-xl bg-transparent px-2 py-1 text-center text-2xl font-bold outline-none focus:bg-white focus:ring-2 focus:ring-sun"
        />
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          {sp.name} <TierTag tier={sp.tier} />
        </div>
        <AvgIv p={p} big />
        <Growth p={p} />
        <Mutations p={p} />
      </div>

      {p.place === 'room' ? (
        <button type="button" onClick={feed} disabled={fed} className="chunky rounded-2xl bg-heart py-3.5 font-bold text-white disabled:bg-[#d7cfc4]">
          {fed ? 'Fed today ✓ Back tomorrow' : `Feed ${p.name} · +${feedHearts(p)} 💗`}
        </button>
      ) : null}
      <p className="text-center text-xs text-ink-soft">
        Average IV {Math.round(avgIv(p))} × 3{bonusOf(p) ? ` × ${(1 + bonusOf(p)).toFixed(2)} mutation bonus` : ''} = {feedHearts(p)} Hearts a day, on top of your daily limit
      </p>

      <div className="rounded-2xl bg-white p-3">
        <Ivs p={p} />
      </div>

      {/* Moving between the room and foster care, always with a confirm */}
      {confirm ? (
        <div className="flex items-center gap-2 rounded-2xl bg-white p-3">
          <p className="flex-1 text-sm font-semibold">{confirm}</p>
          <button type="button" onClick={() => setConfirm(null)} className="rounded-full px-3 py-2 text-sm font-semibold text-ink-soft">
            Cancel
          </button>
          <button type="button" onClick={() => move(p.place === 'room' ? 'foster' : 'room')} className="chunky rounded-full bg-ink px-4 py-2 text-sm font-bold text-cream">
            Yes
          </button>
        </div>
      ) : swapping ? (
        <div className="rounded-2xl bg-white p-3">
          <p className="mb-2 text-sm font-semibold">The room fits {ROOM_SLOTS}. Swap with:</p>
          <div className="grid grid-cols-3 gap-2">
            {room.map((r) => (
              <button
                key={r.uid}
                type="button"
                onClick={() => {
                  swapPets(r.uid, p.uid)
                  blip()
                  say(`${p.name} moved in, ${r.name} went to foster care`)
                  onBack()
                }}
                className="chunky flex flex-col items-center rounded-xl bg-paper p-1.5"
              >
                <PetPic {...thumbOf(r)} className="size-14" />
                <span className="w-full truncate text-xs font-semibold">{r.name}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setSwapping(false)} className="mt-2 w-full py-1.5 text-sm font-semibold text-ink-soft">
            Cancel
          </button>
        </div>
      ) : p.place === 'room' ? (
        <button type="button" onClick={() => setConfirm(`Move ${p.name} to foster care?`)} className="chunky flex items-center justify-center gap-2 rounded-2xl bg-white py-3 font-semibold">
          <Package className="size-5" aria-hidden /> Move to foster care
        </button>
      ) : (
        <button
          type="button"
          onClick={() => (room.length >= ROOM_SLOTS ? setSwapping(true) : setConfirm(`Bring ${p.name} into your room?`))}
          className="chunky flex items-center justify-center gap-2 rounded-2xl bg-white py-3 font-semibold"
        >
          <Home className="size-5" aria-hidden /> Bring into the room
        </button>
      )}
    </div>
  )
}

export function PetsPanel({ open, focus, onClose, onDeliveries, say }: { open: boolean; focus: string | null; onClose: () => void; onDeliveries: () => void; say: (m: string) => void }) {
  const pets = useSave((s) => s.pets)
  const waiting = useSave((s) => s.deliveries.length)
  const [tab, setTab] = useState<'room' | 'foster'>('room')
  // Unset: show the pet that was tapped (if any). Null: the list. A pet's id: that pet.
  const [sel, setSel] = useState<string | null | undefined>(undefined)
  const close = () => {
    setSel(undefined)
    onClose()
  }
  const selected = pets.find((p) => p.uid === (sel === undefined ? focus : sel))
  const list = tab === 'room' ? roomPets(pets) : fosterPets(pets)
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="pointer-events-auto fixed inset-0 z-40 grid place-items-center bg-ink/30 p-3 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} onClick={close}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Your pets"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-y-auto rounded-[2rem] bg-cream p-5 shadow-2xl"
          >
            <button type="button" onClick={close} aria-label="Close" className="absolute top-4 right-4 grid size-9 place-items-center rounded-full text-ink-soft hover:bg-white">
              <X className="size-5" />
            </button>
            {selected ? (
              <PetCard p={selected} onBack={() => setSel(null)} say={say} />
            ) : (
              <>
                <h2 className="text-xl font-bold">Your pets 🐾</h2>
                {waiting > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSel(undefined)
                      onDeliveries()
                    }}
                    className="chunky mt-3 flex w-full items-center gap-3 rounded-2xl bg-heart px-4 py-3 text-left font-bold text-white">
                    <span className="text-2xl" aria-hidden>
                      📦
                    </span>
                    <span className="flex-1">{waiting === 1 ? 'A pet is waiting at the door' : `${waiting} pets are waiting at the door`}</span>
                    <span className="rounded-full bg-white/25 px-3 py-1 text-sm">Open</span>
                  </button>
                )}
                <div className="mt-4 flex gap-1.5" role="tablist">
                  {(
                    [
                      ['room', `In the room ${roomPets(pets).length}/${ROOM_SLOTS}`],
                      ['foster', `Foster care ${fosterPets(pets).length}/${FOSTER_SLOTS}`],
                    ] as const
                  ).map(([id, label]) => (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`chunky rounded-full px-4 py-2 text-sm font-semibold ${tab === id ? 'bg-ink text-cream' : 'bg-white text-ink ring-1 ring-line'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                {list.length ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {list.map((p) => (
                      <PetTile key={p.uid} p={p} onClick={() => (blip(), setSel(p.uid))} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 mb-4 text-center text-sm text-ink-soft">
                    {tab === 'room' ? 'No pets in the room yet. A delivery comes every day!' : 'Nobody in foster care. When your room is full, new pets wait here.'}
                  </p>
                )}
                <p className="mt-4 text-center text-xs text-ink-soft">
                  <Check className="mr-1 inline size-3.5" aria-hidden />
                  Feed each room pet once a day for Hearts on top of your daily limit. Pets never get sick or die.
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
