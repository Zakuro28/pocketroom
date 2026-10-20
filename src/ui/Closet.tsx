import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, X } from 'lucide-react'
import { DYEABLE, type Dyeable, type Profile, type Slot } from '../game/look'
import { buyClothing, dye, useSave, wear } from '../game/store'
import { CLOTHES, CLOTHING, RARITY, SLOTS, type Clothing } from '../game/wardrobe'
import { blip, buyChime, nope } from '../lib/sound'
import { Preview } from './Creator'
import { ClothingIcon } from './ClothingIcon'
import { Slide } from './Slide'

const fmt = (n: number) => n.toLocaleString('en-US')

/** Quick dye colors; the last swatch opens a picker for any color at all */
const DYES = ['#ffffff', '#2b2a30', '#9aa3ad', '#e2443a', '#f29e4c', '#ffcf5a', '#7bc96f', '#2fb3a0', '#5bb8d6', '#3c5fd6', '#a77bf0', '#f28bb8', '#c4a77d', '#7a4f33']

/** Pick a color for the piece you're wearing: its own color, a quick swatch, or anything from the picker */
function DyeRow({ slot, own, value }: { slot: Dyeable; own: string; value?: string }) {
  const pick = (c: string | null) => {
    blip()
    dye(slot, c)
  }
  const ring = (on: boolean) => (on ? 'ring-3 ring-ink' : 'ring-1 ring-black/10')
  return (
    <div className="mt-1 shrink-0">
      <p className="text-xs font-semibold text-ink-soft">Color (free)</p>
      <Slide label="Clothing color" className="-mx-1 gap-2 px-1 pt-1.5 pb-2">
        <button type="button" onClick={() => pick(null)} aria-label="Original color" className={`grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold ring-offset-2 ring-offset-cream ${ring(!value)}`} style={{ background: own }}>
          <span className="rounded bg-white/85 px-0.5 text-ink">✦</span>
        </button>
        {DYES.map((c) => (
          <button key={c} type="button" onClick={() => pick(c)} aria-label={c} className={`size-8 shrink-0 rounded-full ring-offset-2 ring-offset-cream ${ring(value === c)}`} style={{ background: c }} />
        ))}
        <label className={`relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-full ring-offset-2 ring-offset-cream ${ring(!!value && !DYES.includes(value))}`} style={{ background: 'conic-gradient(#ef5e57, #f2d36b, #7bc96f, #5bb8d6, #a77bf0, #f28bb8, #ef5e57)' }}>
          <span className="sr-only">Any color</span>
          <input type="color" value={value ?? own} onChange={(e) => dye(slot, e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
      </Slide>
    </div>
  )
}

/** A little drawing of a piece of clothing for the closet grid, in its own colors */
function Swatch({ c }: { c: Clothing }) {
  return (
    <span className="relative grid size-full place-items-center rounded-xl" style={{ background: `${c.color}26` }}>
      <ClothingIcon c={c} className="size-[78%]" />
    </span>
  )
}

/** Try on and buy clothes. Owned pieces go on straight away; anything else can be tried on before buying. */
export default function Closet({ open, onClose, say }: { open: boolean; onClose: () => void; say: (m: string) => void }) {
  const profile = useSave((s) => s.profile)
  const owned = useSave((s) => s.clothes)
  const hearts = useSave((s) => s.hearts)
  const [slot, setSlot] = useState<Slot>('top')
  const [trying, setTrying] = useState<Clothing | null>(null)
  if (!profile) return null

  // Trying something on shows it in its own color
  const preview: Profile = trying ? { ...profile, outfit: { ...profile.outfit, [trying.slot]: trying.id }, tint: { ...profile.tint, [trying.slot]: undefined } } : profile
  const optional = slot === 'hat' || slot === 'face'
  const dyeable = DYEABLE.includes(slot as Dyeable) ? (slot as Dyeable) : null

  const pick = (c: Clothing) => {
    blip()
    if (owned.includes(c.id)) {
      setTrying(null)
      if (optional && profile.outfit[c.slot] === c.id) wear(c.slot, null)
      else wear(c.slot, c.id)
    } else setTrying(c)
  }

  const buy = () => {
    if (!trying) return
    if (!buyClothing(trying.id)) return nope()
    buyChime()
    wear(trying.slot, trying.id)
    say(`${trying.name} is yours! ✨`)
    setTrying(null)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 grid place-items-center bg-ink/30 p-3 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Wardrobe"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', duration: 0.45, bounce: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-cream shadow-2xl sm:flex-row"
          >
            <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full bg-white/80 text-ink-soft hover:text-ink">
              <X className="size-5" />
            </button>

            {/* Try-on preview */}
            <div className="relative h-52 shrink-0 bg-linear-to-b from-[#ffe6cf] to-cream sm:h-auto sm:w-[40%]">
              <Preview profile={preview} />
              <AnimatePresence>
                {trying && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="absolute inset-x-3 bottom-3 hidden rounded-2xl bg-white p-3 shadow-lg sm:block">
                    <p className="text-xs font-bold tracking-wide uppercase" style={{ color: RARITY[trying.rarity].color }}>
                      {RARITY[trying.rarity].label}
                    </p>
                    <p className="font-semibold">{trying.name}</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setTrying(null)} className="chunky rounded-xl bg-paper px-3 py-2 text-sm font-semibold">
                        Take off
                      </button>
                      <button type="button" onClick={buy} disabled={hearts < trying.price} className="chunky flex-1 rounded-xl bg-heart px-3 py-2 text-sm font-bold text-white disabled:bg-[#d7cfc4]">
                        {hearts < trying.price ? `Need ${fmt(trying.price - hearts)} more` : `Buy 💗 ${fmt(trying.price)}`}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* On a phone the buy bar sits under the preview, so it never covers your character */}
            {trying && (
              <div className="flex shrink-0 items-center gap-2 border-b border-line bg-white px-3 py-2 sm:hidden">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] leading-tight font-bold tracking-wide uppercase" style={{ color: RARITY[trying.rarity].color }}>
                    {RARITY[trying.rarity].label}
                  </p>
                  <p className="truncate text-sm font-semibold">{trying.name}</p>
                </div>
                <button type="button" onClick={() => setTrying(null)} className="chunky shrink-0 rounded-xl bg-paper px-3 py-2 text-sm font-semibold">
                  Take off
                </button>
                <button type="button" onClick={buy} disabled={hearts < trying.price} className="chunky shrink-0 rounded-xl bg-heart px-3 py-2 text-sm font-bold text-white disabled:bg-[#d7cfc4]">
                  {hearts < trying.price ? `Need ${fmt(trying.price - hearts)}` : `Buy 💗 ${fmt(trying.price)}`}
                </button>
              </div>
            )}

            <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4 sm:p-5">
              <h2 className="text-xl font-bold">Wardrobe</h2>
              <Slide label="Clothing types" className="mt-3 shrink-0 gap-1.5 pb-2">
                {SLOTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSlot(s.id)
                      setTrying(null)
                    }}
                    className={`chunky flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ${slot === s.id ? 'bg-ink text-cream' : 'bg-white ring-1 ring-line'}`}
                  >
                    <span aria-hidden>{s.icon}</span> {s.label}
                  </button>
                ))}
              </Slide>
              {dyeable && !trying && profile.outfit[dyeable] && <DyeRow slot={dyeable} own={CLOTHING[profile.outfit[dyeable]!]?.color ?? '#ffffff'} value={profile.tint?.[dyeable]} />}
              <div className="mt-3 grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] content-start gap-2.5 overflow-y-auto pb-1">
                {CLOTHES.filter((c) => c.slot === slot).map((c) => {
                  const has = owned.includes(c.id)
                  const on = profile.outfit[c.slot] === c.id
                  const r = RARITY[c.rarity]
                  return (
                    <button key={c.id} type="button" onClick={() => pick(c)} className={`chunky relative flex flex-col items-center rounded-2xl bg-white p-2 text-center ring-2 ${trying?.id === c.id ? 'ring-heart' : on ? 'ring-mint' : 'ring-transparent'}`}>
                      <span className="aspect-square w-full">
                        <Swatch c={c} />
                      </span>
                      <span className="mt-1.5 line-clamp-1 w-full text-xs font-semibold">{c.name}</span>
                      {on ? (
                        <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-mint">
                          <Check className="size-3" strokeWidth={3} aria-hidden /> Wearing
                        </span>
                      ) : has ? (
                        <span className="mt-0.5 text-xs font-semibold text-ink-soft">Owned</span>
                      ) : (
                        <span className="mt-0.5 text-xs font-bold text-heart tabular-nums">💗 {fmt(c.price)}</span>
                      )}
                      <span className="absolute top-1.5 left-1.5 size-2.5 rounded-full" style={{ background: r.color }} title={r.label} aria-label={r.label} />
                    </button>
                  )
                })}
              </div>
              {optional && profile.outfit[slot] && (
                <button type="button" onClick={() => wear(slot, null)} className="mt-2 self-start text-sm font-semibold text-ink-soft underline underline-offset-2">
                  Take off {CLOTHING[profile.outfit[slot]!]?.name}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
