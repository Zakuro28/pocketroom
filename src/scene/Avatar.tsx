import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import { ExtrudeGeometry, Shape, type Group, type Mesh } from 'three'
import { me, step, type Pose } from '../game/character'
import { BIG_HAIR, BUILDS, DEFAULT_PROFILE, gameHeight, heightScale, type HairStyle, type Profile } from '../game/look'
import { useSave } from '../game/store'
import { useTogether } from '../lib/together'
import { useTour } from '../lib/tour'
import { CLOTHING, type Clothing } from '../game/wardrobe'

type Rig = {
  body: React.RefObject<Group | null>
  legL: React.RefObject<Group | null>
  legR: React.RefObject<Group | null>
  armL: React.RefObject<Group | null>
  armR: React.RefObject<Group | null>
  eyes: React.RefObject<Group | null>
}

/** What pose to show right now (and whether the legs should be walking) */
type Drive = (t: number) => { pose: Pose | 'wave'; walking: boolean }

/** Moves the limbs for a pose: idle breathing, walking, sitting, lying down, dancing, or waving (in the preview) */
function animate(rig: Rig, pose: Pose | 'wave', walking: boolean, t: number) {
  const b = rig.body.current
  if (!b) return
  const swing = walking ? Math.sin(t * 12) * 0.6 : 0
  const sit = pose === 'sit'
  const lie = pose === 'lie'
  const dance = pose === 'dance'
  b.rotation.x = lie ? -Math.PI / 2 : 0
  b.position.y = lie ? 0.1 : sit ? -0.17 : walking ? Math.abs(Math.sin(t * 12)) * 0.03 : dance ? Math.abs(Math.sin(t * 6)) * 0.06 : Math.sin(t * 2) * 0.006
  b.position.z = lie ? 0.32 : 0
  b.rotation.y = dance ? Math.sin(t * 3) * 0.5 : 0
  rig.legL.current!.rotation.x = sit ? -Math.PI / 2 : swing
  rig.legR.current!.rotation.x = sit ? -Math.PI / 2 : -swing
  rig.armL.current!.rotation.x = dance ? -2.6 + Math.sin(t * 6) * 0.3 : sit ? -0.5 : -swing * 0.8
  rig.armR.current!.rotation.x = pose === 'wave' ? -2.7 : dance ? -2.6 - Math.sin(t * 6) * 0.3 : sit ? -0.5 : swing * 0.8
  rig.armL.current!.rotation.z = 0.12
  rig.armR.current!.rotation.z = pose === 'wave' ? -0.25 + Math.sin(t * 8) * 0.35 : -0.12
  rig.eyes.current!.scale.y = lie ? 0.15 : t % 3.6 < 0.12 ? 0.15 : 1
}

/** A piece of clothing in the color the player dyed it, if they picked one */
const dyed = (c: Clothing, color?: string): Clothing => (color ? { ...c, color } : c)

const Mat = ({ color, rough = 0.8 }: { color: string; rough?: number }) => <meshStandardMaterial color={color} roughness={rough} />

/** A rounded block of hair: size, position, and an optional tilt */
function Lock({ color, size, at, rz = 0, rx = 0 }: { color: string; size: [number, number, number]; at: [number, number, number]; rz?: number; rx?: number }) {
  return (
    <RoundedBox args={size} radius={Math.min(...size) * 0.45} position={at} rotation={[rx, 0, rz]}>
      <Mat color={color} />
    </RoundedBox>
  )
}

/** A round bit of hair (buns, curls, braid links) */
function Puff({ color, r, at, scale = [1, 1, 1] }: { color: string; r: number; at: [number, number, number]; scale?: [number, number, number] }) {
  return (
    <mesh position={at} scale={scale}>
      <sphereGeometry args={[r, 12, 10]} />
      <Mat color={color} />
    </mesh>
  )
}

/** A braid hanging down from a point: a column of links, each a little smaller */
const Braid = ({ color, x, y, z, links = 4 }: { color: string; x: number; y: number; z: number; links?: number }) => (
  <>
    {Array.from({ length: links }, (_, k) => (
      <Puff key={k} color={color} r={0.05 - k * 0.005} at={[x, y - k * 0.075, z]} scale={[1, 1.15, 1]} />
    ))}
  </>
)

