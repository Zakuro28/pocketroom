import { coupleOf, getTogether } from '../lib/together'
import {
  FOSTER_SLOTS,
  ROOM_SLOTS,
  SPECIES_BY_ID,
  dailyTier,
  eventToday,
  feedHearts,
  isBirthday,
  isMonthsary,
  makePet,
  nextPity,
  randomSpecies,
  specialTier,
  type Pet,
  type Tier,
} from './pets'
import { addBonus, getSave, setSave, today, uid, type Delivery } from './store'

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
  if (couple && isMonthsary(couple.started_at, d) && spins.monthsary !== d.slice(0, 7)) {
    spins.monthsary = d.slice(0, 7)
    add.push({ id: uid(), kind: 'monthsary' })
  }
  const ev = eventToday(d)
  const key = ev ? `${year}-${ev.id}` : ''
  if (ev && !spins.seasonal.includes(key) && !s.deliveries.some((x) => x.kind === 'seasonal' && x.event === ev.id)) {
    spins.seasonal = [...spins.seasonal, key]
    add.push({ id: uid(), kind: 'seasonal', event: ev.id })
  }

  if (!add.length && spins.day === s.spins.day) return
  setSave((x) => ({ ...x, spins, deliveries: [...x.deliveries, ...add] }))
}

export type Roll = { pet: Pet; tier: Tier; delivery: Delivery; full: boolean }

/** Open a delivery: decide the pet now (so closing the page mid-spin can't re-roll it) and add it to your pets */
export function rollDelivery(id: string): Roll | null {
  const s = getSave()
  const delivery = s.deliveries.find((x) => x.id === id)
  if (!delivery) return null
  const daily = delivery.kind === 'daily'
  const tier: Tier = delivery.kind === 'seasonal' ? 'seasonal' : daily ? dailyTier(s.spins.pity) : specialTier()
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
  return { pet, tier, delivery, full }
}

/** Foster care was full: this foster pet is adopted by a new family and leaves */
export function adoptAway(uidToGo: string) {
  setSave((s) => ({ ...s, pets: s.pets.filter((p) => !(p.uid === uidToGo && p.place === 'foster')), adopting: null }))
}

export const roomPets = (pets: Pet[]) => pets.filter((p) => p.place === 'room')
export const fosterPets = (pets: Pet[]) => pets.filter((p) => p.place === 'foster')

/** Feed a pet in the room: once a day, its Hearts land on top of the daily cap */
export function feedPet(uidToFeed: string) {
  const s = getSave()
  const p = s.pets.find((x) => x.uid === uidToFeed)
  const d = today()
  if (!p || p.place !== 'room' || p.fed === d) return 0
  const n = feedHearts(p)
  setSave((x) => ({ ...x, pets: x.pets.map((q) => (q.uid === uidToFeed ? { ...q, fed: d } : q)) }))
  addBonus(n)
  return n
}

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
