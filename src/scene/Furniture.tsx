import { memo, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import type { Group } from 'three'
import { paintModel } from './paint'
import { ITEMS } from '../game/catalog'
import { CELL, centerOf, footprint, heightOf, rectOf, wallHeight, type Placed } from '../game/grid'
import { SIZES } from '../game/sizes'

const url = (model: string) => `/models/${model}.glb`

/** A furniture model, recolored for special versions or the player's fabric choice, centered so it turns on the spot */
function useFurniture(model: string, paint?: Record<string, string>, fabric?: string, ghost = false) {
  const { scene } = useGLTF(url(model))
  return useMemo(() => paintModel(scene, paint, fabric, ghost), [scene, paint, fabric, ghost])
}

/** Where an item stands in the world and which way it faces */
function placement(p: Placed, all: Placed[]) {
  const item = ITEMS[p.id]
  const [, , depth] = SIZES[item.model]
  if (item.kind === 'wall') {
    const len = footprint(item, 0).w * CELL
    const along = p.x * CELL + len / 2
    return p.wall === 'L' ? { pos: [depth / 2 + 0.01, wallHeight(item), along] as const, rotY: Math.PI / 2 } : { pos: [along, wallHeight(item), depth / 2 + 0.01] as const, rotY: 0 }
  }
  const c = centerOf(rectOf(p))
  const host = p.on ? all.find((o) => o.uid === p.on) : undefined
  const y = item.kind === 'rug' ? 0.004 : host ? heightOf(host.id) : 0
  return { pos: [c.x, y, c.z] as const, rotY: (p.r * Math.PI) / 2 }
}

/** One placed item. Taps go to the game (use it while playing, select it while decorating). */
export const PlacedItem = memo(function PlacedItem({ p, all, selected, onTap }: { p: Placed; all: Placed[]; selected: boolean; onTap: (p: Placed, e: ThreeEvent<MouseEvent>) => void }) {
  const item = ITEMS[p.id]
  const obj = useFurniture(item.model, item.paint, p.color)
  const { pos, rotY } = placement(p, all)
  const fp = footprint(item, 0)
  const group = useRef<Group>(null)
  // Selected items breathe a little so it's clear what you're editing
  useFrame(({ clock }) => {
    if (!group.current) return
    const s = selected ? 1 + Math.sin(clock.elapsedTime * 5) * 0.025 : 1
    group.current.scale.setScalar(s)
  })
  return (
    <group position={pos as unknown as [number, number, number]} rotation-y={rotY}>
      {selected && item.kind !== 'wall' && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
          <planeGeometry args={[fp.w * CELL + 0.08, fp.d * CELL + 0.08]} />
          <meshBasicMaterial color="#ffd166" transparent opacity={0.45} depthWrite={false} />
        </mesh>
      )}
      <group
        ref={group}
        onClick={(e) => {
          e.stopPropagation()
          onTap(p, e)
        }}
      >
        <primitive object={obj} />
      </group>
    </group>
  )
})

/** The see-through preview that follows the pointer while placing, tinted green where it fits and red where it doesn't */
export function Ghost({ g, all }: { g: Placed & { valid: boolean }; all: Placed[] }) {
  const item = ITEMS[g.id]
  const obj = useFurniture(item.model, item.paint, g.color, true)
  const { pos, rotY } = placement(g, all)
  const fp = footprint(item, 0)
  return (
    <group position={pos as unknown as [number, number, number]} rotation-y={rotY}>
      <primitive object={obj} />
      {item.kind !== 'wall' && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.012}>
          <planeGeometry args={[fp.w * CELL, fp.d * CELL]} />
          <meshBasicMaterial color={g.valid ? '#5ad17a' : '#ef5b5b'} transparent opacity={0.45} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