function Hair({ style, color, hatOn }: { style: HairStyle; color: string; hatOn: boolean }) {
  if (style === 'bald') return null
  // Under a hat, tall styles tuck in so nothing pokes through
  const s: HairStyle = hatOn && BIG_HAIR.includes(style) ? 'short' : style
  const extra = MORE_HAIR[s]
  if (extra) return extra(color)
  const cap = (
    <RoundedBox args={[0.41, s === 'buzz' ? 0.12 : 0.2, 0.36]} radius={s === 'buzz' ? 0.05 : 0.09} position={[0, s === 'buzz' ? 0.13 : 0.1, -0.015]}>
      <Mat color={color} />
    </RoundedBox>
  )
  const back = (h: number, y: number) => (
    <RoundedBox args={[0.41, h, 0.12]} radius={0.05} position={[0, y, -0.12]}>
      <Mat color={color} />
    </RoundedBox>
  )
  const fringe = (tilt = -0.12, x = 0.02) => (
    <RoundedBox args={[0.36, 0.07, 0.06]} radius={0.03} position={[x, 0.07, 0.15]} rotation-z={tilt}>
      <Mat color={color} />
    </RoundedBox>
  )
  switch (s) {
    case 'buzz':
      return cap
    case 'short':
      return (
        <>
          {cap}
          {back(0.24, 0.02)}
          {fringe()}
        </>
      )
    case 'sidePart':
      return (
        <>
          {cap}
          {back(0.24, 0.02)}
          <RoundedBox args={[0.3, 0.09, 0.07]} radius={0.035} position={[0.06, 0.09, 0.15]} rotation-z={-0.35}>
            <Mat color={color} />
          </RoundedBox>
        </>
      )
    case 'spiky':
      return (
        <>
          {cap}
          {back(0.22, 0.03)}
          {[-0.12, -0.04, 0.04, 0.12].map((x, k) => (
            <mesh key={x} position={[x, 0.24, -0.02 + (k % 2) * 0.05]} rotation-z={x * 1.5}>
              <coneGeometry args={[0.05, 0.13, 6]} />
              <Mat color={color} />
            </mesh>
          ))}
          {fringe(-0.2)}
        </>
      )
    case 'bob':
      return (
        <>
          {cap}
          {back(0.32, -0.02)}
          {[-0.2, 0.2].map((x) => (
            <RoundedBox key={x} args={[0.06, 0.3, 0.3]} radius={0.03} position={[x, -0.01, -0.01]}>
              <Mat color={color} />
            </RoundedBox>
          ))}
          {fringe(0, 0)}
        </>
      )
    case 'long':
    case 'ponytail':
    case 'buns':
    case 'curly':
      break
  }
  if (s === 'curly')
    return (
      <>
        {[
          [-0.15, 0.13, 0.02],
          [0, 0.18, 0.02],
          [0.15, 0.13, 0.02],
          [-0.18, 0.02, -0.08],
          [0.18, 0.02, -0.08],
          [-0.09, 0.15, -0.13],
          [0.09, 0.15, -0.13],
          [0, 0.06, -0.17],
          [-0.12, 0.1, 0.12],
          [0.12, 0.1, 0.12],
        ].map(([x, y, z], k) => (
          <mesh key={k} position={[x, y, z]}>
            <sphereGeometry args={[0.095, 12, 10]} />
            <Mat color={color} />
          </mesh>
        ))}
      </>
    )
  return (
    <>
      {cap}
      {back(s === 'long' ? 0.5 : 0.24, s === 'long' ? -0.1 : 0.02)}
      {fringe()}
      {s === 'long' &&
        [-0.2, 0.2].map((x) => (
          <RoundedBox key={x} args={[0.06, 0.42, 0.22]} radius={0.03} position={[x, -0.06, -0.05]}>
            <Mat color={color} />
          </RoundedBox>
        ))}
      {s === 'ponytail' && (
        <mesh position={[0, 0.02, -0.25]} scale={[0.8, 1.4, 0.8]}>
          <sphereGeometry args={[0.08, 12, 10]} />
          <Mat color={color} />
        </mesh>
      )}
      {s === 'buns' &&
        [-0.14, 0.14].map((x) => (
          <mesh key={x} position={[x, 0.22, -0.04]}>
            <sphereGeometry args={[0.085, 12, 10]} />
            <Mat color={color} />
          </mesh>
        ))}
    </>
  )
}

// The head is 0.38 wide, 0.34 tall and 0.33 deep, centered on 0: the top is at y 0.17, the face at z 0.165

/** The usual cap of hair on top of the head */
const Top = ({ color, h = 0.2, y = 0.1 }: { color: string; h?: number; y?: number }) => <Lock color={color} size={[0.41, h, 0.36]} at={[0, y, -0.015]} />
/** Hair down the back of the head */
const Back = ({ color, h, y, w = 0.41 }: { color: string; h: number; y: number; w?: number }) => <Lock color={color} size={[w, h, 0.12]} at={[0, y, -0.12]} />
/** Hair over the forehead */
const Fringe = ({ color, tilt = -0.12, x = 0.02, y = 0.07, h = 0.07 }: { color: string; tilt?: number; x?: number; y?: number; h?: number }) => <Lock color={color} size={[0.36, h, 0.06]} at={[x, y, 0.15]} rz={tilt} />
/** Hair down both sides of the face */
const Sides = ({ color, h, y = -0.06 }: { color: string; h: number; y?: number }) => (
  <>
    {[-0.2, 0.2].map((x) => (
      <Lock key={x} color={color} size={[0.06, h, 0.24]} at={[x, y, -0.05]} />
    ))}
  </>
)

