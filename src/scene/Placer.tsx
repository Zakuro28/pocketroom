import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Plane, Raycaster, Vector2, Vector3 } from 'three'
import { ITEMS } from '../game/catalog'
import { CELL, ROOM, WALL_H, canPlace, footprint, heightOf, rectOf, type Placed } from '../game/grid'
import { commitGhost, getSave, getSession, setSession } from '../game/store'
import { nope, place } from '../lib/sound'

const ray = new Raycaster()
const ndc = new Vector2()
const hit = new Vector3()

/**
 * Moves the placement preview with the pointer. Floor items snap to the floor grid, top items to the table under the pointer,
 * and wall items to whichever back wall the pointer is over. A mouse click places it; on touch screens a tap moves it and the ✓ button places it.
 */
export default function Placer() {
  const { camera, gl } = useThree()

  useEffect(() => {
    const el = gl.domElement
    let down: { x: number; y: number } | null = null

    const aim = (cx: number, cy: number) => {
      const g = getSession().ghost
      if (!g) return
      const rect = el.getBoundingClientRect()
      ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const item = ITEMS[g.id]
      const placed = getSave().placed.filter((p) => p.uid !== g.moving)
      let next: Placed = { ...g }

      if (item.kind === 'wall') {
        const len = footprint(item, 0).w
        const onL = ray.ray.intersectPlane(new Plane(new Vector3(1, 0, 0), 0), hit.clone())
        const onR = ray.ray.intersectPlane(new Plane(new Vector3(0, 0, 1), 0), hit.clone())
        const okL = onL && onL.z >= 0 && onL.z <= ROOM.d * CELL && onL.y >= 0 && onL.y <= WALL_H
        const okR = onR && onR.x >= 0 && onR.x <= ROOM.w * CELL && onR.y >= 0 && onR.y <= WALL_H
        if (okR) next = { ...next, wall: 'R', r: 0, x: Math.round(onR.x / CELL - len / 2) }
        else if (okL) next = { ...next, wall: 'L', r: 1, x: Math.round(onL.z / CELL - len / 2) }
        else return
      } else if (item.kind === 'top') {
        // Find the highest table or counter under the pointer
        let best: { host: Placed; x: number; z: number; y: number } | null = null
        for (const host of placed) {
          if (!ITEMS[host.id].surface) continue
          const y = heightOf(host.id)
          const p = ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), -y), hit.clone())
          if (!p) continue
          const r = rectOf(host)
          const cx2 = p.x / CELL
          const cz2 = p.z / CELL
          if (cx2 >= r.x && cx2 < r.x + r.w && cz2 >= r.z && cz2 < r.z + r.d && (!best || y > best.y)) best = { host, x: cx2, z: cz2, y }
        }
        const fp = footprint(item, g.r)
        if (best) {
          const r = rectOf(best.host)
          next = { ...next, on: best.host.uid, x: Math.min(r.x + r.w - fp.w, Math.max(r.x, Math.floor(best.x - fp.w / 2 + 0.5))), z: Math.min(r.z + r.d - fp.d, Math.max(r.z, Math.floor(best.z - fp.d / 2 + 0.5))) }
        } else {
          const p = ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), hit)
          if (!p) return
          next = { ...next, on: undefined, x: Math.floor(p.x / CELL - fp.w / 2 + 0.5), z: Math.floor(p.z / CELL - fp.d / 2 + 0.5) }
        }
      } else {
        const p = ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), hit)
        if (!p) return
        const fp = footprint(item, g.r)
        next = { ...next, x: Math.min(ROOM.w - fp.w, Math.max(0, Math.floor(p.x / CELL - fp.w / 2 + 0.5))), z: Math.min(ROOM.d - fp.d, Math.max(0, Math.floor(p.z / CELL - fp.d / 2 + 0.5))) }
      }
      const valid = canPlace(getSave().placed, next, g.moving)
      if (next.x !== g.x || next.z !== g.z || next.wall !== g.wall || next.on !== g.on || valid !== g.valid) setSession((s) => ({ ...s, ghost: s.ghost ? { ...s.ghost, ...next, valid } : null }))
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || down) aim(e.clientX, e.clientY)
    }
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY }
      aim(e.clientX, e.clientY)
    }
    const onUp = (e: PointerEvent) => {
      const d = down
      down = null
      if (!d || !getSession().ghost || e.pointerType !== 'mouse') return
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return
      if (commitGhost()) place()
      else nope()
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
    }
  }, [camera, gl])

  return null
}
