import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Move, Package, Palette, RotateCw, X } from 'lucide-react'
import { CATALOG, CATEGORIES, FABRICS, ITEMS, type Category, type Item } from '../game/catalog'
import { canPlace, type Rot } from '../game/grid'
import { buyGhost, buySurface, cancelGhost, commitGhost, getSave, getSession, previewItem, recolor, rotateGhost, setSave, setSession, startMoving, startPlacing, store, tryOn, useSave, useSession } from '../game/store'
import { FLOORS, WALLS, swatch, type Surface } from '../game/surfaces'
import { Slide } from './Slide'
import { cachedItemThumb, itemThumb } from '../scene/thumbs'

/** A sharp picture of a piece of furniture in its real colors, drawn from its 3D model */
function ItemPic({ item, className }: { item: Item; className: string }) {
  const [src, setSrc] = useState(() => cachedItemThumb(item.model, item.paint) ?? '')
  useEffect(() => {
    if (src) return
    let live = true
    void itemThumb(item.model, item.paint).then((u) => live && setSrc(u))
    return () => void (live = false)
  }, [item, src])
  return src ? <img src={src} alt="" className={`object-contain ${className}`} draggable={false} /> : <span className={`animate-pulse rounded-xl bg-line/50 ${className}`} aria-hidden />
}
import { blip, buyChime, lift, nope, place } from '../lib/sound'

const EASE = [0.23, 1, 0.32, 1] as const
const fmt = (n: number) => n.toLocaleString('en-US')
type Tab = Category | 'owned' | 'surfaces'

const sheet = { initial: { y: 40, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: 30, opacity: 0, transition: { duration: 0.15 } }, transition: { duration: 0.28, ease: EASE } }

/**
 * Everything shown while decorating: the catalog, the placing bar and the selected-item bar. Anything from the shop
 * shows in your room first (furniture as a preview to place, floors and wallpaper on the room) and is paid for only
 * when you tap Buy.
 */
export default function Decorate({ say, onDone }: { say: (msg: string) => void; onDone: () => void }) {
  const ghost = useSession((s) => s.ghost)
  const selected = useSession((s) => s.selected)
  const trying = useSession((s) => s.trying)

  // Keyboard: R rotates, Esc cancels or deselects, Delete puts the selected item away
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      const s = getSession()
      if (e.key === 'r' || e.key === 'R') {
        if (s.ghost) rotateGhost()
        else if (s.selected) rotatePlaced(s.selected, say)
      } else if (e.key === 'Escape') {
        if (s.ghost) cancelGhost()
        else if (s.trying) tryOn(null)
        else setSession((x) => ({ ...x, selected: null }))
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && s.selected) store(s.selected)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [say])

  return (
    <>
      <AnimatePresence mode="wait">
        {ghost ? (
          <PlacingBar key="ghost" valid={ghost.valid} buying={ghost.buying ? ITEMS[ghost.id] : null} say={say} />
        ) : trying ? (
          <TryBar key="trying" kind={trying.kind} id={trying.id} say={say} />
        ) : selected ? (
          <SelectedBar key={selected} uid={selected} say={say} />
        ) : (
          <Catalog key="catalog" onDone={onDone} />
        )}
      </AnimatePresence>
    </>
  )
}

function rotatePlaced(uid: string, say: (m: string) => void) {
  const p = getSave().placed.find((o) => o.uid === uid)
  if (!p) return
  const next = { ...p, r: ((p.r + 1) % 4) as Rot }
  if (!canPlace(getSave().placed, next, uid)) return (nope(), say('No room to turn it here'))
  // Things on top of a table go back to storage when it turns, so nothing ends up floating
  setSave((s) => {
    const onTop = s.placed.filter((o) => o.on === uid)
    const storage = { ...s.storage }
    onTop.forEach((o) => (storage[o.id] = (storage[o.id] ?? 0) + 1))
    return { ...s, storage, placed: s.placed.filter((o) => o.on !== uid).map((o) => (o.uid === uid ? next : o)) }
  })
  lift()
}