/** The hairstyles added in 1.1.0, each built from the same few pieces */
const MORE_HAIR: Partial<Record<HairStyle, (c: string) => React.ReactNode>> = {
  pixie: (c) => (
    <>
      <Top color={c} h={0.17} y={0.11} />
      <Back color={c} h={0.17} y={0.05} />
      <Lock color={c} size={[0.3, 0.06, 0.06]} at={[0.05, 0.1, 0.155]} rz={-0.28} />
    </>
  ),
  bowl: (c) => (
    <>
      <Lock color={c} size={[0.43, 0.2, 0.38]} at={[0, 0.09, -0.01]} />
      <Fringe color={c} tilt={0} x={0} y={0.06} h={0.09} />
      {[-0.205, 0.205].map((x) => (
        <Lock key={x} color={c} size={[0.05, 0.16, 0.3]} at={[x, 0.02, -0.01]} />
      ))}
      <Back color={c} h={0.2} y={0.03} />
    </>
  ),
  mohawk: (c) => (
    <>
      <Lock color={c} size={[0.4, 0.1, 0.35]} at={[0, 0.13, -0.015]} />
      {[-0.13, -0.065, 0, 0.065, 0.13].map((z, k) => (
        <Lock key={z} color={c} size={[0.07, 0.16 - Math.abs(k - 2) * 0.02, 0.075]} at={[0, 0.25 - Math.abs(k - 2) * 0.01, z]} />
      ))}
    </>
  ),
  fauxhawk: (c) => (
    <>
      <Top color={c} h={0.17} y={0.11} />
      {[-0.08, 0, 0.08].map((z) => (
        <mesh key={z} position={[0, 0.23, z]}>
          <coneGeometry args={[0.06, 0.12, 6]} />
          <Mat color={c} />
        </mesh>
      ))}
    </>
  ),
  quiff: (c) => (
    <>
      <Top color={c} />
      <Back color={c} h={0.2} y={0.04} />
      <Lock color={c} size={[0.32, 0.13, 0.16]} at={[0, 0.23, 0.1]} rx={-0.45} />
    </>
  ),
  undercut: (c) => (
    <>
      <Lock color={c} size={[0.4, 0.09, 0.35]} at={[0, 0.13, -0.015]} />
      <Lock color={c} size={[0.36, 0.1, 0.34]} at={[0.02, 0.21, 0]} rz={-0.08} />
      <Lock color={c} size={[0.26, 0.07, 0.07]} at={[0.08, 0.17, 0.15]} rz={-0.4} />
    </>
  ),
  mullet: (c) => (
    <>
      <Top color={c} />
      <Fringe color={c} />
      <Back color={c} h={0.44} y={-0.07} w={0.36} />
    </>
  ),
  afro: (c) => <Puff color={c} r={0.27} at={[0, 0.12, -0.06]} scale={[1.1, 0.9, 0.85]} />,
  wavy: (c) => (
    <>
      <Top color={c} />
      <Fringe color={c} tilt={-0.2} />
      <Back color={c} h={0.46} y={-0.08} />
      {[-0.2, 0.2].map((x) =>
        [0, 1, 2].map((k) => <Lock key={`${x}${k}`} color={c} size={[0.07, 0.15, 0.22]} at={[x + (k % 2 ? 0.015 : -0.015) * Math.sign(x), 0.04 - k * 0.13, -0.05]} rz={(k % 2 ? 0.15 : -0.15) * Math.sign(x)} />),
      )}
    </>
  ),
  braids: (c) => (
    <>
      <Top color={c} />
      <Fringe color={c} tilt={0} x={0} />
      <Back color={c} h={0.24} y={0.02} />
      <Braid color={c} x={-0.17} y={-0.07} z={-0.06} />
      <Braid color={c} x={0.17} y={-0.07} z={-0.06} />
    </>
  ),
  pigtails: (c) => (
    <>
      <Top color={c} />
      <Fringe color={c} tilt={0} x={0} />
      <Back color={c} h={0.24} y={0.02} />
      {[-0.25, 0.25].map((x) => (
        <Puff key={x} color={c} r={0.07} at={[x, -0.04, -0.06]} scale={[0.85, 1.5, 0.85]} />
      ))}
    </>
  ),
  twinTails: (c) => (
    <>
      <Top color={c} />
      <Fringe color={c} tilt={0} x={0} />
      <Back color={c} h={0.24} y={0.02} />
      {[-0.24, 0.24].map((x) => (
        <group key={x}>
          <Puff color={c} r={0.06} at={[x, 0.15, -0.06]} />
          <Lock color={c} size={[0.09, 0.42, 0.09]} at={[x * 1.12, -0.06, -0.08]} rz={Math.sign(x) * 0.1} />
        </group>
      ))}
    </>
  ),
  topknot: (c) => (
    <>
      <Top color={c} h={0.17} y={0.11} />
      <Back color={c} h={0.18} y={0.05} />
      <Puff color={c} r={0.09} at={[0, 0.27, -0.03]} />
    </>
  ),
  manBun: (c) => (
    <>
      <Top color={c} />
      <Back color={c} h={0.2} y={0.04} />
      <Puff color={c} r={0.08} at={[0, 0.1, -0.23]} />
    </>
  ),
  halfUp: (c) => (
    <>
      <Top color={c} />
      <Fringe color={c} />
      <Back color={c} h={0.5} y={-0.1} />
      <Sides color={c} h={0.42} />
      <Puff color={c} r={0.065} at={[0, 0.16, -0.22]} />
    </>
  ),
  sideBraid: (c) => (
    <>
      <Top color={c} />
      <Fringe color={c} tilt={-0.25} />
      <Back color={c} h={0.24} y={0.02} />
      <Braid color={c} x={0.17} y={-0.04} z={0.06} links={5} />
    </>
  ),
  bangs: (c) => (
    <>
      <Top color={c} />
      <Fringe color={c} tilt={0} x={0} y={0.06} h={0.1} />
      <Back color={c} h={0.52} y={-0.11} />
      <Sides color={c} h={0.44} />
    </>
  ),
  dreads: (c) => (
    <>
      <Top color={c} />
      {Array.from({ length: 11 }, (_, k) => {
        const a = -Math.PI * 0.85 + (k / 10) * Math.PI * 1.7
        return <Lock key={k} color={c} size={[0.05, 0.36, 0.05]} at={[Math.sin(a) * 0.2, -0.05, -Math.cos(a) * 0.16 - 0.02]} rz={Math.sin(a) * 0.12} />
      })}
    </>
  ),
  slicked: (c) => (
    <>
      <Lock color={c} size={[0.41, 0.17, 0.37]} at={[0, 0.11, -0.03]} />
      <Back color={c} h={0.22} y={0.03} />
    </>
  ),
  shag: (c) => (
    <>
      <Top color={c} />
      {[-0.11, 0, 0.11].map((x, k) => (
        <Lock key={x} color={c} size={[0.13, 0.09 - (k % 2) * 0.02, 0.06]} at={[x, 0.065 + (k % 2) * 0.01, 0.15]} rz={x * -1.5} />
      ))}
      <Back color={c} h={0.36} y={-0.04} />
      <Sides color={c} h={0.3} y={-0.02} />
    </>
  ),
}

