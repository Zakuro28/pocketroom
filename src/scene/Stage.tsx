import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Vector3, type Mesh, type MeshBasicMaterial, type OrthographicCamera as ThreeOrthographicCamera } from 'three'
import { OrthographicCamera, useGLTF } from '@react-three/drei'
import { CATALOG } from '../game/catalog'
import { CELL, ROOM, WALL_H, type Placed } from '../game/grid'
import { getSession, setSession, usePlaced, useSave, useSession } from '../game/store'
import { bindKeys, goUse, guestSpot, settle, walkTo } from '../game/character'
import { coupleOf, isOnline, otherOf, useTogether } from '../lib/together'
import { useTour } from '../lib/tour'
import { blip } from '../lib/sound'
import Avatar, { Guest, Remote } from './Avatar'
import { Ghost, PlacedItem } from './Furniture'
import Placer from './Placer'
import Room from './Room'

// Start downloading every furniture model right away (2 MB in all), so the shop opens instantly
new Set(CATALOG.map((i) => i.model)).forEach((m) => useGLTF.preload(`/models/${m}.glb`))

const W = ROOM.w * CELL
const D = ROOM.d * CELL
const CENTER: [number, number, number] = [W / 2, WALL_H / 3, D / 2]

/** Screen-up in the isometric view, so the room can glide up out of the way of the decorating drawer */
const UP = new Vector3(-1, 2, -1).normalize()

/** The isometric camera, zoomed so the whole studio fits any screen. While decorating, the room eases up into the space above the drawer. */
function Camera({ editing }: { editing: boolean }) {
  const size = useThree((s) => s.size)
  const cam = useRef<ThreeOrthographicCamera>(null)
  const across = (W + D) * Math.SQRT1_2 + 0.6
  const tall = (W + D) * 0.41 + WALL_H * 0.82 + 0.5
  const fit = Math.min(size.width / across, size.height / tall)
  // While decorating, the room fits the top 60% of the screen, above the drawer
  const editFit = Math.min(size.width / across, (size.height * 0.6) / tall)
  const lift = useRef(0)
  useFrame((_, dt) => {
    const c = cam.current
    if (!c) return
    const want = editing ? 1 : 0
    if (Math.abs(lift.current - want) < 0.001) return
    lift.current += (want - lift.current) * Math.min(1, dt * 8)
    const zoom = fit + (editFit - fit) * lift.current
    // Center the room in that top area: move the view down, which carries the room up
    const shift = (size.height * 0.2 * lift.current) / zoom
    const target = new Vector3(...CENTER).addScaledVector(UP, -shift)
    c.zoom = zoom
    c.position.set(target.x + 14, target.y + 14, target.z + 14)
    c.lookAt(target)
    c.updateProjectionMatrix()
  })
  return <OrthographicCamera ref={cam} makeDefault zoom={fit} position={[CENTER[0] + 14, CENTER[1] + 14, CENTER[2] + 14]} near={0.1} far={100} onUpdate={(c) => c.lookAt(...CENTER)} />
}

/** A ring that ripples out where you tapped the floor */
function TapRing({ x, z }: { x: number; z: number }) {
  const ref = useRef<Mesh>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    t.current = Math.min(1, t.current + dt * 2.2)
    m.scale.setScalar(0.4 + t.current * 0.8)
    ;(m.material as MeshBasicMaterial).opacity = 0.7 * (1 - t.current)
    m.visible = t.current < 1
  })
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[x, 0.012, z]}>
      <ringGeometry args={[0.16, 0.22, 32]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.7} depthWrite={false} />
    </mesh>
  )
}

export default function Stage({ say, sky }: { say: (msg: string) => void; sky: string }) {
  const placed = usePlaced()
  const mode = useSession((s) => s.mode)
  const visit = useSession((s) => s.visit)
  const living = useSave((s) => s.home)
  // Someone else in the room: the friend you're visiting, or your partner when they're online at home
  const partner = useTogether((t) => {
    const c = coupleOf(t)
    const card = c && living === c.id && !visit ? t.cards[otherOf(c)] : undefined
    return card && isOnline(card) && card.look ? card : null
  })
  // On a tour the other player walks around live instead of standing still
  const touring = useTour((t) => (t.phase === 'touring' && t.here && t.peer?.look ? t.peer : null))
  const host = visit && touring && visit.id === touring.id
  const guest = host ? null : visit ? (visit.look ? { look: visit.look, name: visit.name } : null) : partner ? { look: partner.look!, name: partner.name } : null
  const spot = useMemo(() => guestSpot(placed), [placed])
  const selected = useSession((s) => s.selected)
  const ghost = useSession((s) => s.ghost)
  const [marker, setMarker] = useState<{ x: number; z: number; at: number } | null>(null)

  // Furniture moved around while decorating can end up where your character is standing
  useEffect(() => settle(placed), [placed])

  // WASD and the arrow keys walk your character
  useEffect(() => bindKeys(), [])

  const onTap = useCallback(
    (p: Placed) => {
      const s = getSession()
      if (s.ghost) return
      if (s.mode === 'edit') {
        blip()
        setSession((st) => ({ ...st, selected: st.selected === p.uid ? null : p.uid }))
      } else goUse(p, placed, say)
    },
    [placed, say],
  )

  return (
    <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} onPointerMissed={() => mode === 'edit' && !ghost && setSession((s) => ({ ...s, selected: null }))}>
      <Camera editing={mode === 'edit'} />
      <hemisphereLight args={['#fff4e6', '#c9b6a6', 1.3]} />
      <directionalLight
        position={[W / 2 + 6, 10, D / 2 + 3]}
        intensity={1.6}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <Suspense fallback={null}>
        <Room
          sky={sky}
          onFloorTap={(x, z) => {
            const st = getSession()
            if (st.mode !== 'play') {
              // While decorating, tapping bare floor lets go of the selected item
              if (!st.ghost) setSession((x) => ({ ...x, selected: null }))
              return
            }
            walkTo(x, z, placed)
            setMarker({ x, z, at: performance.now() })
          }}
        />
        {marker && <TapRing key={marker.at} x={marker.x} z={marker.z} />}
        {placed.map((p) => (
          <PlacedItem key={p.uid} p={p} all={placed} selected={mode === 'edit' && selected === p.uid} onTap={onTap} />
        ))}
        {ghost && <Ghost g={ghost} all={placed} />}
        <Avatar />
        {guest && <Guest profile={guest.look} name={guest.name} x={spot.x} z={spot.z} />}
        {touring && <Remote id={touring.id} profile={touring.look!} name={touring.name} />}
      </Suspense>
      {mode === 'edit' && ghost && <Placer />}
    </Canvas>
  )
}
