import { useSyncExternalStore } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { DAILY_CAP } from '../game/acts'
import { cancel, settle } from '../game/character'
import type { Profile } from '../game/look'
import { getSave, getSession, now, roomViewOf, setBonusSink, setCap, setSave, setServerTime, setSession, subscribeSave, type RoomView, type Save } from '../game/store'
import { send, supabase } from './supa'
import type { Kind as Sky } from './weather'

/**
 * Playing together: friend codes, requests, couples sharing a home and a Hearts jar, Chemistry, visits and breakups.
 * The rules themselves live in the database (supabase/together.sql); this file asks and keeps the game in step.
 */

export type LinkKind = 'couple' | 'friend' | 'family'
/** No daily limit for couples either (the server only checks each payout is a believable size) */
export const COUPLE_CAP = Number.POSITIVE_INFINITY

export type SharedWeather = { kind: Sky; isDay: boolean; temp: number; place: string | null }
export type Card = { id: string; code: string; name: string; birthday: string | null; look: Profile | null; room: RoomView | null; weather: SharedWeather | null; seen_at: string }
export type Link = { id: string; a: string; b: string; kind: LinkKind; status: 'pending' | 'active' | 'ended'; vote_a: string | null; vote_b: string | null; created_at: string; started_at: string | null; ended_at: string | null; anniversary?: string | null }
type HomeRoom = RoomView & { owned: string[]; storage: Record<string, number> }
export type Home = { link: string; owner: string; room: HomeRoom; room_by: string | null; tz: string; jar: number; day: string | null; earned: number; chem: number; care?: Record<string, string>; couple_gift?: boolean }

type State = { me: string | null; mine: Card | null; links: Link[]; cards: Record<string, Card>; home: Home | null; ready: boolean }

let state: State = { me: null, mine: null, links: [], cards: {}, home: null, ready: false }
const listeners = new Set<() => void>()
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}
export const useTogether = <T,>(pick: (s: State) => T) => useSyncExternalStore(subscribe, () => pick(state))
export const getTogether = () => state
// Local testing only (npm run dev): lets a test pretend to be signed in. Never in the live build.
if (import.meta.env.DEV) (window as unknown as { __together: unknown }).__together = { set: (p: Partial<State>) => set(p) }

/** Hear about every change (tours use this to follow sign-in and sign-out) */
export const watchTogether = subscribe

// Messages for the player (shown as toasts by the app)
const notes = new Set<(msg: string) => void>()
export const onNote = (fn: (msg: string) => void) => {
  notes.add(fn)
  return () => void notes.delete(fn)
}
const note = (msg: string) => notes.forEach((n) => n(msg))
export const notify = note

// ---- Who's who ----

export const otherOf = (l: Link, me = state.me) => (l.a === me ? l.b : l.a)
export const coupleOf = (s: State) => s.links.find((l) => l.kind === 'couple' && l.status === 'active') ?? null
/** Online means they played in the last few minutes */
export const isOnline = (c: Card | undefined) => !!c && now() - Date.parse(c.seen_at) < 3 * 60_000
export const isAdult = (birthday: string | null | undefined) => {
  if (!birthday) return false
  const [y, m, d] = birthday.split('-').map(Number)
  const t = new Date(now())
  return t.getFullYear() - y - (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d) ? 1 : 0) >= 18
}

/** The date in a time zone, by the server's clock */
function dayIn(tz: string) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now()))
  } catch {
    return new Date(now()).toISOString().slice(0, 10)
  }
}