function Hat({ c }: { c: Clothing }) {
  switch (c.cut) {
    case 'beret':
      return (
        <group position={[0.02, 0.19, -0.01]} rotation-z={-0.22}>
          <mesh scale={[1, 0.32, 1]}>
            <sphereGeometry args={[0.235, 22, 12]} />
            <Mat color={c.color} />
          </mesh>
          <mesh position-y={0.08}>
            <cylinderGeometry args={[0.012, 0.012, 0.04, 6]} />
            <Mat color={c.color} />
          </mesh>
        </group>
      )
    case 'tophat':
      return (
        <group position-y={0.17}>
          <mesh position-y={0.005}>
            <cylinderGeometry args={[0.27, 0.27, 0.02, 28]} />
            <Mat color={c.color} rough={0.5} />
          </mesh>
          <mesh position-y={0.14}>
            <cylinderGeometry args={[0.16, 0.15, 0.27, 24]} />
            <Mat color={c.color} rough={0.5} />
          </mesh>
          <mesh position-y={0.04}>
            <cylinderGeometry args={[0.152, 0.152, 0.05, 24]} />
            <Mat color={c.accent ?? '#c94f3b'} />
          </mesh>
        </group>
      )
    case 'bow':
      return (
        <group position={[0.12, 0.2, 0.02]} rotation-z={-0.35}>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position-x={sx * 0.055} rotation-z={(sx * Math.PI) / 2} scale={[1, 1, 0.5]}>
              <coneGeometry args={[0.05, 0.1, 4]} />
              <Mat color={c.color} />
            </mesh>
          ))}
          <mesh>
            <sphereGeometry args={[0.025, 10, 8]} />
            <Mat color={c.color} />
          </mesh>
        </group>
      )
    case 'catEars':
      return (
        <group position-y={0.2}>
          {[-0.12, 0.12].map((x) => (
            <group key={x} position-x={x} rotation-z={-x * 1.6}>
              <mesh scale={[1, 1, 0.45]}>
                <coneGeometry args={[0.065, 0.13, 4]} />
                <Mat color={c.color} />
              </mesh>
              <mesh position={[0, -0.01, 0.018]} scale={[1, 1, 0.3]}>
                <coneGeometry args={[0.035, 0.08, 4]} />
                <Mat color={c.accent ?? '#f6b8c2'} />
              </mesh>
            </group>
          ))}
        </group>
      )
    case 'halo':
      return (
        <mesh position-y={0.36} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.15, 0.02, 10, 32]} />
          <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.8} roughness={0.3} />
        </mesh>
      )
    case 'cap':
      return (
        <group position-y={0.13}>
          <mesh scale={[1.1, 0.75, 1.05]}>
            <sphereGeometry args={[0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Mat color={c.color} />
          </mesh>
          <RoundedBox args={[0.3, 0.025, 0.16]} radius={0.01} position={[0, 0.005, 0.2]}>
            <Mat color={c.color} />
          </RoundedBox>
        </group>
      )
    case 'beanie':
      return (
        <group position-y={0.13}>
          <RoundedBox args={[0.42, 0.18, 0.38]} radius={0.09} position-y={0.05}>
            <Mat color={c.color} />
          </RoundedBox>
          <RoundedBox args={[0.44, 0.07, 0.4]} radius={0.03} position-y={-0.03}>
            <Mat color={c.color} rough={1} />
          </RoundedBox>
          <mesh position-y={0.17}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <Mat color="#fff8ee" />
          </mesh>
        </group>
      )
    case 'bucket':
      // A deep crown that sits down over the hair, and a short brim that slopes down a little
      return (
        <group position-y={0.17}>
          <mesh>
            <cylinderGeometry args={[0.19, 0.245, 0.2, 24]} />
            <Mat color={c.color} />
          </mesh>
          <mesh position-y={0.1}>
            <cylinderGeometry args={[0.19, 0.19, 0.012, 24]} />
            <Mat color={c.color} />
          </mesh>
          <mesh position-y={-0.1}>
            <cylinderGeometry args={[0.25, 0.32, 0.04, 28]} />
            <Mat color={c.color} />
          </mesh>
        </group>
      )
    case 'crown':
      return (
        <group position-y={0.22}>
          <mesh>
            <cylinderGeometry args={[0.16, 0.16, 0.07, 20, 1, true]} />
            <meshStandardMaterial color={c.color} metalness={0.7} roughness={0.25} side={2} />
          </mesh>
          {Array.from({ length: 6 }, (_, k) => (
            <mesh key={k} position={[Math.sin((k / 6) * Math.PI * 2) * 0.16, 0.07, Math.cos((k / 6) * Math.PI * 2) * 0.16]}>
              <coneGeometry args={[0.03, 0.08, 4]} />
              <meshStandardMaterial color={c.color} metalness={0.7} roughness={0.25} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.165]}>
            <sphereGeometry args={[0.025, 10, 8]} />
            <meshStandardMaterial color={c.accent} emissive={c.accent} emissiveIntensity={0.4} />
          </mesh>
        </group>
      )
    case 'flowers':
      return (
        <group position-y={0.19}>
          {Array.from({ length: 9 }, (_, k) => (
            <mesh key={k} position={[Math.sin((k / 9) * Math.PI * 2) * 0.19, 0, Math.cos((k / 9) * Math.PI * 2) * 0.17]}>
              <sphereGeometry args={[0.045, 10, 8]} />
              <Mat color={k % 2 ? c.accent! : c.color} />
            </mesh>
          ))}
        </group>
      )
    default:
      return null
  }
}

function FaceWear({ c, bigHair = false }: { c: Clothing; bigHair?: boolean }) {
  if (c.cut === 'headphones') {
    // Big hair (curls, buns, spikes) gets roomier headphones, so the band sits on top of it
    const r = bigHair ? 0.3 : 0.255
    const cup = bigHair ? 0.285 : 0.235
    return (
      <group>
        {/* The band arches over the top of the head, from ear to ear, clear of the hair */}
        <mesh position-y={0.02}>
          <torusGeometry args={[r, 0.024, 8, 28, Math.PI]} />
          <Mat color={c.accent ?? '#333'} />
        </mesh>
        {[-cup, cup].map((x) => (
          <RoundedBox key={x} args={[0.07, 0.15, 0.13]} radius={0.03} position={[x, -0.01, 0]}>
            <Mat color={c.color} />
          </RoundedBox>
        ))}
      </group>
    )
  }
  if (c.cut === 'mask')
    return (
      <group position={[0, -0.095, 0.168]}>
        <RoundedBox args={[0.24, 0.12, 0.03]} radius={0.012}>
          <Mat color={c.color} rough={1} />
        </RoundedBox>
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[sx * 0.16, 0.03, -0.06]} rotation-y={sx * 0.9}>
            <boxGeometry args={[0.13, 0.008, 0.008]} />
            <Mat color={c.color} />
          </mesh>
        ))}
      </group>
    )
  if (c.cut === 'monocle')
    return (
      <group position={[0.075, -0.02, 0.175]}>
        <mesh>
          <torusGeometry args={[0.05, 0.008, 6, 20]} />
          <meshStandardMaterial color={c.color} metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0.035, -0.1, -0.01]} rotation-z={0.3}>
          <boxGeometry args={[0.005, 0.15, 0.005]} />
          <meshStandardMaterial color={c.color} metalness={0.7} roughness={0.25} />
        </mesh>
      </group>
    )
  if (c.cut === 'hearts')
    return (
      // Two heart-shaped lenses, out in front of the eyes so they cover them like real shades
      <group position={[0, -0.02, 0.18]}>
        {[-0.078, 0.078].map((x) => (
          <mesh key={x} position-x={x} scale={0.115} geometry={HEART}>
            <meshStandardMaterial color={c.color} roughness={0.2} metalness={0.15} />
          </mesh>
        ))}
        <mesh position-z={0.01}>
          <boxGeometry args={[0.045, 0.012, 0.012]} />
          <Mat color={c.color} />
        </mesh>
      </group>
    )
  const shades = c.cut === 'shades'
  return (
    <group position={[0, -0.02, 0.172]}>
      {[-0.075, 0.075].map((x) =>
        shades ? (
          <RoundedBox key={x} args={[0.11, 0.075, 0.02]} radius={0.015} position-x={x}>
            <meshStandardMaterial color={c.color} roughness={0.15} metalness={0.3} />
          </RoundedBox>
        ) : (
          <mesh key={x} position-x={x}>
            <torusGeometry args={[0.048, 0.008, 6, 20]} />
            <Mat color={c.color} />
          </mesh>
        ),
      )}
      <mesh>
        <boxGeometry args={[0.05, 0.01, 0.01]} />
        <Mat color={c.color} />
      </mesh>
    </group>
  )
}

