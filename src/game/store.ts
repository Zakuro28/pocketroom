import { useSyncExternalStore } from 'react'
import { DAILY_CAP } from './acts'
import { ITEMS } from './catalog'
import { canPlace, type Placed, type Rot } from './grid'
import { STARTER } from './starter'
import { FLOORS, WALLS } from './surfaces'
import type { Profile, Slot } from './look'
import { CLOTHING, STARTER_CLOTHES } from './wardrobe'
import { DEFAULT_OUTFIT } from './look'
import { bodyOf, type Pet, type PetBody, type Pity } from './pets'

/** A pet waiting at the door: today's free spin, a birthday or monthsary spin, or a seasonal event */
export type Delivery = { id: string; kind: 'daily' | 'birthday' | 'monthsary' | 'seasonal' | 'gift'; event?: string }
/** What's been handed out already, so each spin comes once */
export type Spins = { day: string; pity: Pity; birthday: number; monthsary: string; seasonal: string[]; gift?: number }

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
  /** Your character; null until it has been created */
  profile: Profile | null
  /** Clothes you own */
  clothes: string[]
  /** While living with a partner: the couple's id. The room and Hearts then mirror the shared home. */
  home: string | null
  /** Your pets: up to 3 in the room and 10 in foster care */
  pets: Pet[]
  /** Pets waiting at the door to be rolled */
  deliveries: Delivery[]
  spins: Spins
  /** A new pet that arrived with foster care full: you pick a foster pet to be adopted first */
  adopting: string | null
  /** The year you last got your birthday Hearts */
  birthdayGift: number
  /** The account this game belongs to (null: a guest game on this device) */
  owner?: string | null
  /** The newest patch notes this player has read (see src/game/updates.ts) */
  seenVersion?: string
}

/** A room as other players see it, with the pets living in it */
export type RoomView = { placed: Placed[]; floor: string; wall: string; pets?: PetBody[] }
export const roomViewOf = (s: Save): RoomView => ({ placed: s.placed, floor: s.floor, wall: s.wall, pets: s.pets.filter((p) => p.place === 'room').map(bodyOf) })

/** Visiting someone else's room */
export type Visit = { id: string; name: string; look: Profile | null; room: RoomView }

/** Things that only matter while playing: edit mode, what's selected, what's being placed */
export type Session = {
  mode: 'play' | 'edit'
  selected: string | null
  /** An item being placed or moved, following the pointer */
  ghost: (Placed & { valid: boolean; moving?: string }) | null
  /** The activity your character is doing (started = when it began in ms, 0 while still walking there) */
  doing: { uid: string; act: string; started: number; seconds: number; earned: number; total: number } | null
  /** Whose room you're in, when it isn't your own */
  visit: Visit | null
  /** Today's Heart limit (no limit now: each activity pays once a day instead) */
  cap: number
}

const KEY = 'pocketroom:v1'

// The server's clock, once known. Changing the phone's clock then can't start a new day early.
let skew = 0
export const setServerTime = (ms: number) => void (skew = ms - Date.now())
export const now = () => Date.now() + skew