const roomOf = (s: Save): RoomView => roomViewOf(s)
const errorText = (e: unknown) => (e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Something went wrong, try again')

// ---- Keeping the game in step with the shared home ----

/** The room and Hearts as last agreed with the server, so only real changes get sent */
let last: { placed: unknown; floor: string; wall: string; owned: unknown; storage: unknown; hearts: number } | null = null
let applying = false
let roomTimer = 0
/** True while your own decorating is on its way to the server, so a refresh doesn't undo it */
let pushing = false
let cardTimer = 0
let queue: Promise<unknown> = Promise.resolve()

function applyHome(h: Home) {
  applying = true
  setSave((s) => ({
    ...s,
    placed: h.room.placed ?? s.placed,
    floor: h.room.floor ?? s.floor,
    wall: h.room.wall ?? s.wall,
    owned: h.room.owned ?? s.owned,
    storage: h.room.storage ?? s.storage,
    hearts: h.jar,
    earnedToday: h.day === dayIn(h.tz) ? h.earned : 0,
  }))
  applying = false
  const s = getSave()
  last = { placed: s.placed, floor: s.floor, wall: s.wall, owned: s.owned, storage: s.storage, hearts: s.hearts }
  if (!getSession().visit) settle(s.placed)
}

/** Just the jar and today's count, without touching the room */
function applyJar(h: Pick<Home, 'jar'> & { earned?: number }) {
  applying = true
  setSave((s) => ({ ...s, hearts: h.jar, earnedToday: h.earned ?? s.earnedToday }))
  applying = false
  if (last) last.hearts = h.jar
}

function onSave() {
  if (applying || !supabase || !state.me) return
  const s = getSave()

  // What people you're connected to see when they visit
  clearTimeout(cardTimer)
  cardTimer = window.setTimeout(() => send(supabase!.from('cards').update({ name: s.profile?.name ?? '', look: s.profile, room: roomOf(s) }).eq('id', state.me!)), 3000)

  const h = state.home
  if (!h || s.home !== h.link || !last) return
  const link = h.link

  // Decorating the shared room
  if (s.placed !== last.placed || s.floor !== last.floor || s.wall !== last.wall || s.owned !== last.owned || s.storage !== last.storage) {
    last = { ...last, placed: s.placed, floor: s.floor, wall: s.wall, owned: s.owned, storage: s.storage }
    clearTimeout(roomTimer)
    pushing = true
    roomTimer = window.setTimeout(async () => {
      const g = getSave()
      await supabase!
        .from('homes')
        .update({ room: { placed: g.placed, floor: g.floor, wall: g.wall, owned: g.owned, storage: g.storage }, room_by: state.me, updated_at: new Date(now()).toISOString() })
        .eq('link', link)
      pushing = false
    }, 600)
  }

  // Spending from and earning into the jar: the server keeps the real count
  const delta = s.hearts - last.hearts
  if (delta === 0) return
  last.hearts = s.hearts
  queue = queue.then(async () => {
    if (delta < 0) {
      const { data, error } = await supabase!.rpc('jar_spend', { p_link: link, p_n: -delta })
      if (error) {
        note(errorText(error))
        await refresh()
      } else applyJar({ jar: data as number })
    } else {
      const { data, error } = await supabase!.rpc('couple_earn', { p_link: link, p_n: delta })
      if (!error && data) applyJar(data as { jar: number; earned: number })
    }
  })
}

// ---- Caring for pets together: either partner can feed and pet both partners' pets, once a day per pet ----

export type Care = 'fed' | 'petted'

/** Living in the shared home right now (so pet care and Hearts go through the couple's jar) */
export const livingTogether = () => !!supabase && !!state.home && getSave().home === state.home.link

/** Has anyone in the couple already fed (or petted) this pet today? */
export function careDone(kind: Care, pet: string) {
  const h = state.home
  if (!h || getSave().home !== h.link) return false
  return h.care?.[`${kind}:${pet}`] === dayIn(h.tz)
}

/** Feed or pet a pet in the shared home: the server checks it's the first time today and adds the Hearts to the jar */
export function coupleCare(kind: Care, pet: string, n: number) {
  const h = state.home
  if (!supabase || !h) return
  const link = h.link
  // Show it as done straight away; the server's answer follows
  set({ home: { ...h, care: { ...h.care, [`${kind}:${pet}`]: dayIn(h.tz) } } })
  queue = queue.then(async () => {
    const { data, error } = await supabase!.rpc('couple_care', { p_link: link, p_pet: pet, p_kind: kind, p_n: n })
    if (error) return note(errorText(error))
    const r = data as { jar: number; earned: number; care: Record<string, string> }
    if (state.home?.link === link) set({ home: { ...state.home, care: r.care } })
    applyJar(r)
  })
}

// Pet and gift Hearts: living together, they go straight into the jar
setBonusSink((n) => {
  const h = state.home
  if (!supabase || !h || getSave().home !== h.link || !last) return false
  const link = h.link
  queue = queue.then(async () => {
    const { data, error } = await supabase!.rpc('couple_feed', { p_link: link, p_n: n })
    if (error) note(errorText(error))
    else applyJar(data as { jar: number; earned: number })
  })
  return true
})

/** The moving-in gift (a double bed, a second table and a second PC setup), once per shared home */
let giftAsked: string | null = null
async function claimGift(h: Home) {
  // `couple_gift` is missing until supabase/stage8.sql has run; then there's nothing to claim yet
  if (!supabase || h.couple_gift !== false || giftAsked === h.link) return
  giftAsked = h.link
  const { data, error } = await supabase.rpc('claim_couple_gift', { p_link: h.link })
  if (error || !data) return
  set({ home: data as Home })
  applyHome(data as Home)
  note('💞 Moving-in gift: a double bed, a table and a PC setup are in your storage!')
}

/** Line the game up with what the server says: move in, keep living together, or move out after a breakup */
async function reconcile() {
  if (!supabase || !state.me) return
  const s = getSave()
  const couple = coupleOf(state)
  const h = state.home
  if (couple && h) {
    setCap(COUPLE_CAP)
    if (s.home !== couple.id) {
      // Moving in: bring your Hearts and (unless it's your apartment) your furniture along
      const items: Record<string, number> = { ...s.storage }
      if (h.owner !== state.me) s.placed.forEach((p) => (items[p.id] = (items[p.id] ?? 0) + 1))
      const { error } = await supabase.rpc('join_home', { p_link: couple.id, p_items: items, p_owned: s.owned, p_hearts: s.hearts })
      if (error) return note(errorText(error))
      const { data } = await supabase.from('homes').select('*').eq('link', couple.id).maybeSingle()
      if (!data) return
      applying = true
      setSave((x) => ({ ...x, home: couple.id }))
      applying = false
      set({ home: data as Home })
      applyHome(data as Home)
      note(`🏡 You moved in together! Your Hearts are in the jar now`)
      return
    }
    if (pushing) applyJar(h)
    else applyHome(h)
    void claimGift(h)
    return
  }
  setCap(DAILY_CAP)
  if (s.home) {
    // The couple ended: keep a copy of the room and take your half of the jar
    const link = s.home
    const { data: old } = await supabase.from('homes').select('*').eq('link', link).maybeSingle()
    const { data: share } = await supabase.rpc('claim_share', { p_link: link })
    applying = true
    setSave((x) => ({
      ...x,
      home: null,
      hearts: (share as number | null) ?? 0,
      ...(old ? { placed: (old as Home).room.placed, floor: (old as Home).room.floor, wall: (old as Home).room.wall, owned: (old as Home).room.owned, storage: (old as Home).room.storage } : {}),
    }))
    applying = false
    last = null
    note(`You're living on your own again. You kept the room and half the jar 💗`)
  }
}

let refreshing: Promise<void> | null = null
/** Fetch your links, the cards of everyone you're connected to, and your shared home */
export function refresh() {
  if (!refreshing)
    refreshing = (async () => {
      if (!supabase || !state.me) return
      const me = state.me
      const [{ data: links }, { data: mine }] = await Promise.all([supabase.from('links').select('*'), supabase.from('cards').select('*').eq('id', me).maybeSingle()])
      const ls = ((links ?? []) as Link[]).filter((l) => l.status !== 'ended')
      const others = [...new Set(ls.map((l) => otherOf(l, me)))]
      const { data: cards } = others.length ? await supabase.from('cards').select('*').in('id', others) : { data: [] }
      const couple = ls.find((l) => l.kind === 'couple' && l.status === 'active')
      const { data: home } = couple ? await supabase.from('homes').select('*').eq('link', couple.id).maybeSingle() : { data: null }
      set({ links: ls, mine: (mine as Card) ?? state.mine, cards: Object.fromEntries(((cards ?? []) as Card[]).map((c) => [c.id, c])), home: (home as Home) ?? null, ready: true })
      await reconcile()
    })().finally(() => (refreshing = null))
  return refreshing
}

async function syncClock() {
  if (!supabase) return
  const t0 = Date.now()
  const { data } = await supabase.rpc('server_now')
  if (data) setServerTime(Date.parse(data as string) + (Date.now() - t0) / 2)
}

/** Played today: counts toward Chemistry, and pays it out while you're both online */
async function checkIn() {
  const c = coupleOf(state)
  if (!supabase || !c || !state.home) return
  const { data } = await supabase.rpc('check_in', { p_link: c.id })
  const r = data as { paid: number; chem: number; jar: number } | null
  if (r?.paid) {
    applyJar({ jar: r.jar })
    note(`💞 Chemistry ${r.chem}: +${r.paid} Hearts in the jar`)
  }
}

// Guests get the server clock too, whenever the game is online
void syncClock()

let channel: RealtimeChannel | null = null
let beat = 0
let watching = false

export async function startTogether(id: string) {
  if (!supabase || state.me === id) return
  set({ me: id })
  if (!watching) {
    watching = true
    subscribeSave(onSave)
  }
  const s = getSave()
  // Your card: made once (it gets your friend code), then kept up to date
  const { data: existing } = await supabase.from('cards').select('*').eq('id', id).maybeSingle()
  const card = { name: s.profile?.name ?? '', birthday: s.profile?.birthday || null, look: s.profile, room: roomOf(s), seen_at: new Date(now()).toISOString() }
  if (existing) await supabase.from('cards').update(card).eq('id', id)
  else await supabase.from('cards').insert({ id, ...card })
  await refresh()
  void checkIn()

  // Live: requests arriving, a partner decorating, the jar changing
  channel = supabase
    .channel(`together-${id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'links' }, () => void refresh())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'homes' }, (msg) => {
      const h = msg.new as Home | undefined
      if (!h?.link || h.link !== state.home?.link) return void refresh()
      set({ home: h })
      if (getSave().home !== h.link) return
      // Your own decorating comes back too; only a partner's changes need drawing
      if (h.room_by !== state.me) applyHome(h)
      else applyJar(h)
    })
    .subscribe()

  clearInterval(beat)
  beat = window.setInterval(() => {
    send(supabase!.from('cards').update({ seen_at: new Date(now()).toISOString() }).eq('id', id))
    void refresh()
    void checkIn()
  }, 60_000)
}

export function stopTogether() {
  clearInterval(beat)
  if (channel) void supabase?.removeChannel(channel)
  channel = null
  last = null
  setCap(DAILY_CAP)
  leaveVisit()
  set({ me: null, mine: null, links: [], cards: {}, home: null, ready: false })
}

/** Your weather, for the split sky your partner (or a visitor) sees */
let lastWeather = ''
export function shareWeather(w: SharedWeather | null) {
  const key = JSON.stringify(w)
  if (!supabase || !state.me || key === lastWeather) return
  lastWeather = key
  send(supabase.from('cards').update({ weather: w }).eq('id', state.me))
}

// ---- Actions (each returns an error message, or null when it worked) ----

async function call(fn: string, args: Record<string, unknown>) {
  if (!supabase) return 'Sign in first'
  const { error } = await supabase.rpc(fn, args)
  await refresh()
  return error ? errorText(error) : null
}

/** Ask someone to be your couple, friend or family. A couple can include their anniversary (for monthsary pets). */
export async function sendRequest(code: string, kind: LinkKind, anniversary?: string) {
  if (!supabase) return 'Sign in first'
  const { data, error } = await supabase.rpc('send_request', { p_code: code, p_kind: kind })
  if (!error && kind === 'couple' && anniversary) await supabase.rpc('set_anniversary', { p_link: data as string, p_date: anniversary })
  await refresh()
  return error ? errorText(error) : null
}
/** The day a couple got together: their monthsary pet comes on this day every month */
export const setAnniversary = (link: string, date: string) => call('set_anniversary', { p_link: link, p_date: date })
export const answerRequest = (link: string, accept: boolean) => call('answer_request', { p_link: link, p_accept: accept })
/** Cancel a request, remove a friend, or break up */
export const endLink = (link: string) => call('end_link', { p_link: link })
export const voteHome = (link: string, home: string) => call('vote_home', { p_link: link, p_home: home, p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone })

/** Go to someone's room. You can use their furniture, but not decorate. */
export async function visit(id: string) {
  if (!supabase) return 'Sign in first'
  const { data } = await supabase.from('cards').select('*').eq('id', id).maybeSingle()
  const c = data as Card | null
  if (!c?.room) return 'Their room isn’t ready to visit yet'
  cancel()
  setSession((s) => ({ ...s, mode: 'play', selected: null, ghost: null, visit: { id: c.id, name: c.name || 'Friend', look: c.look, room: c.room! } }))
  set({ cards: { ...state.cards, [c.id]: c } })
  settle(c.room.placed)
  return null
}

export function leaveVisit() {
  if (!getSession().visit) return
  cancel()
  setSession((s) => ({ ...s, visit: null }))
  settle(getSave().placed)
}
