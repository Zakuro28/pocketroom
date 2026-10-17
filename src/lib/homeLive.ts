import { useSyncExternalStore } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { me as myself, type Pose } from '../game/character'
import { getSave, getSession, watchGame } from '../game/store'
import { supabase } from './supa'
import { coupleOf, getTogether, otherOf, watchTogether } from './together'
import { getTour, relayHousemate, setTourRelay, type Peer } from './tour'

/**
 * A couple at home together sees each other move live: walking, sitting, napping.
 * While both are in the shared home (not visiting or on a tour), each player sends where their character is
 * about ten times a second over a Supabase Realtime channel for the couple. Nothing is stored.
 */

/** Where your partner's character is right now; the scene reads this every frame */
export const partnerAt = { x: 0, z: 0, y: 0, rotY: 0, pose: 'stand' as Pose }

let here = false
const listeners = new Set<() => void>()
const setHere = (v: boolean) => {
  if (here === v) return
  here = v
  listeners.forEach((l) => l())
}
/** True while your partner is in the shared home with you and their moves are coming in */
export const usePartnerHere = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => void listeners.delete(l)
    },
    () => here,
  )

/** A friend touring your shared home, invited by your partner: their moves come through your partner */
export const visitorAt = { x: 0, z: 0, y: 0, rotY: 0, pose: 'stand' as Pose }
let visitor: Peer | null = null
const visitorListeners = new Set<() => void>()
const setVisitor = (v: Peer | null) => {
  if (visitor?.id === v?.id) return
  visitor = v
  visitorListeners.forEach((l) => l())
}
export const useVisitor = () =>
  useSyncExternalStore(
    (l) => {
      visitorListeners.add(l)
      return () => void visitorListeners.delete(l)
    },
    () => visitor,
  )

/** Your partner, as a tour guest needs to draw them */
function partnerPeer(id: string): Peer {
  const c = getTogether().cards[id]
  return { id, name: c?.name || 'Partner', look: c?.look ?? null }
}

let channel: RealtimeChannel | null = null
let joinedFor: string | null = null
let connected = false
let posTimer = 0
let lastPos = ''
let lastSent = 0

function sendPos(force = false) {
  if (!channel || !connected) return
  const p = { x: +myself.x.toFixed(3), z: +myself.z.toFixed(3), y: +myself.y.toFixed(3), rotY: +myself.rotY.toFixed(2), pose: myself.pose }
  const key = JSON.stringify(p)
  const t = Date.now()
  // Only what changed, plus a heartbeat every couple of seconds
  if (!force && key === lastPos && t - lastSent < 2000) return
  lastPos = key
  lastSent = t
  void channel.send({ type: 'broadcast', event: 'pos', payload: { ...p, from: getTogether().me } })
}

function leave() {
  clearInterval(posTimer)
  if (channel) void supabase?.removeChannel(channel)
  channel = null
  joinedFor = null
  connected = false
  setHere(false)
  setVisitor(null)
}

function join(link: string, me: string, partner: string) {
  if (!supabase) return
  joinedFor = link
  channel = supabase
    .channel(`home-${link}`, { config: { broadcast: { self: false }, presence: { key: me } } })
    .on('broadcast', { event: 'pos' }, ({ payload }) => {
      const p = payload as typeof partnerAt & { from: string }
      if (p.from !== partner) return
      Object.assign(partnerAt, { x: p.x, z: p.z, y: p.y, rotY: p.rotY, pose: p.pose })
      setHere(true)
      // Hosting a tour: the guest sees your partner too
      relayHousemate(partnerPeer(partner), partnerAt)
    })
    .on('broadcast', { event: 'visitor' }, ({ payload }) => {
      const p = payload as typeof visitorAt & { from: string; who: Peer }
      if (p.from !== partner) return
      Object.assign(visitorAt, { x: p.x, z: p.z, y: p.y, rotY: p.rotY, pose: p.pose })
      setVisitor(p.who)
    })
    .on('broadcast', { event: 'visitor-gone' }, ({ payload }) => (payload as { from: string }).from === partner && setVisitor(null))
    // They just came home (or opened the game): tell them where you are
    .on('presence', { event: 'join' }, ({ key }) => key === partner && sendPos(true))
    .on('presence', { event: 'leave' }, ({ key }) => {
      if (key !== partner) return
      setHere(false)
      setVisitor(null)
      relayHousemate(null)
    })
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED' || !channel) return
      connected = true
      void channel.track({ id: me })
      sendPos(true)
    })
  clearInterval(posTimer)
  posTimer = window.setInterval(sendPos, 100)
}

/** Be in the couple's channel exactly while you're in the shared home */
function sync() {
  const t = getTogether()
  const couple = coupleOf(t)
  // Touring someone else's room takes you out of the home; hosting a tour keeps you in it
  const tour = getTour()
  const away = tour.phase === 'touring' && !tour.hosting
  const atHome = !!couple && !!t.me && getSave().home === couple.id && !getSession().visit && !away
  const link = atHome ? couple!.id : null
  if (link === joinedFor) return
  leave()
  if (link && t.me) join(link, t.me, otherOf(couple!))
}

// Hosting a tour at home: pass the guest's moves to your partner
setTourRelay({
  moved: (guest, at) => {
    if (!channel || !connected) return
    void channel.send({ type: 'broadcast', event: 'visitor', payload: { x: at.x, z: at.z, y: at.y, rotY: at.rotY, pose: at.pose, who: guest, from: getTogether().me } })
  },
  gone: () => {
    if (channel && connected) void channel.send({ type: 'broadcast', event: 'visitor-gone', payload: { from: getTogether().me } })
  },
})

watchTogether(sync)
watchGame(sync)
window.addEventListener('pagehide', leave)