/** A heart outline (point down), about 1 wide and 1 tall, thick enough to read as a lens */
const HEART = (() => {
  const h = new Shape()
  h.moveTo(0, -0.5)
  h.bezierCurveTo(-0.12, -0.32, -0.5, -0.12, -0.5, 0.15)
  h.bezierCurveTo(-0.5, 0.44, -0.18, 0.55, 0, 0.3)
  h.bezierCurveTo(0.18, 0.55, 0.5, 0.44, 0.5, 0.15)
  h.bezierCurveTo(0.5, -0.12, 0.12, -0.32, 0, -0.5)
  const g = new ExtrudeGeometry(h, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 16 })
  g.center()
  return g
})()

/** What sits on top of a slipper's toe: long bunny ears, round bear ears with a snout, or nothing (plain ones) */
function SlipperFace({ c }: { c: Clothing }) {
  const bunny = c.id === 'slippers'
  const bear = c.id === 'slippers-bear'
  if (!bunny && !bear) return null
  return (
    // On the toe, in front of the pant leg, so the ears and face aren't hidden
    <group position={[0, 0.02, 0.055]}>
      {[-1, 1].map((sx) =>
        bunny ? (
          <group key={sx} position={[sx * 0.022, 0.035, 0]} rotation={[0.45, 0, -sx * 0.3]}>
            <mesh scale={[0.45, 1.25, 0.35]}>
              <sphereGeometry args={[0.03, 10, 8]} />
              <Mat color={c.color} />
            </mesh>
            <mesh position-z={0.006} scale={[0.22, 0.85, 0.2]}>
              <sphereGeometry args={[0.03, 10, 8]} />
              <Mat color="#f6a8bd" />
            </mesh>
          </group>
        ) : (
          <mesh key={sx} position={[sx * 0.034, 0.014, 0]}>
            <sphereGeometry args={[0.016, 10, 8]} />
            <Mat color={c.color} />
          </mesh>
        ),
      )}
      {/* Little eyes, and a bear's snout */}
      {[-1, 1].map((sx) => (
        <mesh key={`e${sx}`} position={[sx * 0.018, 0.004, 0.026]}>
          <sphereGeometry args={[0.006, 8, 6]} />
          <meshBasicMaterial color="#2b2233" />
        </mesh>
      ))}
      {bear && (
        <mesh position={[0, -0.008, 0.032]} scale={[1, 0.7, 0.6]}>
          <sphereGeometry args={[0.014, 10, 8]} />
          <Mat color="#e8d2b8" />
        </mesh>
      )}
    </group>
  )
}