function Card({ thumb, name, children, onClick, active = false }: { thumb: React.ReactNode; name: string; children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`chunky flex w-[5.5rem] flex-col items-center rounded-2xl bg-white p-2 text-center ring-2 ${active ? 'ring-mint' : 'ring-transparent'}`}>
      <span className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-paper">{thumb}</span>
      <span className="mt-1.5 line-clamp-1 w-full text-xs font-semibold">{name}</span>
      {children}
    </button>
  )
}

function Catalog({ onDone }: { onDone: () => void }) {
  const storage = useSave((s) => s.storage)
  const hearts = useSave((s) => s.hearts)
  const floor = useSave((s) => s.floor)
  const wall = useSave((s) => s.wall)
  const owned = useSave((s) => s.owned)
  // Only things this version of the game knows (an unknown item from a newer version waits in storage, unseen)
  const ownedCount = Object.entries(storage).reduce((a, [id, n]) => a + (ITEMS[id] ? n : 0), 0)
  const [tab, setTab] = useState<Tab>(ownedCount ? 'owned' : 'seating')
  const items = useMemo(() => (tab === 'owned' ? CATALOG.filter((i) => storage[i.id]) : tab === 'surfaces' ? [] : CATALOG.filter((i) => i.cat === tab).sort((a, b) => a.price - b.price)), [tab, storage])

  const tabs: { id: Tab; label: string; icon: string }[] = [{ id: 'owned', label: `Owned${ownedCount ? ` ${ownedCount}` : ''}`, icon: '📦' }, ...CATEGORIES, { id: 'surfaces', label: 'Floor & walls', icon: '🎨' }]

  // Owned: place it. Not owned yet: see it in the room first, and buy it from there.
  const pick = (i: Item) => {
    if (storage[i.id]) startPlacing(i.id)
    else previewItem(i.id)
    lift()
  }
  const pickSurface = (s: Surface, kind: 'floor' | 'wall') => {
    if (owned.includes(s.id)) {
      setSave((x) => ({ ...x, [kind]: s.id }))
      place()
    } else {
      blip()
      tryOn({ kind, id: s.id })
    }
  }

  return (
    <motion.div {...sheet} className="pointer-events-auto absolute inset-x-0 bottom-0 mx-auto flex max-h-[38dvh] max-w-4xl flex-col rounded-t-[2rem] bg-cream pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(74,52,40,0.18)]">
      <Slide label="Shop sections" className="gap-1.5 px-4 pt-4 pb-2">
        {/* Done lives here, in the panel, so the top of the room stays free to decorate */}
        <button type="button" onClick={onDone} className="chunky flex shrink-0 items-center gap-1.5 rounded-full bg-mint px-4 py-2 text-sm font-bold text-white">
          <Check className="size-4" strokeWidth={3} aria-hidden /> Done
        </button>
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`chunky flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap ${tab === t.id ? 'bg-ink text-cream' : 'bg-white text-ink ring-1 ring-line'}`}>
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </Slide>
      <div className="flex-1 overflow-y-auto pt-2 pb-4">
        {tab === 'surfaces' ? (
          <div className="space-y-4">
            {(
              [
                ['Floors', FLOORS, 'floor', floor],
                ['Wallpaper', WALLS, 'wall', wall],
              ] as const
            ).map(([title, list, kind, current]) => (
              <section key={title}>
                <h3 className="mb-2 px-4 text-sm font-semibold text-ink-soft">{title}</h3>
                <Slide label={title} className="gap-2.5 px-4 pt-0.5 pb-2.5">
                  {list.map((s) => (
                    <Card key={s.id} name={s.name} onClick={() => pickSurface(s, kind)} active={current === s.id} thumb={<img src={swatch(s)} alt="" className="absolute inset-[12%] size-[76%] rounded-lg ring-1 ring-black/5" draggable={false} />}>
                      <Price owned={owned.includes(s.id)} price={s.price} hearts={hearts} />
                    </Card>
                  ))}
                </Slide>
              </section>
            ))}
          </div>
        ) : items.length ? (
          <Slide label="Items" className="gap-2.5 px-4 pt-0.5 pb-2.5">
            {items.map((i) => (
              <Card key={i.id} name={i.name} onClick={() => pick(i)} thumb={<ItemPic item={i} className="absolute inset-[6%] size-[88%]" />}>
                {storage[i.id] ? <span className="mt-0.5 text-xs font-semibold text-mint">Owned ×{storage[i.id]}</span> : <Price price={i.price} hearts={hearts} />}
              </Card>
            ))}
          </Slide>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-ink-soft">
            Nothing in storage yet.{' '}
            <button type="button" className="font-semibold text-heart underline underline-offset-2" onClick={() => setTab('seating')}>
              Browse the shop
            </button>
          </p>
        )}
      </div>
    </motion.div>
  )
}

