import { idle, me, walkNear } from './character'
import { careForPartnerPet, feedPet, isDone, petPet } from './petActions'
import type { PetBody } from './pets'
import { getPlaced, getSave, getSession, setSession } from './store'
import type { Care } from '../lib/together'
import { heart, nope } from '../lib/sound'

/**
 * Feeding and petting happen in the room: your character walks over to the pet, the pet stops and sits down
 * happily, and after a short moment the Hearts arrive. One at a time, like activities.
 */

/** Where each pet in the room is right now (the scene writes this every frame) */
export const petSpots = new Map<string, { x: number; z: number }>()

/** How long the pet sits while being looked after, and when the Hearts arrive (seconds) */
const PAY_AT = 1.4
const DONE_AT = 3

let job: { pet: PetBody; kind: Care; partner: boolean; say: (m: string) => void; sitSince: number; paid: boolean; started: number; tries: number } | null = null

/** Start feeding or petting a pet. False if it can't start (busy, already done, or not in the room). */
export function startCare(pet: PetBody, kind: Care, partner: boolean, say: (m: string) => void) {
  const s = getSession()
  if (s.caring || s.doing) {
    nope()
    say(s.caring ? `One thing at a time ✨ You’re looking after ${s.caring.name}` : 'One thing at a time ✨ Tap ✕ to stop first')
    return false
  }
  // Your own pets keep their fed/petted days in your save; a partner's pet only in the shared home
  const mine = partner ? null : getSave().pets.find((p) => p.uid === pet.uid)
  if (isDone(mine ?? pet, kind)) {
    nope()
    say(`${pet.name} was already ${kind === 'fed' ? 'fed' : 'petted'} today 💞`)
    return false
  }
  const spot = petSpots.get(pet.uid)
  // Not in the room on screen (or no way to reach it): look after it straight away
  if (!spot || !walkNear(spot.x, spot.z, getPlaced())) return pay(pet, kind, partner, say)
  job = { pet, kind, partner, say, sitSince: 0, paid: false, started: 0, tries: 0 }
  setSession((x) => ({ ...x, caring: { uid: pet.uid, kind, name: pet.name, phase: 'walk' } }))
  return true
}

function pay(pet: PetBody, kind: Care, partner: boolean, say: (m: string) => void) {
  const n = partner ? careForPartnerPet(kind, pet) : kind === 'fed' ? feedPet(pet.uid) : petPet(pet.uid)
  if (!n) {
    nope()
    say(`${pet.name} was already ${kind === 'fed' ? 'fed' : 'petted'} today 💞`)
    return false
  }
  heart()
  say(kind === 'fed' ? `${pet.name} enjoyed that! +${n} 💗` : `${pet.name} loved the pets! +${n} 💗`)
  return true
}

/** Stop looking after a pet (you walked away) */
export function stopCare() {
  job = null
  if (getSession().caring) setSession((x) => ({ ...x, caring: null }))
}

/**
 * Called every frame by the pet being looked after, with where it is. Returns what the pet should do:
 * 'wait' (stand still, facing you), 'sit' (sit happily), or null (carry on as usual).
 */
export function careTick(uid: string, x: number, z: number, now: number): 'wait' | 'sit' | null {
  if (!job || job.pet.uid !== uid) return null
  const dist = Math.hypot(me.x - x, me.z - z)
  job.started ||= now
  if (!job.sitSince) {
    if (!idle()) return 'wait'
    // Arrived but not quite close enough (the pet was still moving): walk a little closer, twice at most
    if (dist > 1 && job.tries < 2 && now - job.started < 20) {
      job.tries++
      if (walkNear(x, z, getPlaced())) return 'wait'
    }
    // You walked off somewhere else, or it's taking too long: cancelled
    if (dist > 1.6 || now - job.started > 20) {
      stopCare()
      return null
    }
    job.sitSince = now
    me.rotY = Math.atan2(x - me.x, z - me.z)
    setSession((s) => (s.caring ? { ...s, caring: { ...s.caring, phase: 'sit' } } : s))
  }
  const t = now - job.sitSince
  if (!job.paid && t >= PAY_AT) {
    job.paid = true
    pay(job.pet, job.kind, job.partner, job.say)
  }
  if (t >= DONE_AT) {
    stopCare()
    return null
  }
  return 'sit'
}