/** A leg: thigh, shin, then the shoe */
function LegParts({ upper, lower, shoes, skin }: { upper: string; lower: string; shoes: Clothing; skin: string }) {
  if (shoes.cut === 'sandals')
    return (
      <>
        <mesh position-y={-0.05} castShadow>
          <boxGeometry args={[0.1, 0.1, 0.11]} />
          <Mat color={upper} />
        </mesh>
        <mesh position-y={-0.12} castShadow>
          <boxGeometry args={[0.095, 0.06, 0.105]} />
          <Mat color={lower} />
        </mesh>
        {/* Bare feet on a flat sole, with a strap across */}
        <RoundedBox args={[0.1, 0.045, 0.14]} radius={0.018} position={[0, -0.18, 0.015]} castShadow>
          <Mat color={skin} />
        </RoundedBox>
        <mesh position={[0, -0.207, 0.015]}>
          <boxGeometry args={[0.118, 0.018, 0.155]} />
          <Mat color={shoes.color} />
        </mesh>
        <mesh position={[0, -0.17, 0.035]}>
          <boxGeometry args={[0.112, 0.016, 0.03]} />
          <Mat color={shoes.color} />
        </mesh>
      </>
    )
  return (
    <>
      <mesh position-y={-0.05} castShadow>
        <boxGeometry args={[0.1, 0.1, 0.11]} />
        <Mat color={upper} />
      </mesh>
      <mesh position-y={-0.12} castShadow>
        <boxGeometry args={[0.095, 0.06, 0.105]} />
        <Mat color={lower} />
      </mesh>
      {shoes.cut === 'boots' ? (
        <mesh position={[0, -0.16, 0.01]} castShadow>
          <boxGeometry args={[0.115, 0.1, 0.14]} />
          <Mat color={shoes.color} />
        </mesh>
      ) : (
        <group position={[0, -0.18, 0.015]}>
          <RoundedBox args={[0.115, 0.05, 0.15]} radius={0.02} castShadow>
            <Mat color={shoes.color} />
          </RoundedBox>
          {shoes.cut === 'sneakers' && (
            <mesh position-y={-0.02}>
              <boxGeometry args={[0.118, 0.012, 0.152]} />
              <Mat color="#ffffff" />
            </mesh>
          )}
          {shoes.cut === 'slippers' && <SlipperFace c={shoes} />}
        </group>
      )}
    </>
  )
}

/** An arm: sleeve, forearm, hand */
function ArmParts({ sleeve, forearm, skin }: { sleeve: string; forearm: string; skin: string }) {
  return (
    <>
      <RoundedBox args={[0.078, 0.11, 0.088]} radius={0.03} position-y={-0.045} castShadow>
        <Mat color={sleeve} />
      </RoundedBox>
      <RoundedBox args={[0.07, 0.1, 0.08]} radius={0.03} position-y={-0.13} castShadow>
        <Mat color={forearm} />
      </RoundedBox>
      <mesh position-y={-0.2}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <Mat color={skin} />
      </mesh>
    </>
  )
}

