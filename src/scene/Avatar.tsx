import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import type { Group, Mesh } from 'three'
import { me, step, type Pose } from '../game/character'
import { BUILDS, DEFAULT_PROFILE, gameHeight, heightScale, type HairStyle, type Profile } from '../game/look'
import { useSave } from '../game/store'
import { useTogether } from '../lib/together'
import { them, useTour } from '../lib/tour'
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

const Mat = ({ color, rough = 0.8 }: { color: string; rough?: number }) => <meshStandardMaterial color={color} roughness={rough} />

function Hair({ style, color, hatOn }: { style: HairStyle; color: string; hatOn: boolean }) {
  if (style === 'bald') return null
  // Under a hat, tall styles tuck in so nothing pokes through
  const s: HairStyle = hatOn && (style === 'spiky' || style === 'curly' || style === 'buns') ? 'short' : style
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

function Hat({ c }: { c: Clothing }) {
  switch (c.cut) {
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
      return (
        <group position-y={0.16}>
          <mesh>
            <cylinderGeometry args={[0.17, 0.21, 0.14, 20]} />
            <Mat color={c.color} />
          </mesh>
          <mesh position-y={-0.07}>
            <cylinderGeometry args={[0.31, 0.31, 0.02, 24]} />
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

function FaceWear({ c }: { c: Clothing }) {
  if (c.cut === 'headphones')
    return (
      <group>
        <mesh position-y={0.07} rotation-z={Math.PI / 2}>
          <torusGeometry args={[0.24, 0.022, 8, 24, Math.PI]} />
          <Mat color={c.accent ?? '#333'} />
        </mesh>
        {[-0.215, 0.215].map((x) => (
          <RoundedBox key={x} args={[0.06, 0.13, 0.12]} radius={0.03} position={[x, -0.02, 0]}>
            <Mat color={c.color} />
          </RoundedBox>
        ))}
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

/** A leg: thigh, shin, then the shoe */
function LegParts({ upper, lower, shoes }: { upper: string; lower: string; shoes: Clothing }) {
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
          {shoes.cut === 'slippers' && (
            <mesh position={[0, 0.05, 0.03]} scale={[0.5, 1.4, 0.5]}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <Mat color={shoes.color} />
            </mesh>
          )}
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
  const top = CLOTHING[p.outfit.top ?? 'tee-sky']
  const bottom = CLOTHING[p.outfit.bottom ?? 'jeans']
  const shoes = CLOTHING[p.outfit.shoes ?? 'sneakers-white']
  const hat = p.outfit.hat ? CLOTHING[p.outfit.hat] : null
  const face = p.outfit.face ? CLOTHING[p.outfit.face] : null
  const longSleeves = top.cut === 'longsleeve' || top.cut === 'hoodie' || top.cut === 'jacket'
  const lowerLeg = bottom.cut === 'pants' ? bottom.color : p.skin
  const upperLeg = bottom.cut === 'skirt' ? p.skin : bottom.color
  const female = p.gender === 'female'

  return (
    <group ref={body} scale={[w, hs, w]}>
      {/* Legs swing from the hips */}
      <group ref={legL} position={[-0.065, 0.2, 0]}>
        <LegParts upper={upperLeg} lower={lowerLeg} shoes={shoes} />
      </group>
      <group ref={legR} position={[0.065, 0.2, 0]}>
        <LegParts upper={upperLeg} lower={lowerLeg} shoes={shoes} />
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
        <ArmParts sleeve={top.color} forearm={longSleeves ? top.color : p.skin} skin={p.skin} />
      </group>
      <group ref={armR} position={[0.185, 0.42, 0]}>
        <ArmParts sleeve={top.color} forearm={longSleeves ? top.color : p.skin} skin={p.skin} />
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
        {face && <FaceWear c={face} />}
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
export function Guest({ profile, name, x, z }: { profile: Profile; name: string; x: number; z: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={Math.PI / 4} scale={1.25}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.008}>
        <circleGeometry args={[0.17, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <Body p={profile} height={gameHeight(profile)} drive={guestDrive} />
      <Html position={[0, 1.02, 0]} center zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
        <div className="rounded-full bg-cream/95 px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-ink shadow">{name}</div>
      </Html>
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

const remoteDrive: Drive = () => ({ pose: them.pose, walking: them.pose === 'walk' })

/** The other player on a tour: walks, sits and naps live, glided smoothly between updates */
export function Remote({ id, profile, name }: { id: string; profile: Profile; name: string }) {
  const root = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)
  const placed = useRef(false)
  useFrame((_, dt) => {
    const r = root.current
    if (!r) return
    // Jump there the first time, then glide (updates arrive about ten times a second)
    const k = placed.current ? Math.min(1, dt * 12) : 1
    placed.current = true
    r.position.x += (them.x - r.position.x) * k
    r.position.y += (them.y - r.position.y) * k
    r.position.z += (them.z - r.position.z) * k
    const diff = ((them.rotY - r.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    r.rotation.y += diff * Math.min(1, dt * 12)
    if (shadow.current) shadow.current.visible = them.pose !== 'lie' && them.y === 0
  })
  return (
    <group ref={root} scale={1.25}>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position-y={0.008}>
        <circleGeometry args={[0.17, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <Body p={profile} height={gameHeight(profile)} drive={remoteDrive} />
      <Html position={[0, 1.02, 0]} center zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
        <div className="rounded-full bg-cream/95 px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-ink shadow">{name}</div>
      </Html>
      <Bubble of={id} y={1.22} />
    </group>
  )
}
