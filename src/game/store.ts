import { useSyncExternalStore } from 'react'
import { DAILY_CAP } from './acts'
import { ITEMS } from './catalog'
import { canPlace, type Placed, type Rot } from './grid'
import { STARTER } from './starter'
import { FLOORS, WALLS } from './surfaces'

/** Everything that's saved: the room, what's in storage, Hearts and today's progress */
export type Save = {
  placed: Placed[]
  storage: Record<string, number>
  hearts: number
  day: string
  earnedToday: number
  uses: Record<string, number>
  floor: string
  wall: string
  owned: string[]
  muted: boolean
}

/** Things that only matter while playing: edit mode, what's selected, what's being placed */
export type Session = {
  mode: 'play' | 'edit'
  selected: string | null
  /** An item being placed or moved, following the pointer */
  ghost: (Placed & { valid: boolean; moving?: string }) | null
  /** The activity your character is doing (started = when it began in ms, 0 while still walking there) */
  doing: { uid: string; act: string; started: number; seconds: number; earned: number; total: number } | null
}

const KEY = 'pocketroom:v1'
export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fresh = (): Save => ({
  placed: STARTER,
  storage: {},
  hearts: 1000,
  day: today(),
  earnedToday: 0,
  uses: {},
  floor: FLOORS[0].id,
  wall: WALLS[0].id,
  owned: [FLOORS[0].id, WALLS[0].id],
  muted: false,
})

function load(): Save {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...fresh(), ...(JSON.parse(raw) as Partial<Save>) }
  } catch {
    // Storage blocked or broken: start fresh
  }
  return fresh()
}

let save = load()
let session: Session = { mode: 'play', selected: null, ghost: null, doing: null }
const listeners = new Set<() => void>()
let timer = 0

const emit = () => listeners.forEach((l) => l())

export function setSave(fn: (s: Save) => Save) {
  save = fn(save)
  emit()
  clearTimeout(timer)
  timer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(save))
    } catch {
      // Not saved this time; the next change will try again
    }
  }, 300)
}

export function setSession(fn: (s: Session) => Session) {
  session = fn(session)
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}

export const useSave = <T,>(pick: (s: Save) => T) => useSyncExternalStore(subscribe, () => pick(save))
export const useSession = <T,>(pick: (s: Session) => T) => useSyncExternalStore(subscribe, () => pick(session))
export const getSave = () => save
export const getSession = () => session

/** A new day (local midnight) clears today's Heart count and activity uses */
export function rollDay() {
  if (save.day !== today()) setSave((s) => ({ ...s, day: today(), earnedToday: 0, uses: {} }))
}

export const uid = () => Math.random().toString(36).slice(2, 10)

/** How decorated the room is: grows with the value of what's placed */
export const styleScore = (placed: Placed[]) => Math.round(placed.reduce((n, p) => n + ITEMS[p.id].price, 0) / 100)

// ---- Actions ----

export function buy(id: string) {
  const item = ITEMS[id]
  if (save.hearts < item.price) return false
  setSave((s) => ({ ...s, hearts: s.hearts - item.price, storage: { ...s.storage, [id]: (s.storage[id] ?? 0) + 1 } }))
  return true
}

export function buySurface(id: string, price: number) {
  if (save.hearts < price || save.owned.includes(id)) return false
  setSave((s) => ({ ...s, hearts: s.hearts - price, owned: [...s.owned, id] }))
  return true
}

/** Start placing something from storage */
export function startPlacing(id: string) {
  const item = ITEMS[id]
  setSession((s) => ({ ...s, selected: null, ghost: { uid: uid(), id, x: 0, z: 0, r: 0, wall: item.kind === 'wall' ? 'R' : undefined, valid: false } }))
}

/** Pick up a placed item to move it */
export function startMoving(p: Placed) {
  setSession((s) => ({ ...s, selected: null, ghost: { ...p, valid: true, moving: p.uid } }))
}

export function rotateGhost() {
  setSession((s) => {
    if (!s.ghost) return s
    const g = { ...s.ghost, r: ((s.ghost.r + 1) % 4) as Rot }
    return { ...s, ghost: { ...g, valid: canPlace(save.placed, g, g.moving) } }
  })
}

/** Drop the ghost where it is (if it fits) */
export function commitGhost() {
  const g = session.ghost
  if (!g || !g.valid) return false
  const { valid: _valid, moving, ...p } = g
  void _valid
  setSave((s) => {
    if (moving) {
      // Items sitting on a moved table come along for the ride
      const old = s.placed.find((o) => o.uid === moving)
      const dx = old ? p.x - old.x : 0
      const dz = old ? p.z - old.z : 0
      const rotated = old && old.r !== p.r
      return {
        ...s,
        placed: s.placed.flatMap((o) => {
          if (o.uid === moving) return [p]
          if (o.on === moving) return rotated ? [] : [{ ...o, x: o.x + dx, z: o.z + dz }]
          return [o]
        }),
        storage: rotated ? s.placed.filter((o) => o.on === moving).reduce((st, o) => ({ ...st, [o.id]: (st[o.id] ?? 0) + 1 }), s.storage) : s.storage,
      }
    }
    const left = (s.storage[p.id] ?? 0) - 1
    const storage = { ...s.storage }
    if (left > 0) storage[p.id] = left
    else delete storage[p.id]
    return { ...s, placed: [...s.placed, p], storage }
  })
  setSession((s) => ({ ...s, ghost: null, selected: moving ? p.uid : null }))
  return true
}

export const cancelGhost = () => setSession((s) => ({ ...s, ghost: null }))

/** Put an item (and anything on it) back in storage */
export function store(uidToStore: string) {
  setSave((s) => {
    const gone = s.placed.filter((o) => o.uid === uidToStore || o.on === uidToStore)
    const storage = { ...s.storage }
    gone.forEach((o) => (storage[o.id] = (storage[o.id] ?? 0) + 1))
    return { ...s, placed: s.placed.filter((o) => !gone.includes(o)), storage }
  })
  setSession((s) => ({ ...s, selected: null }))
}

export function recolor(uidToPaint: string, color: string) {
  setSave((s) => ({ ...s, placed: s.placed.map((o) => (o.uid === uidToPaint ? { ...o, color } : o)) }))
}

/** Adds Hearts from an activity, up to today's limit. Returns how many actually landed. */
export function earn(n: number) {
  rollDay()
  const room = Math.max(0, DAILY_CAP - save.earnedToday)
  const got = Math.min(n, room)
  if (got > 0) setSave((s) => ({ ...s, hearts: s.hearts + got, earnedToday: s.earnedToday + got }))
  return got
}

export function spendUse(act: string) {
  rollDay()
  setSave((s) => ({ ...s, uses: { ...s.uses, [act]: (s.uses[act] ?? 0) + 1 } }))
}

export const setMuted = (muted: boolean) => setSave((s) => ({ ...s, muted }))
