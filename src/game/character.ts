import { ACTS, REWARD_MULT, USES_PER_DAY } from './acts'
import { ITEMS, type Activity } from './catalog'
import { CELL, FORWARD, ROOM, blockedCells, centerOf, findPath, heightOf, rectOf, standCell, type Placed } from './grid'
import { earn, getPlaced, getSave, getSession, rollDay, setSession, spendUse } from './store'
import { blip, heart } from '../lib/sound'

export type Pose = 'stand' | 'walk' | 'sit' | 'lie' | 'dance'

/** Your character, moved every frame by the scene. Kept out of React so walking never re-renders the page. */
export const me = {
  x: 9.5 * CELL,
  z: 12.5 * CELL,
  y: 0,
  rotY: Math.PI / 4,
  pose: 'stand' as Pose,
  path: [] as { x: number; z: number }[],
  /** Where to end up once the path is walked: onto a seat or bed, or just facing the item */
  finish: null as null | { x: number; z: number; y: number; rotY: number; pose: Pose },
  task: null as null | { uid: string; act: Activity; until: number; next: number; left: number; per: number },
}

const cellOf = (x: number, z: number): [number, number] => [Math.min(ROOM.w - 1, Math.max(0, Math.floor(x / CELL))), Math.min(ROOM.d - 1, Math.max(0, Math.floor(z / CELL)))]
const worldOf = ([cx, cz]: [number, number]) => ({ x: (cx + 0.5) * CELL, z: (cz + 0.5) * CELL })

/** Seat and bed heights the models don't tell us directly */
function seatHeight(id: string) {
  const m = ITEMS[id].model
  if (m.startsWith('bed')) return 0.24
  if (m === 'bathtub') return 0.1
  if (m.startsWith('toilet')) return 0.22
  if (m.startsWith('pillow')) return 0.07
  if (m.startsWith('stool')) return 0.36
  if (m.startsWith('lounge')) return 0.17
  if (m.startsWith('bench')) return 0.2
  return Math.min(0.26, heightOf(id) * 0.5)
}

/** Every chair or sofa standing right in front of (or beside) a table or desk */
function seatNear(placed: Placed[], host: Placed) {
  const r = rectOf(host)
  return placed.find((o) => {
    if (o.uid === host.uid || ITEMS[o.id].act !== 'sit' || ITEMS[o.id].kind !== 'floor') return false
    const s = rectOf(o)
    const touchX = s.x <= r.x + r.w && r.x <= s.x + s.w
    const touchZ = s.z <= r.z + r.d && r.z <= s.z + s.d
    return touchX && touchZ
  })
}

/** Snap the character onto free floor (after furniture moves under them) */
export function settle(placed: Placed[]) {
  const blocked = blockedCells(placed)
  const [cx, cz] = cellOf(me.x, me.z)
  if (!blocked.has(`${cx},${cz}`) && (me.pose === 'stand' || me.pose === 'walk')) return
  for (let r = 0; r < Math.max(ROOM.w, ROOM.d); r++)
    for (let x = cx - r; x <= cx + r; x++)
      for (let z = cz - r; z <= cz + r; z++) {
        if (x < 0 || z < 0 || x >= ROOM.w || z >= ROOM.d || blocked.has(`${x},${z}`)) continue
        const w = worldOf([x, z])
        Object.assign(me, { x: w.x, z: w.z, y: 0, pose: 'stand', path: [], finish: null })
        stop()
        return
      }
}

export function stop() {
  me.task = null
  setSession((s) => ({ ...s, doing: null }))
}

/** Stop whatever you're doing: stop walking, get up from a seat or bed */
export function cancel() {
  stop()
  me.path = []
  me.finish = null
  if (me.pose !== 'stand') {
    me.pose = 'stand'
    me.y = 0
    settle(getPlaced())
  }
}

/** Tap on the floor while playing: walk there (or as close as the furniture allows) */
export function walkTo(x: number, z: number, placed: Placed[]) {
  cancel()
  const blocked = blockedCells(placed)
  let goal = cellOf(x, z)
  if (blocked.has(`${goal[0]},${goal[1]}`)) {
    // The nearest free cell to the tapped spot
    let best: [number, number] | null = null
    for (let cx = 0; cx < ROOM.w; cx++)
      for (let cz = 0; cz < ROOM.d; cz++) {
        if (blocked.has(`${cx},${cz}`)) continue
        if (!best || Math.hypot(cx - goal[0], cz - goal[1]) < Math.hypot(best[0] - goal[0], best[1] - goal[1])) best = [cx, cz]
      }
    if (!best) return
    goal = best
  }
  const path = findPath(blocked, cellOf(me.x, me.z), goal)
  if (!path) return
  me.pose = 'walk'
  me.path = path.slice(1).map(worldOf)
  const end = worldOf(goal)
  me.finish = { x: end.x, z: end.z, y: 0, rotY: me.rotY, pose: 'stand' }
}

