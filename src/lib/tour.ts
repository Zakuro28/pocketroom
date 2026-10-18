import { useSyncExternalStore } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { cancel, me as myself, settle, type Pose } from '../game/character'
import type { Profile } from '../game/look'
import type { PetBody } from '../game/pets'
import { CELL, DOOR } from '../game/grid'
import { getSave, getSession, roomViewOf, setSession, subscribeSave, type RoomView } from '../game/store'
import { supabase } from './supa'
import { createVoice, type Line, type Signal, type Voice } from './voice'
import { coupleOf, getTogether, leaveVisit, notify, otherOf, watchTogether } from './together'

/**
 * Tours: a live visit. The one who presses Tour hosts in their room; the friend who joins is moved there.
 * Both walk around in real time, chat, and can talk by voice. Nothing is stored: it all goes over
 * Supabase Realtime (an inbox channel per player for invites, one channel per tour while it lasts),
 * and voice goes straight between the two players (WebRTC), with the tour channel passing the handshake.
 */

/** The other player on a tour, and the pets they bring along */
export type Peer = { id: string; name: string; look: Profile | null; pets?: PetBody[] }
export type ChatLine = { id: number; from: string; name: string; text: string }
type Phase = 'idle' | 'inviting' | 'invited' | 'touring'

type TourState = {
  phase: Phase
  tour: string | null
  /** True when the tour is in your room */
  hosting: boolean
  peer: Peer | null
  /** True once the other player's character is in the room */
  here: boolean
  chat: ChatLine[]
  /** The latest line each player said, shown over their head for a few seconds */
  bubbles: Record<string, string>
  mic: 'off' | 'on' | 'muted'
  /** Their voice: playing, or waiting for a tap (phones only play sound after a tap) */
  hearing: 'none' | 'live' | 'tap'
  /** How the voice line is doing */
  line: Line
  /** Touring a couple's home: the host's partner, who's home too (passed along by the host) */
  extra: Peer | null
}

const idle: TourState = { phase: 'idle', tour: null, hosting: false, peer: null, here: false, chat: [], bubbles: {}, mic: 'off', hearing: 'none', line: 'idle', extra: null }
let state: TourState = idle
const listeners = new Set<() => void>()
const set = (patch: Partial<TourState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}
export const useTour = <T,>(pick: (s: TourState) => T) => useSyncExternalStore(subscribe, () => pick(state))
export const getTour = () => state

/** Where the other player's character is, updated many times a second. Kept out of React; the scene reads it every frame. */
export const them = { x: 0, z: 0, y: 0, rotY: 0, pose: 'stand' as Pose }

const myId = () => getTogether().me
const myName = () => getSave().profile?.name || 'Friend'
const INVITE_MS = 60_000
const MAX_CHAT = 200

// ---- Invites: everyone listens on their own inbox ----

let inbox: RealtimeChannel | null = null
let inboxFor: string | null = null
let inviteTimer = 0

/** Only people you're connected to can invite you */
const isMine = (id: string) => getTogether().links.some((l) => l.status === 'active' && otherOf(l) === id)

/** Send one message to someone's inbox (a single web request; no need to join their channel) */
async function post(to: string, event: string, payload: Record<string, unknown>) {
  if (!supabase) return
  const ch = supabase.channel(`inbox-${to}`)
  await ch.httpSend(event, { ...payload, from: myId() }).catch(() => {})
  void supabase.removeChannel(ch)
}

