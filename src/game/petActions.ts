import { careDone, coupleCare, coupleOf, getTogether, livingTogether, type Care } from '../lib/together'
import {
  EVENTS,
  FOSTER_SLOTS,
  GIFTS,
  GIFT_ROUND,
  ROOM_SLOTS,
  SPECIES_BY_ID,
  dailyTier,
  eventToday,
  feedHearts,
  petHearts,
  isBirthday,
  isMonthsary,
  makePet,
  nextPity,
  randomSpecies,
  specialTier,
  type Pet,
  type PetBody,
  type Tier,
} from './pets'
import { BIRTHDAY_GIFT } from './acts'
import { addBonus, getSave, getSession, setSave, today, uid, type Delivery } from './store'

/**
 * What players do with pets: deliveries arriving at the door, rolling them, feeding, and moving
 * pets between the room and foster care. Dates follow the server's clock, so changing the
 * phone's clock can't bring tomorrow's spin early.
 */

/** Put any spins that are due today at the door. Safe to call as often as you like. */
export function checkDeliveries() {
  const s = getSave()
  if (!s.profile) return
  const d = today()
  const year = Number(d.slice(0, 4))
  const add: Delivery[] = []
  const spins = { ...s.spins }

  // A gift for everyone, once per gift round (see GIFT_ROUND and GIFTS); a round past its last day is skipped
  for (let round = (spins.gift ?? 0) + 1; round <= GIFT_ROUND; round++) {
    const g = GIFTS[round]
    if (!g?.until || d <= g.until) add.push({ id: uid(), kind: 'gift', round })
  }
  spins.gift = Math.max(spins.gift ?? 0, GIFT_ROUND)
  // One free spin a day (an unrolled one waits; they don't pile up)
  if (spins.day < d) {
    spins.day = d
    if (!s.deliveries.some((x) => x.kind === 'daily')) add.push({ id: uid(), kind: 'daily' })
  }
  if (isBirthday(s.profile.birthday, d) && spins.birthday !== year) {
    spins.birthday = year
    add.push({ id: uid(), kind: 'birthday' })
  }
  const couple = coupleOf(getTogether())
  // Monthsary: every month on the couple's anniversary (or the day they became a couple, if none is set)
  if (couple && isMonthsary(couple.anniversary || couple.started_at, d) && spins.monthsary !== d.slice(0, 7)) {
    spins.monthsary = d.slice(0, 7)
    add.push({ id: uid(), kind: 'monthsary' })
  }
  const ev = eventToday(d)
  const key = ev ? `${year}-${ev.id}` : ''
  if (ev && !spins.seasonal.includes(key) && !s.deliveries.some((x) => x.kind === 'seasonal' && x.event === ev.id)) {
    spins.seasonal = [...spins.seasonal, key]
    add.push({ id: uid(), kind: 'seasonal', event: ev.id })
  }

  add.push(...testDeliveries([...s.deliveries, ...add]))
  if (!add.length && spins.day === s.spins.day && spins.gift === s.spins.gift) return
  setSave((x) => ({ ...x, spins, deliveries: [...x.deliveries, ...add] }))
}

/** Birthday Hearts, once a year on your birthday. Returns how many arrived (0 if none today). */
export function checkBirthdayGift() {
  const s = getSave()
  const d = today()
  const year = Number(d.slice(0, 4))
  if (!s.profile || !isBirthday(s.profile.birthday, d) || s.birthdayGift === year) return 0
  setSave((x) => ({ ...x, birthdayGift: year }))
  addBonus(BIRTHDAY_GIFT)
  return BIRTHDAY_GIFT
}

export type Roll = { pet: Pet; tier: Tier; delivery: Delivery; full: boolean; /** Hearts that came with a gift */ hearts: number }

/** Open a delivery: decide the pet now (so closing the page mid-spin can't re-roll it) and add it to your pets */
export function rollDelivery(id: string): Roll | null {
  const s = getSave()
  const delivery = s.deliveries.find((x) => x.id === id)
  if (!delivery) return null
  // A gift rolls like a daily pet (and counts toward the guarantees), unless its round sets the tier
  const gift = delivery.kind === 'gift' ? GIFTS[delivery.round ?? 1] : undefined
  const daily = (delivery.kind === 'daily' || delivery.kind === 'gift') && !gift?.tier && !delivery.tier
  const tier: Tier = delivery.tier ?? gift?.tier ?? (delivery.kind === 'seasonal' ? 'seasonal' : daily ? dailyTier(s.spins.pity) : specialTier())
  const sp = randomSpecies(tier, delivery.event)
  const pet = makePet(sp, today(), uid())
  const inRoom = s.pets.filter((p) => p.place === 'room').length
  const inFoster = s.pets.filter((p) => p.place === 'foster').length
  pet.place = inRoom < ROOM_SLOTS ? 'room' : 'foster'
  const full = pet.place === 'foster' && inFoster >= FOSTER_SLOTS
  setSave((x) => ({
    ...x,
    pets: [...x.pets, pet],
    deliveries: x.deliveries.filter((d) => d.id !== id),
    spins: { ...x.spins, pity: nextPity(x.spins.pity, tier, daily) },
    adopting: full ? pet.uid : x.adopting,
  }))
  // Gift Hearts come with the box. Living together they go into the jar, which takes at most 1,500 at a time.
  const hearts = gift?.hearts ?? 0
  for (let left = hearts; left > 0; left -= 1500) addBonus(Math.min(1500, left))
  // Local testing: put the next one of each kind at the door straight away
  if (import.meta.env.DEV) checkDeliveries()
  return { pet, tier, delivery, full, hearts }
}