/** Walk up to a spot (a pet) and stop a cell short of it. False if there's no way there. */
export function walkNear(x: number, z: number, placed: Placed[]) {
  cancel()
  const path = findPath(blockedCells(placed), cellOf(me.x, me.z), cellOf(x, z))
  if (!path) return false
  const steps = path.slice(1, -1).map(worldOf)
  const end = steps.at(-1) ?? { x: me.x, z: me.z }
  me.pose = steps.length ? 'walk' : 'stand'
  me.path = steps
  me.finish = { x: end.x, z: end.z, y: 0, rotY: Math.atan2(x - end.x, z - end.z), pose: 'stand' }
  return true
}

/** True while your character is standing still with nothing to do */
export const idle = () => !me.path.length && !me.finish && me.pose !== 'walk'

/** Tap on furniture while playing: walk over and use it */
export function goUse(p: Placed, placed: Placed[], say: (msg: string) => void) {
  // One thing at a time: finish (or stop) what you're doing first
  const busy = getSession()
  if (busy.caring) return say(`One thing at a time ✨ You’re looking after ${busy.caring.name}`)
  if (busy.doing && busy.doing.uid !== p.uid) return say('One thing at a time ✨ Tap ✕ to stop first')
  if (busy.doing) return
  const item = ITEMS[p.id]
  let act = item.act
  if (!act) return say(`That’s just for looks ✨`)
  // A sofa or chair facing a TV turns relaxing into TV time
  if (act === 'sit' && placed.some((o) => ITEMS[o.id].act === 'tv')) act = 'tv'
  const host = p.on ? placed.find((o) => o.uid === p.on) : undefined
  const base = host ?? p
  const seat = item.act === 'sit' ? p : (act === 'pc' || act === 'eat') ? seatNear(placed, base) : undefined
  const lie = ACTS[act].pose === 'lie'

  // Where to walk to, and how to finish
  const target = seat ?? (lie ? p : null)
  let stand: [number, number] | null
  let finish: (typeof me)['finish']
  if (target) {
    stand = standCell(placed, target)
    const c = centerOf(rectOf(target))
    const [fx, fz] = FORWARD[target.r]
    finish = lie
      ? { x: c.x, z: c.z, y: seatHeight(target.id), rotY: (target.r * Math.PI) / 2, pose: 'lie' }
      : { x: c.x - fx * 0.04, z: c.z - fz * 0.04, y: seatHeight(target.id), rotY: (target.r * Math.PI) / 2, pose: 'sit' }
  } else {
    stand = standCell(placed, p)
    if (!stand) return say(`Can’t reach that, make some room ✨`)
    const w = worldOf(stand)
    const c = centerOf(rectOf(base))
    finish = { x: w.x, z: w.z, y: 0, rotY: Math.atan2(c.x - w.x, c.z - w.z), pose: ACTS[act].pose === 'dance' ? 'dance' : 'stand' }
  }

  stop()
  const from = cellOf(me.x, me.z)
  const path = stand ? findPath(blockedCells(placed), from, stand) : null
  // Hop down from a bed or chair first, then walk the path (or pop straight there if nothing connects)
  me.pose = 'walk'
  me.y = 0
  me.path = path ? path.slice(1).map(worldOf) : []
  me.finish = finish
  blip()

  // Hearts: each activity pays once a day
  rollDay()
  const s = getSave()
  const usesLeft = USES_PER_DAY - (s.uses[act] ?? 0)
  const capLeft = getSession().cap - s.earnedToday
  const a = ACTS[act]
  const total = usesLeft > 0 && capLeft > 0 ? Math.min(a.hearts * REWARD_MULT, capLeft) : 0
  if (usesLeft <= 0) say(`You’ve done that today, try something else 💗`)
  if (total > 0) spendUse(act)
  const pops = Math.max(1, Math.round(a.seconds / 1.8))
  me.task = { uid: p.uid, act, until: 0, next: 0, left: total, per: Math.ceil(total / pops) }
  setSession((st) => ({ ...st, doing: { uid: p.uid, act, started: 0, seconds: a.seconds, earned: 0, total } }))
}

// ---- Keyboard: WASD or arrow keys walk the character (tap-to-walk still works) ----

const held = new Set<string>()
const KEYS: Record<string, string> = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' }
// The camera looks down from the front-right corner, so "up" on screen is toward the back-left of the room
const SCREEN = { up: [-1, -1], down: [1, 1], left: [-1, 1], right: [1, -1] } as const

/** Listen for walking keys while playing. Returns a function that stops listening. */
export function bindKeys() {
  const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement
  const onDown = (e: KeyboardEvent) => {
    const k = KEYS[e.key.toLowerCase()]
    if (!k || typing(e) || e.ctrlKey || e.metaKey || e.altKey || getSession().mode !== 'play') return
    e.preventDefault()
    held.add(k)
  }
  const onUp = (e: KeyboardEvent) => {
    const k = KEYS[e.key.toLowerCase()]
    if (k) held.delete(k)
  }
  const clear = () => held.clear()
  window.addEventListener('keydown', onDown)
  window.addEventListener('keyup', onUp)
  window.addEventListener('blur', clear)
  return () => {
    window.removeEventListener('keydown', onDown)
    window.removeEventListener('keyup', onUp)
    window.removeEventListener('blur', clear)
    clear()
  }
}

