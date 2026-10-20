import { ITEMS, type Item } from './catalog'
import { SIZES } from './sizes'

/** One grid cell is half a floor tile of the furniture kit */
export const CELL = 0.5
/** The studio, in cells: x runs along the right-hand back wall, z along the left-hand one */
export const ROOM = { w: 18, d: 16 }
export const WALL_H = 1.7

export type Rot = 0 | 1 | 2 | 3
export type Wall = 'L' | 'R'

/** One thing in the room. Floor items and rugs use x/z cells; top items also name the item they sit on; wall items use a wall and a position along it. */
export type Placed = { uid: string; id: string; x: number; z: number; r: Rot; wall?: Wall; on?: string; color?: string }

export type Rect = { x: number; z: number; w: number; d: number }

/** Fixed openings: two windows on the right wall and the front door on the left wall */
export const WINDOWS = [
  { from: 3, to: 6 },
  { from: 11, to: 14 },
]
export const DOOR = { from: 11, to: 14 }

const cells = (size: number) => Math.max(1, Math.ceil(size / CELL - 0.15))

/** How many cells an item covers, after rotating */
export function footprint(item: Item, r: Rot) {
  const [sx, , sz] = SIZES[item.model]
  const w = cells(sx)
  const d = item.kind === 'wall' ? 1 : cells(sz)
  return r % 2 ? { w: d, d: w } : { w, d }
}

export const rectOf = (p: Placed): Rect => ({ x: p.x, z: p.z, ...footprint(ITEMS[p.id], p.r) })

const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d
const inRoom = (r: Rect) => r.x >= 0 && r.z >= 0 && r.x + r.w <= ROOM.w && r.z + r.d <= ROOM.d

export const heightOf = (id: string) => SIZES[ITEMS[id].model][1]

/** Height above the floor for wall items, so cabinets hang high and lamps at eye level */
export function wallHeight(item: Item) {
  if (item.model.startsWith('kitchenCabinetUpper') || item.model.startsWith('hood')) return 0.78
  if (item.model === 'bathroomMirror') return 0.55
  if (item.model === 'coatRack') return 0.62
  if (item.cat === 'art') return 0.6
  return 0.7
}

/** Can this item go here? Checks the room edges, other furniture, windows and the door, and that top items have a surface under them. */
export function canPlace(placed: Placed[], cand: Placed, ignore?: string): boolean {
  const item = ITEMS[cand.id]
  const others = placed.filter((p) => p.uid !== ignore && p.uid !== cand.uid)
  if (item.kind === 'wall') {
    const len = footprint(item, 0).w
    const span = { from: cand.x, to: cand.x + len }
    const max = cand.wall === 'L' ? ROOM.d : ROOM.w
    if (span.from < 0 || span.to > max) return false
    const holes = cand.wall === 'R' ? WINDOWS : [DOOR]
    if (holes.some((h) => span.from < h.to && h.from < span.to)) return false
    return !others.some((o) => o.wall === cand.wall && ITEMS[o.id].kind === 'wall' && span.from < o.x + footprint(ITEMS[o.id], 0).w && o.x < span.to)
  }
  const r = rectOf(cand)
  if (!inRoom(r)) return false
  if (item.kind === 'top') {
    const host = others.find((o) => o.uid === cand.on)
    if (!host) return false
    const hr = rectOf(host)
    if (!(r.x >= hr.x && r.z >= hr.z && r.x + r.w <= hr.x + hr.w && r.z + r.d <= hr.z + hr.d)) return false
    return !others.some((o) => o.on === host.uid && overlap(rectOf(o), r))
  }
  const sameLayer = others.filter((o) => ITEMS[o.id].kind === item.kind)
  if (sameLayer.some((o) => overlap(rectOf(o), r))) return false
  // Keep the doorway clear so the room can always be entered
  if (item.kind === 'floor' && r.x === 0 && r.z < DOOR.to && DOOR.from < r.z + r.d) return false
  return true
}

