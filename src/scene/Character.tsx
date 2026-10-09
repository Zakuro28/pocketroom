import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import type { Group, Mesh } from 'three'
import { me, step } from '../game/character'
import { DEFAULT_LOOK, type Look } from '../game/look'


type Pop = { id: number; n: number }

/** A chunky little person in the Tuber style, built from rounded boxes so every part can be recolored or resized */
export default function Character({ look = DEFAULT_LOOK }: { look?: Look }) {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)
  const eyes = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)
  const [pops, setPops] = useState<Pop[]>([])
  const nextId = useRef(0)

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    step(Math.min(dt, 0.05), t, (n) => {
      const id = nextId.current++
      setPops((p) => [...p, { id, n }])
      setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1400)
    })
    const r = root.current
    if (!r || !body.current) return
    r.position.set(me.x, me.y, me.z)
    // Turn smoothly toward where we're heading
    const diff = ((me.rotY - r.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    r.rotation.y += diff * Math.min(1, dt * 12)

    const walking = me.pose === 'walk' && me.path.length > 0
    const swing = walking ? Math.sin(t * 12) * 0.6 : 0
    const sit = me.pose === 'sit'
    const lie = me.pose === 'lie'
    const dance = me.pose === 'dance'

    body.current.rotation.x = lie ? -Math.PI / 2 : 0
    // Sitting lowers the hips onto the seat
    body.current.position.y = lie ? 0.1 : sit ? -0.17 : walking ? Math.abs(Math.sin(t * 12)) * 0.03 : dance ? Math.abs(Math.sin(t * 6)) * 0.06 : Math.sin(t * 2) * 0.006
    body.current.position.z = lie ? 0.32 : 0
    body.current.rotation.y = dance ? Math.sin(t * 3) * 0.5 : 0
    legL.current!.rotation.x = sit ? -Math.PI / 2 : swing
    legR.current!.rotation.x = sit ? -Math.PI / 2 : -swing
    armL.current!.rotation.x = dance ? -2.6 + Math.sin(t * 6) * 0.3 : sit ? -0.5 : -swing * 0.8
    armR.current!.rotation.x = dance ? -2.6 - Math.sin(t * 6) * 0.3 : sit ? -0.5 : swing * 0.8
    armL.current!.rotation.z = 0.12
    armR.current!.rotation.z = -0.12
    // Blink every few seconds (eyes stay shut while napping)
    const blink = lie ? 0.15 : t % 3.6 < 0.12 ? 0.15 : 1
    eyes.current!.scale.y = blink
    if (shadow.current) shadow.current.visible = !lie && me.y === 0
  })

  const s = look.height
  const b = look.build
  return (
    // Drawn a bit larger than the furniture scale so the character reads clearly in a big studio
    <group ref={root} scale={1.25}>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position-y={0.008}>
        <circleGeometry args={[0.17 * b, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <group ref={body} scale={[b, s, b]}>
        {/* Legs swing from the hips */}
        {[
          [legL, -0.065],
          [legR, 0.065],
        ].map(([ref, x], k) => (
          <group key={k} ref={ref as React.RefObject<Group>} position={[x as number, 0.2, 0]}>
            <mesh position-y={-0.09} castShadow>
              <boxGeometry args={[0.1, 0.16, 0.11]} />
              <meshStandardMaterial color={look.pants} />
            </mesh>
            <mesh position={[0, -0.18, 0.015]} castShadow>
              <boxGeometry args={[0.11, 0.05, 0.14]} />
              <meshStandardMaterial color={look.shoes} />
            </mesh>
          </group>
        ))}
        {/* Body */}
        <RoundedBox args={[0.3, 0.26, 0.2]} radius={0.06} position-y={0.32} castShadow>
          <meshStandardMaterial color={look.shirt} />
        </RoundedBox>
        {/* Arms swing from the shoulders */}
        {[
          [armL, -0.185],
          [armR, 0.185],
        ].map(([ref, x], k) => (
          <group key={k} ref={ref as React.RefObject<Group>} position={[x as number, 0.42, 0]}>
            <RoundedBox args={[0.075, 0.2, 0.085]} radius={0.03} position-y={-0.09} castShadow>
              <meshStandardMaterial color={look.shirt} />
            </RoundedBox>
            <mesh position-y={-0.2}>
              <sphereGeometry args={[0.04, 12, 12]} />
              <meshStandardMaterial color={look.skin} />
            </mesh>
          </group>
        ))}
        {/* Big round head */}
        <group position-y={0.62}>
          <RoundedBox args={[0.38, 0.34, 0.33]} radius={0.12} castShadow>
            <meshStandardMaterial color={look.skin} />
          </RoundedBox>
          {/* Hair: a cap over the top and back, plus a fringe */}
          <RoundedBox args={[0.41, 0.2, 0.36]} radius={0.09} position={[0, 0.1, -0.015]}>
            <meshStandardMaterial color={look.hair} />
          </RoundedBox>
          <RoundedBox args={[0.41, 0.3, 0.12]} radius={0.06} position={[0, -0.01, -0.12]}>
            <meshStandardMaterial color={look.hair} />
          </RoundedBox>
          <RoundedBox args={[0.36, 0.07, 0.06]} radius={0.03} position={[0.02, 0.07, 0.15]} rotation-z={-0.12}>
            <meshStandardMaterial color={look.hair} />
          </RoundedBox>
          {/* Eyes with a little shine, and rosy cheeks */}
          <group ref={eyes} position={[0, -0.02, 0.166]}>
            {[-0.075, 0.075].map((x) => (
              <group key={x} position-x={x}>
                <mesh scale={[1, 1.35, 0.5]}>
                  <sphereGeometry args={[0.03, 12, 12]} />
                  <meshStandardMaterial color={look.eyes} roughness={0.3} />
                </mesh>
                <mesh position={[0.01, 0.014, 0.014]}>
                  <sphereGeometry args={[0.009, 8, 8]} />
                  <meshBasicMaterial color="#fff" />
                </mesh>
              </group>
            ))}
          </group>
          {[-0.12, 0.12].map((x) => (
            <mesh key={x} position={[x, -0.07, 0.163]} scale={[1, 0.6, 0.2]}>
              <sphereGeometry args={[0.03, 10, 10]} />
              <meshBasicMaterial color="#f29aa0" transparent opacity={0.7} />
            </mesh>
          ))}
        </group>
      </group>
      {/* Hearts float up from your head as they're earned */}
      {pops.map((p) => (
        <Html key={p.id} position={[0, 1.05, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="heart-pop">+{p.n} 💗</div>
        </Html>
      ))}
    </group>
  )
}