let blockedFor: Placed[] | null = null
let blockedNow = new Set<string>()
/** Free floor at this spot (the character is about a fifth of a cell wide) */
function free(x: number, z: number, placed: Placed[]) {
  if (blockedFor !== placed) {
    blockedFor = placed
    blockedNow = blockedCells(placed)
  }
  const r = 0.12
  if (x < r || z < r || x > ROOM.w * CELL - r || z > ROOM.d * CELL - r) return false
  for (const [ox, oz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
    const [cx, cz] = cellOf(x + ox, z + oz)
    if (blockedNow.has(`${cx},${cz}`)) return false
  }
  return true
}

/** Walk with the keys. True while a key is held, so the rest of the frame's walking waits. */
function drive(dt: number) {
  let dx = 0
  let dz = 0
  held.forEach((k) => {
    const [x, z] = SCREEN[k as keyof typeof SCREEN]
    dx += x
    dz += z
  })
  const len = Math.hypot(dx, dz)
  if (!len || getSession().mode !== 'play') {
    if (me.pose === 'walk' && !me.path.length && !me.finish) me.pose = 'stand'
    return false
  }
  // Taking control stops any activity or tap-walk, and gets you up from a seat or bed
  if (me.task || me.path.length || me.finish || me.pose === 'sit' || me.pose === 'lie' || me.pose === 'dance') cancel()
  const placed = getPlaced()
  const sp = 1.7 * dt
  const mx = (dx / len) * sp
  const mz = (dz / len) * sp
  // Slide along furniture and walls instead of stopping dead
  if (free(me.x + mx, me.z + mz, placed)) {
    me.x += mx
    me.z += mz
  } else if (free(me.x + mx, me.z, placed)) me.x += mx
  else if (free(me.x, me.z + mz, placed)) me.z += mz
  me.y = 0
  me.rotY = Math.atan2(dx, dz)
  me.pose = 'walk'
  return true
}

/** Called every frame by the scene: walk, settle into the pose, and drip Hearts during the activity */
export function step(dt: number, now: number, pop: (n: number) => void) {
  if (drive(dt)) return
  if (me.path.length) {
    const t = me.path[0]
    const dx = t.x - me.x
    const dz = t.z - me.z
    const dist = Math.hypot(dx, dz)
    const sp = 1.7 * dt
    me.rotY = Math.atan2(dx, dz)
    if (dist <= sp) {
      me.x = t.x
      me.z = t.z
      me.path.shift()
    } else {
      me.x += (dx / dist) * sp
      me.z += (dz / dist) * sp
    }
    return
  }
  if (me.finish) {
    const f = me.finish
    me.x = f.x
    me.z = f.z
    me.y = f.y
    if (me.task) me.rotY = f.rotY
    me.pose = f.pose
    me.finish = null
    if (me.task) {
      const secs = ACTS[me.task.act].seconds
      me.task.until = now + secs
      me.task.next = now + 1
      setSession((st) => (st.doing ? { ...st, doing: { ...st.doing, started: Date.now() } } : st))
    }
    return
  }
  const task = me.task
  if (!task || !task.until) return
  if (task.left > 0 && now >= task.next) {
    const n = Math.min(task.per, task.left)
    task.left -= n
    task.next = now + 1.8
    const got = earn(n)
    if (got > 0) {
      pop(got)
      heart()
      setSession((st) => (st.doing ? { ...st, doing: { ...st.doing, earned: st.doing.earned + got } } : st))
    }
  }
  if (now >= task.until) {
    if (task.left > 0) {
      const got = earn(task.left)
      if (got > 0) pop(got)
    }
    // Get up when done
    me.task = null
    setSession((st) => ({ ...st, doing: null }))
    if (me.pose === 'sit' || me.pose === 'lie') {
      const placed = getPlaced()
      me.pose = 'stand'
      me.y = 0
      settle(placed)
    } else me.pose = 'stand'
  }
}

/** Where someone else's character stands: the free spot nearest the middle of the room */
export function guestSpot(placed: Placed[]) {
  const blocked = blockedCells(placed)
  const want: [number, number] = [12, 9]
  let best: [number, number] | null = null
  for (let cx = 1; cx < ROOM.w - 1; cx++)
    for (let cz = 1; cz < ROOM.d - 1; cz++) {
      if (blocked.has(`${cx},${cz}`)) continue
      if (!best || Math.hypot(cx - want[0], cz - want[1]) < Math.hypot(best[0] - want[0], best[1] - want[1])) best = [cx, cz]
    }
  return worldOf(best ?? want)
}