function Price({ price, hearts, owned = false }: { price: number; hearts: number; owned?: boolean }) {
  if (owned) return <span className="mt-0.5 text-xs font-semibold text-mint">Owned</span>
  if (!price) return <span className="mt-0.5 text-xs font-semibold text-mint">Free</span>
  return <span className={`mt-0.5 text-xs font-bold tabular-nums ${hearts >= price ? 'text-heart' : 'text-ink-soft/60'}`}>💗 {fmt(price)}</span>
}

/** Placing something: rotate, cancel, or place it. From the shop, placing it is buying it. */
function PlacingBar({ valid, buying, say }: { valid: boolean; buying: Item | null; say: (m: string) => void }) {
  const hearts = useSave((s) => s.hearts)
  const short = buying ? buying.price - hearts : 0
  const buyHere = () => {
    if (!buying || short > 0 || !buyGhost()) return nope()
    buyChime()
    place()
    say(`${buying.name} is yours! ✨`)
  }
  return (
    <motion.div {...sheet} className="pointer-events-auto absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto flex w-fit flex-col items-center gap-2">
      {buying && (
        <p className="rounded-full bg-cream px-3.5 py-1.5 text-sm font-bold shadow-[0_3px_0_rgba(74,52,40,0.12)]">
          {buying.name} <span className="text-heart tabular-nums">💗 {fmt(buying.price)}</span> <span className="font-medium text-ink-soft">· preview</span>
        </p>
      )}
      <p className="rounded-full bg-cream/95 px-3 py-1 text-xs font-medium text-ink-soft">
        <span className="pointer-coarse:hidden">{buying ? 'Click where it goes to see it · R to rotate · Esc to cancel (free)' : 'Click to place · R to rotate · Esc to cancel'}</span>
        <span className="hidden pointer-coarse:inline">{buying ? 'Tap where it goes to see it, then buy' : 'Tap where it goes, then ✓'}</span>
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={cancelGhost} aria-label="Cancel" className="chunky grid size-14 place-items-center rounded-2xl bg-white text-ink">
          <X className="size-6" />
        </button>
        <button type="button" onClick={rotateGhost} aria-label="Rotate" className="chunky grid size-14 place-items-center rounded-2xl bg-white text-ink">
          <RotateCw className="size-6" />
        </button>
        {buying ? (
          <button type="button" onClick={buyHere} disabled={!valid || short > 0} className="chunky h-14 rounded-2xl bg-heart px-5 font-bold text-white disabled:bg-[#d7cfc4]">
            {short > 0 ? `Need ${fmt(short)} more` : `Buy · 💗 ${fmt(buying.price)}`}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => (commitGhost() ? place() : nope())}
            disabled={!valid}
            aria-label="Place here"
            className="chunky grid size-14 place-items-center rounded-2xl bg-mint text-white disabled:bg-[#d7cfc4]"
          >
            <Check className="size-7" strokeWidth={3} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

/** A floor or wallpaper shown on the room before buying it: buy it, or put yours back */
function TryBar({ kind, id, say }: { kind: 'floor' | 'wall'; id: string; say: (m: string) => void }) {
  const hearts = useSave((s) => s.hearts)
  const s = (kind === 'floor' ? FLOORS : WALLS).find((x) => x.id === id)
  if (!s) return null
  const short = s.price - hearts
  const buyIt = () => {
    if (short > 0 || !buySurface(s.id, s.price)) return nope()
    buyChime()
    setSave((x) => ({ ...x, [kind]: s.id }))
    tryOn(null)
    say(`${s.name} is on! ✨`)
  }
  return (
    <motion.div {...sheet} className="pointer-events-auto absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto flex w-fit max-w-[calc(100%-2rem)] flex-col items-center gap-2">
      <p className="rounded-full bg-cream px-3.5 py-1.5 text-sm font-bold shadow-[0_3px_0_rgba(74,52,40,0.12)]">
        {s.name} <span className="text-heart tabular-nums">💗 {fmt(s.price)}</span> <span className="font-medium text-ink-soft">· preview</span>
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => tryOn(null)} className="chunky h-14 rounded-2xl bg-white px-5 font-semibold">
          Cancel
        </button>
        <button type="button" onClick={buyIt} disabled={short > 0} className="chunky h-14 rounded-2xl bg-heart px-5 font-bold text-white disabled:bg-[#d7cfc4]">
          {short > 0 ? `Need ${fmt(short)} more` : `Buy · 💗 ${fmt(s.price)}`}
        </button>
      </div>
    </motion.div>
  )
}

function SelectedBar({ uid, say }: { uid: string; say: (m: string) => void }) {
  const p = useSave((s) => s.placed.find((o) => o.uid === uid))
  const [colors, setColors] = useState(false)
  if (!p) return null
  const item = ITEMS[p.id]
  const btn = 'chunky flex flex-col items-center gap-0.5 rounded-2xl bg-white px-3 py-2 text-xs font-semibold min-w-16'
  return (
    <motion.div {...sheet} className="pointer-events-auto absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto flex w-fit max-w-[calc(100%-2rem)] flex-col items-center gap-2">
      <AnimatePresence>
        {colors && item.fabric && (
          <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="flex flex-wrap justify-center gap-1.5 rounded-2xl bg-cream p-2 shadow-[0_4px_0_rgba(74,52,40,0.12)]">
            {FABRICS.map((c) => (
              <button key={c} type="button" onClick={() => recolor(uid, c)} aria-label={`Color ${c}`} className={`size-8 rounded-full ring-2 transition-transform duration-150 active:scale-90 ${p.color === c ? 'ring-ink' : 'ring-white'}`} style={{ background: c }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-2 rounded-[1.5rem] bg-cream p-2 shadow-[0_6px_0_rgba(74,52,40,0.12)]">
        <span className="hidden px-2 text-sm font-semibold sm:block">{item.name}</span>
        <button type="button" className={btn} onClick={() => (startMoving(p), lift())}>
          <Move className="size-5" aria-hidden /> Move
        </button>
        {item.kind !== 'wall' && (
          <button type="button" className={btn} onClick={() => rotatePlaced(uid, say)}>
            <RotateCw className="size-5" aria-hidden /> Turn
          </button>
        )}
        {item.fabric && (
          <button type="button" className={btn} onClick={() => setColors((c) => !c)} aria-expanded={colors}>
            <Palette className="size-5" aria-hidden /> Color
          </button>
        )}
        <button type="button" className={btn} onClick={() => (store(uid), lift())}>
          <Package className="size-5" aria-hidden /> Put away
        </button>
        <button type="button" onClick={() => setSession((s) => ({ ...s, selected: null }))} aria-label="Done with this item" className="grid size-10 place-items-center rounded-full text-ink-soft hover:text-ink">
          <X className="size-5" />
        </button>
      </div>
    </motion.div>
  )
}