function openInbox(id: string) {
  if (!supabase) return
  inboxFor = id
  inbox = supabase
    .channel(`inbox-${id}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'invite' }, ({ payload }) => {
      const p = payload as { from: string; tour: string; name: string; look: Profile | null }
      if (!isMine(p.from)) return
      if (state.phase !== 'idle') return void post(p.from, 'busy', { tour: p.tour })
      set({ phase: 'invited', tour: p.tour, hosting: false, peer: { id: p.from, name: p.name || 'Friend', look: p.look } })
      clearTimeout(inviteTimer)
      inviteTimer = window.setTimeout(() => state.phase === 'invited' && state.tour === p.tour && set(idle), INVITE_MS)
    })
    .on('broadcast', { event: 'cancel' }, ({ payload }) => {
      const p = payload as { tour: string }
      if (state.phase === 'invited' && state.tour === p.tour) {
        notify(`${state.peer?.name ?? 'They'} called off the tour`)
        set(idle)
      }
    })
    .on('broadcast', { event: 'accept' }, ({ payload }) => {
      const p = payload as { tour: string; from: string }
      if (state.phase !== 'inviting' || state.tour !== p.tour || state.peer?.id !== p.from) return
      clearTimeout(inviteTimer)
      join(p.tour, true)
    })
    .on('broadcast', { event: 'decline' }, ({ payload }) => {
      const p = payload as { tour: string }
      if (state.phase !== 'inviting' || state.tour !== p.tour) return
      clearTimeout(inviteTimer)
      notify(`${state.peer?.name ?? 'They'} can’t tour right now`)
      set(idle)
    })
    .on('broadcast', { event: 'busy' }, ({ payload }) => {
      const p = payload as { tour: string }
      if (state.phase !== 'inviting' || state.tour !== p.tour) return
      clearTimeout(inviteTimer)
      notify(`${state.peer?.name ?? 'They'}’re busy right now, try again soon`)
      set(idle)
    })
    .subscribe()
}

function closeInbox() {
  if (inbox) void supabase?.removeChannel(inbox)
  inbox = null
  inboxFor = null
}

// Follow sign-in and sign-out: listen for invites while signed in, and end any tour on sign-out
watchTogether(() => {
  const id = myId()
  if (id === inboxFor) return
  if (state.phase !== 'idle') end(false)
  closeInbox()
  if (id) openInbox(id)
})

/** Invite a friend or family member to tour your room */
export function invite(peer: Peer) {
  if (!supabase || !myId()) return 'Sign in first'
  if (state.phase !== 'idle') return 'You’re already in a tour'
  const tour = crypto.randomUUID()
  set({ ...idle, phase: 'inviting', tour, hosting: true, peer })
  void post(peer.id, 'invite', { tour, name: myName(), look: getSave().profile })
  clearTimeout(inviteTimer)
  inviteTimer = window.setTimeout(() => {
    if (state.phase !== 'inviting' || state.tour !== tour) return
    void post(peer.id, 'cancel', { tour })
    notify(`${peer.name} didn’t answer this time`)
    set(idle)
  }, INVITE_MS)
  return null
}

export function cancelInvite() {
  if (state.phase !== 'inviting' || !state.peer || !state.tour) return
  clearTimeout(inviteTimer)
  void post(state.peer.id, 'cancel', { tour: state.tour })
  set(idle)
}

/** Answer an invite: join their room, or say no */
export function answer(yes: boolean) {
  if (state.phase !== 'invited' || !state.peer || !state.tour) return
  clearTimeout(inviteTimer)
  void post(state.peer.id, yes ? 'accept' : 'decline', { tour: state.tour })
  if (yes) join(state.tour, false)
  else set(idle)
}

// ---- The tour itself ----

let room: RealtimeChannel | null = null
/** True once the tour channel is connected; messages before that go as single web requests */
let joined = false
let posTimer = 0
let lastPos = ''
let lastSent = 0
let unwatchRoom: (() => void) | null = null
let roomTimer = 0
let nextLine = 0
const bubbleTimers: Record<string, number> = {}

/** Your room as a guest sees it. In a shared home, your partner's pets live here too. */
function roomView(): RoomView {
  const s = getSave()
  const view = roomViewOf(s)
  const t = getTogether()
  const couple = coupleOf(t)
  const theirs = couple && s.home === couple.id ? (t.cards[otherOf(couple)]?.room?.pets ?? []) : []
  return { ...view, pets: [...(view.pets ?? []), ...theirs] }
}

/** Where the host's partner is, for a guest touring a couple's home */
export const them2 = { x: 0, z: 0, y: 0, rotY: 0, pose: 'stand' as Pose }

// Touring a couple's home: the host passes the guest's moves to their partner (through the home's live
// channel) and the partner's moves to the guest, so all three see each other.
type Relay = { moved: (guest: Peer, at: typeof them) => void; gone: () => void }
let relay: Relay | null = null
export const setTourRelay = (r: Relay) => void (relay = r)

/** Host only: pass your partner's position (or that they left, with null) to the guest */
export function relayHousemate(who: Peer | null, at?: typeof them2) {
  if (state.phase !== 'touring' || !state.hosting || !room || !joined) return
  if (!who || !at) return say('pos2-gone', {})
  say('pos2', { x: at.x, z: at.z, y: at.y, rotY: at.rotY, pose: at.pose, who })
}

function say(event: string, payload: Record<string, unknown>) {
  if (!room) return
  const body = { ...payload, from: myId() }
  if (joined) void room.send({ type: 'broadcast', event, payload: body })
  else void room.httpSend(event, body).catch(() => {})
}

function sendPos(force = false) {
  if (!joined) return
  const p = { x: +myself.x.toFixed(3), z: +myself.z.toFixed(3), y: +myself.y.toFixed(3), rotY: +myself.rotY.toFixed(2), pose: myself.pose }
  const key = JSON.stringify(p)
  const t = Date.now()
  // Only what changed, plus a heartbeat every couple of seconds
  if (!force && key === lastPos && t - lastSent < 2000) return
  lastPos = key
  lastSent = t
  say('pos', p)
}

/** Show what someone said over their head for a few seconds (tours and the shared home both use this) */
export function showBubble(id: string, text: string) {
  set({ bubbles: { ...state.bubbles, [id]: text } })
  clearTimeout(bubbleTimers[id])
  bubbleTimers[id] = window.setTimeout(() => {
    const { [id]: _gone, ...rest } = state.bubbles
    void _gone
    set({ bubbles: rest })
  }, 6000)
}

function addLine(from: string, name: string, text: string) {
  set({ chat: [...state.chat.slice(-49), { id: nextLine++, from, name, text }] })
  showBubble(from, text)
}

/** Guests: step into the host's room */
function enterRoom(view: RoomView) {
  const peer = state.peer
  if (!peer) return
  const first = getSession().visit?.id !== peer.id
  setSession((s) => ({ ...s, mode: 'play', selected: null, ghost: null, visit: { id: peer.id, name: peer.name, look: peer.look, room: view } }))
  if (first) {
    // Guests come in through the front door
    cancel()
    Object.assign(myself, { x: 1.5 * CELL, z: ((DOOR.from + DOOR.to) / 2) * CELL, y: 0, rotY: Math.PI / 2, pose: 'stand', path: [], finish: null })
  }
  settle(view.placed)
}

function join(tour: string, hosting: boolean) {
  if (!supabase) return
  const me = myId()
  const peer = state.peer
  if (!me || !peer) return
  // The host tours their own room, so step back home (and out of decorating) first
  if (hosting) {
    leaveVisit()
    setSession((s) => ({ ...s, mode: 'play', selected: null, ghost: null }))
  }
  set({ phase: 'touring', tour, hosting, here: false, chat: [], bubbles: {} })
  room = supabase
    .channel(`tour-${tour}`, { config: { broadcast: { self: false }, presence: { key: me } } })
    .on('broadcast', { event: 'pos' }, ({ payload }) => {
      const p = payload as typeof them & { from: string }
      if (p.from !== peer.id) return
      Object.assign(them, { x: p.x, z: p.z, y: p.y, rotY: p.rotY, pose: p.pose })
      if (!state.here) set({ here: true })
      if (hosting) relay?.moved(peer, them)
    })
    .on('broadcast', { event: 'pos2' }, ({ payload }) => {
      const p = payload as typeof them2 & { from: string; who: Peer }
      if (hosting || p.from !== peer.id) return
      Object.assign(them2, { x: p.x, z: p.z, y: p.y, rotY: p.rotY, pose: p.pose })
      if (state.extra?.id !== p.who.id) set({ extra: p.who })
    })
    .on('broadcast', { event: 'pos2-gone' }, ({ payload }) => {
      if (!hosting && (payload as { from: string }).from === peer.id) set({ extra: null })
    })
    .on('broadcast', { event: 'room' }, ({ payload }) => {
      const p = payload as { from: string; room: RoomView }
      if (!hosting && p.from === peer.id) enterRoom(p.room)
    })
    .on('broadcast', { event: 'chat' }, ({ payload }) => {
      const p = payload as { from: string; text: string }
      if (p.from === peer.id) addLine(peer.id, peer.name, String(p.text).slice(0, MAX_CHAT))
    })
    .on('broadcast', { event: 'hello' }, ({ payload }) => {
      // The other side just arrived: tell them where you are (and, hosting, what your room looks like)
      if ((payload as { from: string }).from !== peer.id) return
      if (hosting) say('room', { room: roomView() })
      sendPos(true)
    })
    .on('broadcast', { event: 'rtc' }, ({ payload }) => {
      const p = payload as { from: string } & Signal
      if (p.from === peer.id) void voice?.onSignal(p)
    })
    .on('broadcast', { event: 'bye' }, ({ payload }) => {
      if ((payload as { from: string }).from !== peer.id) return
      notify(hosting ? `${peer.name} left the tour` : `${peer.name} ended the tour 🏠`)
      end(false)
    })
    .on('presence', { event: 'leave' }, ({ key }) => {
      if (key !== peer.id || state.phase !== 'touring') return
      // A dropped connection: give it a moment to come back before calling it over
      window.setTimeout(() => {
        if (state.phase !== 'touring' || !room) return
        if (!(peer.id in room.presenceState())) {
          notify(`${peer.name} lost connection, the tour ended`)
          end(false)
        }
      }, 15_000)
    })
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED' || !room) return
      joined = true
      void room.track({ id: me })
      say('hello', {})
      if (hosting) say('room', { room: roomView() })
      sendPos(true)
    })

  clearInterval(posTimer)
  posTimer = window.setInterval(sendPos, 100)

  if (hosting) {
    // Redecorating while they're here: send the new room
    let last = roomView()
    unwatchRoom = subscribeSave(() => {
      const now = roomView()
      if (now.placed === last.placed && now.floor === last.floor && now.wall === last.wall && JSON.stringify(now.pets) === JSON.stringify(last.pets)) return
      last = now
      clearTimeout(roomTimer)
      roomTimer = window.setTimeout(() => say('room', { room: roomView() }), 300)
    })
  }
  voice = createVoice({ send: (sig) => say('rtc', sig), polite: !hosting, onHearing: (hearing) => set({ hearing }), onLine: (line) => set({ line }) })
}

/** Send a chat line */
export function chat(text: string) {
  const t = text.trim().slice(0, MAX_CHAT)
  const me = myId()
  if (!t || state.phase !== 'touring' || !me) return
  say('chat', { text: t })
  addLine(me, myName(), t)
}

/** End the tour: the guest goes home, the host's room is theirs alone again */
export function end(tell = true) {
  if (state.phase === 'inviting') return void (tell ? cancelInvite() : set(idle))
  if (tell && room) say('bye', {})
  clearTimeout(inviteTimer)
  clearInterval(posTimer)
  clearTimeout(roomTimer)
  unwatchRoom?.()
  unwatchRoom = null
  stopVoice()
  if (room) void supabase?.removeChannel(room)
  room = null
  joined = false
  const wasGuest = state.phase === 'touring' && !state.hosting
  if (state.phase === 'touring' && state.hosting) relay?.gone()
  set(idle)
  if (wasGuest) leaveVisit()
}

// ---- Voice: straight between the two players (see voice.ts) ----

let voice: Voice | null = null

/** Turn your microphone on, or mute and unmute it */
export async function toggleMic() {
  if (state.phase !== 'touring' || !voice) return
  const mic = await voice.toggleMic()
  if (mic) set({ mic })
  else notify('Microphone is blocked. Allow it in your browser to talk 🎙️')
}

/** Phones only play sound after a tap: this is that tap */
export const hear = () => voice?.hear()

function stopVoice() {
  voice?.stop()
  voice = null
}

// Leaving the page ends the tour for both, so nobody is left waiting
window.addEventListener('pagehide', () => state.phase === 'touring' && end(true))