/** Cells that furniture stands on (rugs and top items don't block walking) */
export function blockedCells(placed: Placed[]) {
  const b = new Set<string>()
  for (const p of placed) {
    if (ITEMS[p.id].kind !== 'floor') continue
    const r = rectOf(p)
    for (let x = r.x; x < r.x + r.w; x++) for (let z = r.z; z < r.z + r.d; z++) b.add(`${x},${z}`)
  }
  return b
}

/** The way an item faces after rotating: models face +z, each quarter turn swings that toward +x */
export const FORWARD: Record<Rot, [number, number]> = { 0: [0, 1], 1: [1, 0], 2: [0, -1], 3: [-1, 0] }

/** World-space center of a rectangle of cells */
export const centerOf = (r: Rect) => ({ x: (r.x + r.w / 2) * CELL, z: (r.z + r.d / 2) * CELL })

/** Shortest walk between two cells around furniture (A*), or null if there's no way through */
export function findPath(blocked: Set<string>, from: [number, number], to: [number, number]): [number, number][] | null {
  const key = (x: number, z: number) => `${x},${z}`
  const free = (x: number, z: number) => x >= 0 && z >= 0 && x < ROOM.w && z < ROOM.d && !blocked.has(key(x, z))
  const h = (x: number, z: number) => Math.abs(x - to[0]) + Math.abs(z - to[1])
  const open: { x: number; z: number; g: number; f: number }[] = [{ x: from[0], z: from[1], g: 0, f: h(from[0], from[1]) }]
  const came = new Map<string, string>()
  const g = new Map<string, number>([[key(from[0], from[1]), 0]])
  while (open.length) {
    open.sort((a, b) => a.f - b.f)
    const c = open.shift()!
    if (c.x === to[0] && c.z === to[1]) {
      const path: [number, number][] = [[c.x, c.z]]
      let k = key(c.x, c.z)
      while (came.has(k)) {
        k = came.get(k)!
        const [x, z] = k.split(',').map(Number)
        path.unshift([x, z])
      }
      return path
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = c.x + dx
      const nz = c.z + dz
      if (!free(nx, nz) && !(nx === to[0] && nz === to[1])) continue
      const ng = c.g + 1
      const nk = key(nx, nz)
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng)
        came.set(nk, key(c.x, c.z))
        open.push({ x: nx, z: nz, g: ng, f: ng + h(nx, nz) })
      }
    }
  }
  return null
}

/** The free cell in front of an item where your character stands to use it (falls back to any free cell beside it) */
export function standCell(placed: Placed[], p: Placed): [number, number] | null {
  const host = p.on ? placed.find((o) => o.uid === p.on) : undefined
  const base = host ?? p
  const r = rectOf(base)
  const blocked = blockedCells(placed)
  const free = (x: number, z: number) => x >= 0 && z >= 0 && x < ROOM.w && z < ROOM.d && !blocked.has(`${x},${z}`)
  const [fx, fz] = FORWARD[base.r]
  const front: [number, number] = fx ? [fx > 0 ? r.x + r.w : r.x - 1, r.z + Math.floor(r.d / 2)] : [r.x + Math.floor(r.w / 2), fz > 0 ? r.z + r.d : r.z - 1]
  if (free(...front)) return front
  const ring: [number, number][] = []
  for (let x = r.x - 1; x <= r.x + r.w; x++) for (let z = r.z - 1; z <= r.z + r.d; z++) if (x < r.x || x >= r.x + r.w || z < r.z || z >= r.z + r.d) ring.push([x, z])
  const c = centerOf(r)
  return ring.filter(([x, z]) => free(x, z)).sort((a, b) => Math.hypot(a[0] - c.x / CELL, a[1] - c.z / CELL) - Math.hypot(b[0] - c.x / CELL, b[1] - c.z / CELL))[0] ?? null
}