/** The whole character, dressed. Limbs hang off the rig so poses can move them. */
function Body({ p, height, drive }: { p: Profile; height: number; drive: Drive }) {
  const body = useRef<Group>(null)
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)
  const eyes = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const { pose, walking } = drive(t)
    animate({ body, legL, legR, armL, armR, eyes }, pose, walking, t)
  })
  const w = BUILDS.find((b) => b.id === p.build)?.width ?? 1
  const hs = heightScale(height)
  const top = dyed(CLOTHING[p.outfit.top ?? 'tee-sky'] ?? CLOTHING['tee-sky'], p.tint?.top)
  const bottom = dyed(CLOTHING[p.outfit.bottom ?? 'jeans'] ?? CLOTHING.jeans, p.tint?.bottom)
  const shoes = dyed(CLOTHING[p.outfit.shoes ?? 'sneakers-white'] ?? CLOTHING['sneakers-white'], p.tint?.shoes)
  const hat = p.outfit.hat ? (CLOTHING[p.outfit.hat] ?? null) : null
  const face = p.outfit.face ? (CLOTHING[p.outfit.face] ?? null) : null
  const longSleeves = top.cut === 'longsleeve' || top.cut === 'hoodie' || top.cut === 'jacket'
  // A tank top leaves the shoulders bare
  const sleeve = top.cut === 'tank' ? p.skin : top.color
  const lowerLeg = bottom.cut === 'pants' ? bottom.color : p.skin
  const upperLeg = bottom.cut === 'skirt' ? p.skin : bottom.color
  const female = p.gender === 'female'

  return (
    <group ref={body} scale={[w, hs, w]}>
      {/* Legs swing from the hips */}
      <group ref={legL} position={[-0.065, 0.2, 0]}>
        <LegParts upper={upperLeg} lower={lowerLeg} shoes={shoes} skin={p.skin} />
      </group>
      <group ref={legR} position={[0.065, 0.2, 0]}>
        <LegParts upper={upperLeg} lower={lowerLeg} shoes={shoes} skin={p.skin} />
      </group>

      {/* Body: the top, with a skirt or dress flaring out below */}
      <RoundedBox args={[0.3, 0.26, 0.2]} radius={0.06} position-y={0.32} castShadow>
        <Mat color={top.cut === 'jacket' ? top.accent! : top.color} />
      </RoundedBox>
      {top.cut === 'jacket' &&
        [-0.095, 0.095].map((x) => (
          <RoundedBox key={x} args={[0.115, 0.27, 0.215]} radius={0.05} position={[x, 0.32, 0]}>
            <Mat color={top.color} />
          </RoundedBox>
        ))}
      {top.cut === 'longsleeve' &&
        top.accent &&
        [0.27, 0.36].map((y) => (
          <mesh key={y} position-y={y}>
            <boxGeometry args={[0.305, 0.03, 0.205]} />
            <Mat color={top.accent!} />
          </mesh>
        ))}
      {top.cut === 'hoodie' && (
        <>
          <RoundedBox args={[0.3, 0.12, 0.13]} radius={0.05} position={[0, 0.46, -0.1]}>
            <Mat color={top.color} />
          </RoundedBox>
          {top.accent && (
            <mesh position={[0, 0.27, 0.102]}>
              <boxGeometry args={[0.16, 0.07, 0.01]} />
              <Mat color={top.accent} />
            </mesh>
          )}
        </>
      )}
      {(top.cut === 'dress' || bottom.cut === 'skirt') && (
        <mesh position-y={top.cut === 'dress' ? 0.13 : 0.15}>
          <cylinderGeometry args={[0.15, top.cut === 'dress' ? 0.23 : 0.2, top.cut === 'dress' ? 0.16 : 0.11, 20]} />
          <Mat color={top.cut === 'dress' ? top.color : bottom.color} />
        </mesh>
      )}
      {top.cut === 'dress' && top.accent && (
        <mesh position-y={0.21}>
          <boxGeometry args={[0.305, 0.025, 0.205]} />
          <Mat color={top.accent} />
        </mesh>
      )}

      {/* Arms swing from the shoulders */}
      <group ref={armL} position={[-0.185, 0.42, 0]}>
        <ArmParts sleeve={sleeve} forearm={longSleeves ? top.color : p.skin} skin={p.skin} />
      </group>
      <group ref={armR} position={[0.185, 0.42, 0]}>
        <ArmParts sleeve={sleeve} forearm={longSleeves ? top.color : p.skin} skin={p.skin} />
      </group>

      {/* The head keeps its shape whatever the height and build */}
      <group position-y={0.62} scale={[1 / w, 1 / hs, 1 / w]}>
        <RoundedBox args={[0.38, 0.34, 0.33]} radius={0.12} castShadow>
          <Mat color={p.skin} />
        </RoundedBox>
        <Hair style={p.hair} color={p.hairColor} hatOn={!!hat} />
        <group ref={eyes} position={[0, -0.02, 0.166]}>
          {[-0.075, 0.075].map((x) => (
            <group key={x} position-x={x}>
              <mesh scale={[1, 1.35, 0.5]}>
                <sphereGeometry args={[0.03, 12, 12]} />
                <meshStandardMaterial color={p.eyes} roughness={0.3} />
              </mesh>
              <mesh position={[0.01, 0.014, 0.014]}>
                <sphereGeometry args={[0.009, 8, 8]} />
                <meshBasicMaterial color="#fff" />
              </mesh>
              {female && (
                <mesh position={[x > 0 ? 0.03 : -0.03, 0.035, 0]} rotation-z={x > 0 ? -0.5 : 0.5}>
                  <boxGeometry args={[0.025, 0.01, 0.01]} />
                  <meshStandardMaterial color="#2a1f1a" />
                </mesh>
              )}
            </group>
          ))}
        </group>
        <mesh position={[0, -0.09, 0.166]}>
          <boxGeometry args={[0.045, 0.012, 0.01]} />
          <meshStandardMaterial color={female ? '#c9566b' : '#7a4a3a'} />
        </mesh>
        {[-0.12, 0.12].map((x) => (
          <mesh key={x} position={[x, -0.07, 0.163]} scale={[1, 0.6, 0.2]}>
            <sphereGeometry args={[0.03, 10, 10]} />
            <meshBasicMaterial color="#f29aa0" transparent opacity={0.7} />
          </mesh>
        ))}
        {hat && <Hat c={hat} />}
        {face && <FaceWear c={face} bigHair={!hat && BIG_HAIR.includes(p.hair)} />}
      </group>
    </group>
  )
}

type HeartPop = { id: number; n: number }

/** In the room the game decides the pose; in previews the character waves every few seconds */
const avatarDrive: Drive = () => ({ pose: me.pose, walking: me.pose === 'walk' })
const previewDrive: Drive = (t) => ({ pose: t % 6 < 1.4 ? 'wave' : 'stand', walking: false })