export const today = () => {
  const d = new Date(now())
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** A brand-new game: starter room, no character yet, no pets */
export const freshSave = (): Save => fresh()

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
  profile: null,
  clothes: STARTER_CLOTHES,
  home: null,
  pets: [],
  deliveries: [],
  spins: { day: '', pity: { sinceMythical: 0, sinceDivine: 0 }, birthday: 0, monthsary: '', seasonal: [] },
  adopting: null,
  birthdayGift: 0,
  owner: null,
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
// Local testing only (npm run dev): plenty of Hearts to try everything. Never in the live build.
if (import.meta.env.DEV) save = { ...save, hearts: 999_999 }
let session: Session = { mode: 'play', selected: null, ghost: null, doing: null, visit: null, cap: DAILY_CAP }
const listeners = new Set<() => void>()
let timer = 0

const emit = () => listeners.forEach((l) => l())

const saveWatchers = new Set<() => void>()
/** Hear about every change to the saved game (cloud sync uses this). Returns a function that stops listening. */
export const subscribeSave = (fn: () => void) => {
  saveWatchers.add(fn)
  return () => void saveWatchers.delete(fn)
}

export function setSave(fn: (s: Save) => Save) {
  save = fn(save)
  emit()
  saveWatchers.forEach((w) => w())
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

/** Hear about every change to the game or the session (live features use this to follow where you are) */
export const watchGame = subscribe

export const useSave = <T,>(pick: (s: Save) => T) => useSyncExternalStore(subscribe, () => pick(save))
export const useSession = <T,>(pick: (s: Session) => T) => useSyncExternalStore(subscribe, () => pick(session))
export const getSave = () => save
export const getSession = () => session

/** The room on screen: someone else's while visiting, otherwise yours */
export const getPlaced = () => session.visit?.room.placed ?? save.placed
export const usePlaced = () => useSyncExternalStore(subscribe, getPlaced)
export const useFloor = () => useSyncExternalStore(subscribe, () => session.visit?.room.floor ?? save.floor)
export const useWall = () => useSyncExternalStore(subscribe, () => session.visit?.room.wall ?? save.wall)
export const setCap = (cap: number) => session.cap !== cap && setSession((s) => ({ ...s, cap }))

/** A new day (local midnight) clears today's Heart count and activity uses. Only forward: winding the clock back never resets it. */
export function rollDay() {
  if (save.day < today()) setSave((s) => ({ ...s, day: today(), earnedToday: 0, uses: {} }))
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
  const room = Math.max(0, session.cap - save.earnedToday)
  const got = Math.min(n, room)
  if (got > 0) setSave((s) => ({ ...s, hearts: s.hearts + got, earnedToday: s.earnedToday + got }))
  return got
}

export function spendUse(act: string) {
  rollDay()
  setSave((s) => ({ ...s, uses: { ...s.uses, [act]: (s.uses[act] ?? 0) + 1 } }))
}

export const setMuted = (muted: boolean) => setSave((s) => ({ ...s, muted }))

// Hearts from pets (feeding, petting) and gifts. Living as a couple they go into the shared jar,
// which the shared-home code handles by registering itself here.
let bonusSink: ((n: number) => boolean) | null = null
export const setBonusSink = (fn: (n: number) => boolean) => void (bonusSink = fn)
export function addBonus(n: number) {
  if (n <= 0) return
  if (bonusSink?.(n)) return
  setSave((s) => ({ ...s, hearts: s.hearts + n }))
}

export const setProfile = (profile: Profile) => setSave((s) => ({ ...s, profile }))

export function buyClothing(id: string) {
  const item = CLOTHING[id]
  if (save.clothes.includes(id) || save.hearts < item.price) return false
  setSave((s) => ({ ...s, hearts: s.hearts - item.price, clothes: [...s.clothes, id] }))
  return true
}

/** Put on (or, with null, take off) a piece of clothing. Tops, bottoms and shoes can't be taken off. */
export function wear(slot: Slot, id: string | null) {
  setSave((s) => (s.profile ? { ...s, profile: { ...s.profile, outfit: { ...s.profile.outfit, [slot]: id } } } : s))
}

/**
 * "Delete everything": a fresh start for the room, Hearts and clothes. Your character, your pets and their
 * deliveries stay. Not while living together, because the room and jar belong to both of you.
 */
export function resetProgress() {
  if (save.home) return false
  const f = fresh()
  setSave((s) => ({
    ...s,
    placed: f.placed,
    storage: f.storage,
    hearts: f.hearts,
    earnedToday: 0,
    uses: {},
    floor: f.floor,
    wall: f.wall,
    owned: f.owned,
    clothes: f.clothes,
    profile: s.profile ? { ...s.profile, outfit: DEFAULT_OUTFIT } : s.profile,
  }))
  setSession((s) => ({ ...s, mode: 'play', selected: null, ghost: null }))
  return true
}

/** Forget the game saved on this device (after deleting the account, or a guest starting over) */
export function wipeDevice() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing saved here
  }
}

/** Swap in a saved game that came from the player's account */
export function replaceSave(next: Save) {
  save = { ...fresh(), ...next }
  emit()
  try {
    localStorage.setItem(KEY, JSON.stringify(save))
  } catch {
    // Kept in memory for this visit
  }
}