/** Local testing only (npm run dev): one of every kind of delivery is always waiting. Never in the live build. */
function testDeliveries(have: Delivery[]): Delivery[] {
  if (!import.meta.env.DEV) return []
  const kinds: Delivery['kind'][] = ['daily', 'birthday', 'monthsary', 'seasonal']
  return kinds
    .filter((k) => !have.some((d) => d.kind === k))
    .map((k) => ({ id: uid(), kind: k, ...(k === 'seasonal' ? { event: EVENTS[Math.floor(Math.random() * EVENTS.length)].id } : {}) }))
}

/** Developers only: put a pet of this tier at the door, to roll like any delivery */
export function devPet(tier: NonNullable<Delivery['tier']>) {
  setSave((s) => ({ ...s, deliveries: [...s.deliveries, { id: uid(), kind: 'gift', tier }] }))
}

/** Foster care was full: this foster pet is adopted by a new family and leaves */
export function adoptAway(uidToGo: string) {
  setSave((s) => ({ ...s, pets: s.pets.filter((p) => !(p.uid === uidToGo && p.place === 'foster')), adopting: null }))
}

export const roomPets = (pets: Pet[]) => pets.filter((p) => p.place === 'room')
export const fosterPets = (pets: Pet[]) => pets.filter((p) => p.place === 'foster')

/** Has this pet been fed (or petted) today, by you or (living together) your partner? */
export function isDone(p: PetBody & { fed?: string; petted?: string }, kind: Care) {
  // Developers testing without daily limits (the shared home's server still counts once a day)
  if (getSession().devFree && !livingTogether()) return false
  return (kind === 'fed' ? p.fed : p.petted) === today() || careDone(kind, p.uid)
}

/**
 * Feed or pet a pet, once a day each. Living together, it goes through the couple's jar (and your partner can do
 * it too, for both of your pets); on your own the Hearts land in your Hearts. Returns how many Hearts it gives.
 */
function care(kind: Care, p: PetBody & { fed?: string; petted?: string }, own: boolean) {
  if (isDone(p, kind)) return 0
  const together = livingTogether()
  if (!own && !together) return 0
  const n = kind === 'fed' ? feedHearts(p) : petHearts(p)
  const d = today()
  if (own) setSave((x) => ({ ...x, pets: x.pets.map((q) => (q.uid === p.uid ? { ...q, [kind]: d } : q)) }))
  if (together) coupleCare(kind, p.uid, n)
  else addBonus(n)
  return n
}

const roomPet = (uid: string) => getSave().pets.find((x) => x.uid === uid && x.place === 'room')

/** Feed one of your room pets */
export function feedPet(uidToFeed: string) {
  const p = roomPet(uidToFeed)
  return p ? care('fed', p, true) : 0
}

/** Pet one of your room pets (separate from feeding) */
export function petPet(uidToPet: string) {
  const p = roomPet(uidToPet)
  return p ? care('petted', p, true) : 0
}

/** Living together: feed or pet one of your partner's pets */
export const careForPartnerPet = (kind: Care, p: PetBody) => care(kind, p, false)

/** Move a pet between the room and foster care (if there's space). Returns an error message, or null. */
export function movePet(uidToMove: string, to: 'room' | 'foster') {
  const s = getSave()
  if (s.adopting) return 'Pick who gets adopted first'
  const count = s.pets.filter((p) => p.place === to).length
  if (to === 'room' && count >= ROOM_SLOTS) return `The room fits ${ROOM_SLOTS} pets. Move one to foster first`
  if (to === 'foster' && count >= FOSTER_SLOTS) return `Foster care is full (${FOSTER_SLOTS})`
  setSave((x) => ({ ...x, pets: x.pets.map((p) => (p.uid === uidToMove ? { ...p, place: to } : p)) }))
  return null
}

/** Swap a room pet and a foster pet in one go */
export function swapPets(roomUid: string, fosterUid: string) {
  setSave((s) => ({
    ...s,
    pets: s.pets.map((p) => (p.uid === roomUid ? { ...p, place: 'foster' } : p.uid === fosterUid ? { ...p, place: 'room' } : p)),
  }))
}

export function renamePet(uidToName: string, name: string) {
  const clean = name.trim().slice(0, 16)
  setSave((s) => ({ ...s, pets: s.pets.map((p) => (p.uid === uidToName ? { ...p, name: clean || SPECIES_BY_ID[p.species]?.name || p.name } : p)) }))
}
