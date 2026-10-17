import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Move, Package, Palette, RotateCw, X } from 'lucide-react'
import { CATALOG, CATEGORIES, FABRICS, ITEMS, type Category, type Item } from '../game/catalog'
import { canPlace, type Rot } from '../game/grid'
import { buy, buySurface, cancelGhost, commitGhost, getSave, getSession, recolor, rotateGhost, setSave, setSession, startMoving, startPlacing, store, useSave, useSession } from '../game/store'
import { FLOORS, WALLS, swatch, type Surface } from '../game/surfaces'
import { Slide } from './Slide'
import { buyChime, lift, nope, place } from '../lib/sound'

const EASE = [0.23, 1, 0.32, 1] as const
const fmt = (n: number) => n.toLocaleString('en-US')
type Tab = Category | 'owned' | 'surfaces'

const sheet = { initial: { y: 40, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: 30, opacity: 0, transition: { duration: 0.15 } }, transition: { duration: 0.28, ease: EASE } }

/** Everything shown while decorating: the catalog, the placing bar, the selected-item bar and the buy window */
export default function Decorate({ say }: { say: (msg: string) => void }) {
  const ghost = useSession((s) => s.ghost)
  const selected = useSession((s) => s.selected)
  const [buying, setBuying] = useState<Item | Surface | null>(null)

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
        else setSession((x) => ({ ...x, selected: null }))
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && s.selected) store(s.selected)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [say])

  return (
    <>
      <AnimatePresence mode="wait">
        {ghost ? <PlacingBar key="ghost" valid={ghost.valid} /> : selected ? <SelectedBar key={selected} uid={selected} say={say} /> : <Catalog key="catalog" onBuy={setBuying} />}
      </AnimatePresence>
      <BuyWindow item={buying} onClose={() => setBuying(null)} say={say} />
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

function Catalog({ onBuy }: { onBuy: (i: Item | Surface) => void }) {
  const storage = useSave((s) => s.storage)
  const hearts = useSave((s) => s.hearts)
  const floor = useSave((s) => s.floor)
  const wall = useSave((s) => s.wall)
  const owned = useSave((s) => s.owned)
  const ownedCount = Object.values(storage).reduce((a, b) => a + b, 0)
  const [tab, setTab] = useState<Tab>(ownedCount ? 'owned' : 'seating')
  const items = useMemo(() => (tab === 'owned' ? CATALOG.filter((i) => storage[i.id]) : tab === 'surfaces' ? [] : CATALOG.filter((i) => i.cat === tab).sort((a, b) => a.price - b.price)), [tab, storage])

  const tabs: { id: Tab; label: string; icon: string }[] = [{ id: 'owned', label: `Owned${ownedCount ? ` ${ownedCount}` : ''}`, icon: '📦' }, ...CATEGORIES, { id: 'surfaces', label: 'Floor & walls', icon: '🎨' }]

  const pick = (i: Item) => {
    if (storage[i.id]) {
      startPlacing(i.id)
      lift()
    } else onBuy(i)
  }
  const pickSurface = (s: Surface, kind: 'floor' | 'wall') => {
    if (owned.includes(s.id)) {
      setSave((x) => ({ ...x, [kind]: s.id }))
      place()
    } else onBuy(s)
  }

  return (
    <motion.div {...sheet} className="pointer-events-auto absolute inset-x-0 bottom-0 mx-auto flex max-h-[38dvh] max-w-4xl flex-col rounded-t-[2rem] bg-cream pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(74,52,40,0.18)]">
      <Slide label="Shop sections" className="gap-1.5 px-4 pt-4 pb-2">
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
              <Card key={i.id} name={i.name} onClick={() => pick(i)} thumb={<img src={`/thumbs/${i.model}.png`} alt="" className={`absolute inset-[11%] size-[78%] object-contain ${i.paint ? 'saturate-150' : ''}`} draggable={false} />}>
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

function PlacingBar({ valid }: { valid: boolean }) {
  return (
    <motion.div {...sheet} className="pointer-events-auto absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto flex w-fit flex-col items-center gap-2">
      <p className="rounded-full bg-cream/95 px-3 py-1 text-xs font-medium text-ink-soft">
        <span className="pointer-coarse:hidden">Click to place · R to rotate · Esc to cancel</span>
        <span className="hidden pointer-coarse:inline">Tap where it goes, then ✓</span>
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={cancelGhost} aria-label="Cancel" className="chunky grid size-14 place-items-center rounded-2xl bg-white text-ink">
          <X className="size-6" />
        </button>
        <button type="button" onClick={rotateGhost} aria-label="Rotate" className="chunky grid size-14 place-items-center rounded-2xl bg-white text-ink">
          <RotateCw className="size-6" />
        </button>
        <button
          type="button"
          onClick={() => (commitGhost() ? place() : nope())}
          disabled={!valid}
          aria-label="Place here"
          className="chunky grid size-14 place-items-center rounded-2xl bg-mint text-white disabled:bg-[#d7cfc4]"
        >
          <Check className="size-7" strokeWidth={3} />
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

function BuyWindow({ item, onClose, say }: { item: Item | Surface | null; onClose: () => void; say: (m: string) => void }) {
  const hearts = useSave((s) => s.hearts)
  const isItem = item !== null && 'model' in item
  const short = item ? item.price - hearts : 0
  const confirm = () => {
    if (!item) return
    if (isItem) {
      if (!buy(item.id)) return nope()
      buyChime()
      startPlacing(item.id)
    } else {
      if (!buySurface(item.id, item.price)) return nope()
      buyChime()
      const kind = FLOORS.some((f) => f.id === item.id) ? 'floor' : 'wall'
      setSave((s) => ({ ...s, [kind]: item.id }))
      say(`${item.name} is on! ✨`)
    }
    onClose()
  }
  return (
    <AnimatePresence>
      {item && (
        <motion.div className="pointer-events-auto fixed inset-0 z-40 grid place-items-center bg-ink/30 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Buy ${item.name}`}
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-[2rem] bg-cream p-5 text-center shadow-2xl"
          >
            <div className="mx-auto grid size-32 place-items-center rounded-3xl bg-white">
              {isItem ? <img src={`/thumbs/${item.model}.png`} alt="" className="size-24 object-contain" /> : <span className="size-20 rounded-2xl" style={{ background: item.base }} />}
            </div>
            <h2 className="mt-3 text-xl font-bold">{item.name}</h2>
            <p className="mt-1 text-2xl font-bold text-heart tabular-nums">💗 {fmt(item.price)}</p>
            <p className="mt-1 text-sm text-ink-soft">You have 💗 {fmt(hearts)}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={onClose} className="chunky flex-1 rounded-2xl bg-white py-3 font-semibold">
                Not now
              </button>
              <button type="button" onClick={confirm} disabled={short > 0} className="chunky flex-1 rounded-2xl bg-heart py-3 font-bold text-white disabled:bg-[#d7cfc4]">
                {short > 0 ? `Need ${fmt(short)} more` : isItem ? 'Buy & place' : 'Buy'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