/** Your character in the room: driven by the game (walking, using furniture, hearts popping up) */
export default function Avatar() {
  const profile = useSave((s) => s.profile) ?? DEFAULT_PROFILE
  const root = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)
  const [pops, setPops] = useState<HeartPop[]>([])
  const nextId = useRef(0)
  const height = gameHeight(profile)

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    step(Math.min(dt, 0.05), t, (n) => {
      const id = nextId.current++
      setPops((p) => [...p, { id, n }])
      setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1400)
    })
    const r = root.current
    if (!r) return
    r.position.set(me.x, me.y, me.z)
    const diff = ((me.rotY - r.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    r.rotation.y += diff * Math.min(1, dt * 12)
    if (shadow.current) shadow.current.visible = me.pose !== 'lie' && me.y === 0
  })

  return (
    // Drawn a bit larger than the furniture scale so the character reads clearly in a big studio
    <group ref={root} scale={1.25}>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position-y={0.008}>
        <circleGeometry args={[0.17, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <Body p={profile} height={height} drive={avatarDrive} />
      <Bubble y={1.18} />
      {pops.map((p) => (
        <Html key={p.id} position={[0, 1.05, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="heart-pop">+{p.n} 💗</div>
        </Html>
      ))}
    </group>
  )
}

/** A preview of a character for the creator and the wardrobe: turns slowly and waves now and then */
export function Mannequin({ profile, height }: { profile: Profile; height: number }) {
  const root = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (root.current) root.current.rotation.y = Math.sin(clock.elapsedTime * 0.6) * 0.5
  })
  return (
    <group ref={root}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.004}>
        <circleGeometry args={[0.22, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <Body p={profile} height={height} drive={previewDrive} />
    </group>
  )
}

/** Someone else in the room (your partner, or the friend you're visiting): stands around, waves now and then, with their name above */
const guestDrive: Drive = (t) => ({ pose: t % 9 < 1.2 ? 'wave' : 'stand', walking: false })
/**
 * Another character's name: hidden until you point at them with the mouse (or tap them on a phone, which
 * shows it for a few seconds). `always` keeps it showing, for the courier's message.
 */
function useNameTag(always = false) {
  const [on, setOn] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const handlers = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      if (e.pointerType !== 'mouse') return
      e.stopPropagation()
      setOn(true)
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => e.pointerType === 'mouse' && setOn(false),
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      if (e.pointerType === 'mouse') return
      setOn(true)
      clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setOn(false), 2500)
    },
  }
  return { show: always || on, handlers }
}

// The tag stays in the page and is only hidden, so hovering never adds or removes a 3D label mid-frame
function NameTag({ name, show, y = 1.02 }: { name: string; show: boolean; y?: number }) {
  return (
    <Html position={[0, y, 0]} center zIndexRange={[15, 0]} style={{ pointerEvents: 'none', opacity: show ? 1 : 0, transition: 'opacity 150ms ease-out' }}>
      <div className="rounded-full bg-cream/95 px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-ink shadow">{name}</div>
    </Html>
  )
}

export function Guest({ profile, name, x, z, alwaysName = false }: { profile: Profile; name: string; x: number; z: number; alwaysName?: boolean }) {
  const tag = useNameTag(alwaysName)
  return (
    <group position={[x, 0, z]} rotation-y={Math.PI / 4} scale={1.25} {...tag.handlers}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.008}>
        <circleGeometry args={[0.17, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <Body p={profile} height={gameHeight(profile)} drive={guestDrive} />
      <NameTag name={name} show={tag.show} />
    </group>
  )
}

/** What someone just said in a tour, over their head (yours when `of` is left out) */
function Bubble({ of, y }: { of?: string; y: number }) {
  const mine = useTogether((t) => t.me)
  const who = of ?? mine
  const text = useTour((s) => (who ? s.bubbles[who] : undefined))
  if (!text) return null
  return (
    <Html position={[0, y, 0]} center zIndexRange={[18, 0]} style={{ pointerEvents: 'none' }}>
      <div className="max-w-48 rounded-2xl bg-white px-3 py-1.5 text-center text-xs font-semibold break-words text-ink shadow-md">{text}</div>
    </Html>
  )
}

/** Where another player's character is, kept up to date many times a second by a live channel */
export type LivePos = { x: number; z: number; y: number; rotY: number; pose: Pose }

/** The other player on a tour: walks, sits and naps live, glided smoothly between updates */
export function Remote({ id, profile, name, at }: { id: string; profile: Profile; name: string; at: LivePos }) {
  const tag = useNameTag()
  const remoteDrive = useMemo<Drive>(() => () => ({ pose: at.pose, walking: at.pose === 'walk' }), [at])
  const root = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)
  const placed = useRef(false)
  useFrame((_, dt) => {
    const r = root.current
    if (!r) return
    // Jump there the first time, then glide (updates arrive about ten times a second)
    const k = placed.current ? Math.min(1, dt * 12) : 1
    placed.current = true
    r.position.x += (at.x - r.position.x) * k
    r.position.y += (at.y - r.position.y) * k
    r.position.z += (at.z - r.position.z) * k
    const diff = ((at.rotY - r.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    r.rotation.y += diff * Math.min(1, dt * 12)
    if (shadow.current) shadow.current.visible = at.pose !== 'lie' && at.y === 0
  })
  return (
    <group ref={root} scale={1.25} {...tag.handlers}>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position-y={0.008}>
        <circleGeometry args={[0.17, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <Body p={profile} height={gameHeight(profile)} drive={remoteDrive} />
      <NameTag name={name} show={tag.show} />
      <Bubble of={id} y={1.22} />
    </group>
  )
}

const sleepDrive: Drive = () => ({ pose: 'lie', walking: false })

/** Your partner while they're away from the game: asleep on the bed, with a little 💤 */
export function Sleeper({ profile, name, x, y, z, rotY }: { profile: Profile; name: string; x: number; y: number; z: number; rotY: number }) {
  const tag = useNameTag()
  const zzz = useRef<HTMLDivElement>(null)
  useFrame(({ clock }) => {
    if (zzz.current) zzz.current.style.transform = `translateY(${-Math.abs(Math.sin(clock.elapsedTime * 1.2)) * 6}px)`
  })
  return (
    <group position={[x, y, z]} rotation-y={rotY} scale={1.25} {...tag.handlers}>
      <Body p={profile} height={gameHeight(profile)} drive={sleepDrive} />
      <Html position={[0, 0.55, 0]} center zIndexRange={[14, 0]} style={{ pointerEvents: 'none' }}>
        <div ref={zzz} className="text-lg select-none" aria-hidden>
          💤
        </div>
      </Html>
      <NameTag name={`${name} is sleeping`} show={tag.show} y={0.8} />
    </group>
  )
}
