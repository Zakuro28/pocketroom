import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Group, Mesh, MeshBasicMaterial, Object3D } from 'three'
import { me } from '../game/character'
import { careTick, petSpots } from '../game/petCare'
import { CELL, DOOR, ROOM, blockedCells, findPath, type Placed } from '../game/grid'
import { DEFAULT_PROFILE, type Profile } from '../game/look'
import { isTiny, petHeight, speciesOf, type PetBody } from '../game/pets'
import { today } from '../game/store'
import { Guest } from './Avatar'
import { buildPet } from './petModel'

const worldOf = (cx: number, cz: number) => ({ x: (cx + 0.5) * CELL, z: (cz + 0.5) * CELL })

const seed = (uid: string) => {
  let h = 0
  for (const c of uid) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

/** A steady start spot per pet, so pets don't all pile up in one place */
function startCell(uid: string, blocked: Set<string>): [number, number] {
  const h = seed(uid)
  for (let i = 0; i < 200; i++) {
    const cx = 2 + ((h + i * 7) % (ROOM.w - 4))
    const cz = 2 + ((Math.floor(h / 97) + i * 5) % (ROOM.d - 4))
    if (!blocked.has(`${cx},${cz}`)) return [cx, cz]
  }
  return [9, 8]
}

/** Swing the legs back and forth while walking (each at its own phase), and ease them still otherwise */
function swing(legs: Object3D[], walking: boolean, at: number, k: number) {
  for (const l of legs) l.rotation.x += ((walking ? Math.sin(at + l.userData.phase) * 0.55 : 0) - l.rotation.x) * k
}

/** One pet: wanders between free spots, pauses, and hops a little as it walks */
function PetActor({ pet, blocked, onTap }: { pet: PetBody; blocked: Set<string>; onTap: (uid: string) => void }) {
  const sp = speciesOf(pet)
  const model = useMemo(() => buildPet({ sp, coat: pet.coat, color: pet.color }), [sp, pet.coat, pet.color])
  // The legs, hinged at the hips (see petModel.ts), to swing while walking
  const legs = useRef<Object3D[]>([])
  useEffect(() => {
    const out: Object3D[] = []
    model.traverse((o) => o.name === 'leg' && out.push(o))
    legs.current = out
  }, [model])
  const body = useRef<Group>(null)
  useEffect(() => () => void petSpots.delete(pet.uid), [pet.uid])
  const day = today()
  const h = petHeight(pet, day)
  const tiny = isTiny(pet, day)
  const root = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  // Where it is and where it's going: changed every frame, so it's kept in a ref and set up on the first frame
  const st = useRef<{ x: number; z: number; rotY: number; path: { x: number; z: number }[]; wait: number } | null>(null)
  // Slow creatures stay slow
  const speed = sp.arch === 'snail' ? 0.08 : sp.arch === 'turtle' ? 0.15 : 0.35 + Math.min(0.5, h)

  useFrame(({ clock }, dt) => {
    if (!st.current) {
      const seeded = seed(pet.uid)
      st.current = { ...worldOf(...startCell(pet.uid, blocked)), rotY: (seeded % 628) / 100, path: [], wait: 1 + (seeded % 3) }
    }
    const s = st.current
    const r = root.current
    if (!r) return
    dt = Math.min(dt, 0.05)
    const t = clock.elapsedTime
    let hop = 0
    // Being fed or petted: stop, face your character, then sit down happily
    const care = careTick(pet.uid, s.x, s.z, t)
    if (care) {
      s.path = []
      s.wait = 2
      s.rotY = Math.atan2(me.x - s.x, me.z - s.z)
    }
    const walking = !!s.path.length
    if (s.path.length) {
      const t = s.path[0]
      const dx = t.x - s.x
      const dz = t.z - s.z
      const dist = Math.hypot(dx, dz)
      const step = speed * dt
      s.rotY = Math.atan2(dx, dz)
      if (dist <= step) {
        s.x = t.x
        s.z = t.z
        s.path.shift()
      } else {
        s.x += (dx / dist) * step
        s.z += (dz / dist) * step
      }
      // Hoppers and frogs hop; walkers just bob a little now that their legs move
      const hopper = sp.arch === 'hopper' || sp.arch === 'frog'
      if (sp.arch !== 'snail' && sp.arch !== 'snake' && sp.arch !== 'turtle') hop = Math.abs(Math.sin(clock.elapsedTime * (hopper ? 11 : 13))) * h * (hopper ? 0.08 : 0.025)
    } else if ((s.wait -= dt) <= 0) {
      // Pick somewhere nearby to wander to
      const from: [number, number] = [Math.floor(s.x / CELL), Math.floor(s.z / CELL)]
      for (let i = 0; i < 12; i++) {
        const to: [number, number] = [Math.max(0, Math.min(ROOM.w - 1, from[0] + Math.round((Math.random() - 0.5) * 10))), Math.max(0, Math.min(ROOM.d - 1, from[1] + Math.round((Math.random() - 0.5) * 10)))]
        if (blocked.has(`${to[0]},${to[1]}`)) continue
        const path = findPath(blocked, from, to)
        if (path) {
          s.path = path.slice(1).map(([cx, cz]) => worldOf(cx, cz))
          break
        }
      }
      s.wait = 2 + Math.random() * 6
    }
    r.position.set(s.x, hop, s.z)
    petSpots.set(pet.uid, { x: s.x, z: s.z })
    const diff = ((s.rotY - r.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    r.rotation.y += diff * Math.min(1, dt * 8)
    // Legs swing while walking and settle when still; snakes wriggle and snails stretch as they crawl
    const k = Math.min(1, dt * 10)
    const stride = sp.arch === 'turtle' ? 4 : 13
    swing(legs.current, walking && care !== 'sit', t * stride, k)
    const b = body.current
    if (b) {
      const crawl = walking && (sp.arch === 'snake' || sp.arch === 'snail')
      b.rotation.y = crawl && sp.arch === 'snake' ? Math.sin(t * 5) * 0.18 : 0
      b.scale.z = crawl && sp.arch === 'snail' ? 1 + Math.sin(t * 3) * 0.08 : 1
      // Sitting: lean back on the hind legs, with a happy little bounce
      const sit = care === 'sit'
      b.rotation.x += ((sit ? -0.32 : 0) - b.rotation.x) * k
      b.position.y = sit ? Math.abs(Math.sin(t * 6)) * h * 0.05 : 0
    }
    if (ring.current) (ring.current.material as MeshBasicMaterial).opacity = 0.35 + Math.sin(clock.elapsedTime * 3) * 0.15
  })

  const tap = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onTap(pet.uid)
  }
  // The name shows while you point at the pet with the mouse
  const [hover, setHover] = useState(false)

  return (
    <group ref={root}>
      <group
        onClick={tap}
        onPointerOver={(e) => {
          if (e.pointerType !== 'mouse') return
          e.stopPropagation()
          setHover(true)
        }}
        onPointerOut={() => setHover(false)}
      >
        <group ref={body}>
          <primitive object={model} scale={h} />
        </group>
        {/* A bigger invisible target, so small pets are easy to tap */}
        <mesh position-y={h / 2} visible={false}>
          <boxGeometry args={[Math.max(0.3, h), Math.max(0.3, h), Math.max(0.3, h)]} />
        </mesh>
      </group>
      {/* Tiny pets glow so they're easy to find */}
      {tiny && (
        <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.01}>
          <ringGeometry args={[0.16, 0.21, 32]} />
          <meshBasicMaterial color="#ffd86b" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      )}
      {/* Name on hover: always in the page, just hidden, so hovering doesn't add and remove a 3D label */}
      <Html position={[0, h + 0.14, 0]} center zIndexRange={[12, 0]} style={{ pointerEvents: 'none', opacity: hover ? 1 : 0, transition: 'opacity 150ms ease-out' }}>
        <div className="rounded-full bg-cream/90 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-ink shadow">{pet.name}</div>
      </Html>
    </group>
  )
}

/** The pets in this room (yours, your partner's, or the host's when visiting), wandering the studio */
export function Pets({ pets, placed, onTap }: { pets: PetBody[]; placed: Placed[]; onTap: (uid: string) => void }) {
  const blocked = useMemo(() => blockedCells(placed), [placed])
  return (
    <>
      {pets.map((p) => (
        <PetActor key={p.uid} pet={p} blocked={blocked} onTap={onTap} />
      ))}
    </>
  )
}

const COURIER: Profile = { ...DEFAULT_PROFILE, name: 'Courier', gender: 'male', hair: 'short', hairColor: '#3b2a24', skin: '#c98e63' }

/** The delivery man at the front door with a parcel, while a pet is waiting to be rolled */
export function Courier({ count, onTap }: { count: number; onTap: () => void }) {
  const box = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (box.current) box.current.position.y = 0.12 + Math.abs(Math.sin(clock.elapsedTime * 2.2)) * 0.04
  })
  const z = ((DOOR.from + DOOR.to) / 2) * CELL
  return (
    <group
      onClick={(e) => {
        e.stopPropagation()
        onTap()
      }}
    >
      <Guest profile={COURIER} name={`📦 ${count > 1 ? `${count} pets` : 'A pet'} for you!`} x={0.55} z={z} alwaysName />
      <group ref={box} position={[0.95, 0.12, z + 0.1]}>
        <mesh castShadow>
          <boxGeometry args={[0.26, 0.22, 0.26]} />
          <meshStandardMaterial color="#c99a62" />
        </mesh>
        <mesh position-y={0.112}>
          <boxGeometry args={[0.27, 0.01, 0.06]} />
          <meshStandardMaterial color="#ff5d86" />
        </mesh>
        <mesh position-y={0.112}>
          <boxGeometry args={[0.06, 0.01, 0.27]} />
          <meshStandardMaterial color="#ff5d86" />
        </mesh>
      </group>
    </group>
  )
}
