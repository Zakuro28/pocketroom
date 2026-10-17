import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Vector3, type Mesh, type MeshBasicMaterial, type OrthographicCamera as ThreeOrthographicCamera } from 'three'
import { OrthographicCamera, useGLTF } from '@react-three/drei'
import { CATALOG } from '../game/catalog'
import { CELL, ROOM, WALL_H, type Placed } from '../game/grid'
import { getSession, setSession, usePlaced, useSave, useSession } from '../game/store'
import { bindKeys, goUse, guestSpot, settle, walkTo } from '../game/character'
import { justDragged, panBy, resetView, view, zoomAt } from './view'
import { coupleOf, isOnline, otherOf, useTogether } from '../lib/together'
import { them, them2, useTour } from '../lib/tour'
import { partnerAt, usePartnerHere, useVisitor, visitorAt } from '../lib/homeLive'
import { blip } from '../lib/sound'
import Avatar, { Guest, Remote } from './Avatar'
import { Ghost, PlacedItem } from './Furniture'
import Placer from './Placer'
import Room from './Room'
import { Courier, Pets } from './Pets'
import { speciesOf } from '../game/pets'
import { careForPartnerPet } from '../game/petActions'

// Start downloading every furniture model right away (2 MB in all), so the shop opens instantly
new Set(CATALOG.map((i) => i.model)).forEach((m) => useGLTF.preload(`/models/${m}.glb`))

const W = ROOM.w * CELL
const D = ROOM.d * CELL
const CENTER: [number, number, number] = [W / 2, WALL_H / 3, D / 2]

/** Screen-up in the isometric view, so the room can glide up out of the way of the decorating drawer */
const UP = new Vector3(-1, 2, -1).normalize()

/**
 * The isometric camera, zoomed so the whole studio fits any screen. While decorating, the room eases up into the
 * space above the drawer. While playing you can zoom in (wheel, pinch, buttons) and look around.
 */
function Camera({ editing }: { editing: boolean }) {
  const size = useThree((s) => s.size)
  const cam = useRef<ThreeOrthographicCamera>(null)
  const across = (W + D) * Math.SQRT1_2 + 0.6
  const tall = (W + D) * 0.41 + WALL_H * 0.82 + 0.5
  const fit = Math.min(size.width / across, size.height / tall)
  // While decorating, the room fits the top 60% of the screen, above the drawer
  const editFit = Math.min(size.width / across, (size.height * 0.6) / tall)
  const cur = useRef({ lift: 0, mul: 1, pan: new Vector3(), set: false })
  useFrame((_, dt) => {
    const c = cam.current
    if (!c) return
    const s = cur.current
    const k = Math.min(1, dt * 10)
    const lift = editing ? 1 : 0
    const mul = editing ? 1 : view.mul
    const pan = editing ? ORIGIN : view.pan
    const still = Math.abs(s.lift - lift) < 0.001 && Math.abs(s.mul - mul) < 0.001 && s.pan.distanceToSquared(pan) < 1e-8
    if (still && s.set) return
    s.set = true
    s.lift += (lift - s.lift) * Math.min(1, dt * 8)
    s.mul += (mul - s.mul) * k
    s.pan.lerp(pan, k)
    const base = fit + (editFit - fit) * s.lift
    const zoom = base * s.mul
    view.base = base
    view.zoom = zoom
    // Center the room in that top area: move the view down, which carries the room up
    const shift = (size.height * 0.2 * s.lift) / zoom
    const target = new Vector3(...CENTER).addScaledVector(UP, -shift).add(s.pan)
    c.zoom = zoom
    c.position.set(target.x + 14, target.y + 14, target.z + 14)
    c.lookAt(target)
    c.updateProjectionMatrix()
  })
  // A new screen size: settle again
  useEffect(() => void (cur.current.set = false), [size])
  return <OrthographicCamera ref={cam} makeDefault zoom={fit} position={[CENTER[0] + 14, CENTER[1] + 14, CENTER[2] + 14]} near={0.1} far={100} onUpdate={(c) => c.lookAt(...CENTER)} />
}

const ORIGIN = new Vector3()

/** Mouse wheel and pinch zoom toward the spot under them; dragging looks around while zoomed in */
function ZoomInput({ editing }: { editing: boolean }) {
  const el = useThree((s) => s.gl.domElement)
  useEffect(() => {
    if (editing) return void resetView()
    const offset = (x: number, y: number) => {
      const r = el.getBoundingClientRect()
      return [x - r.left - r.width / 2, y - r.top - r.height / 2] as const
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomAt(Math.exp(-e.deltaY * 0.0015), ...offset(e.clientX, e.clientY))
    }
    const down = new Map<number, { x: number; y: number }>()
    let start: { x: number; y: number } | null = null
    let dragging = false
    let pinch = 0
    const onDown = (e: PointerEvent) => {
      down.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (down.size === 1) {
        start = { x: e.clientX, y: e.clientY }
        dragging = false
      }
      if (down.size === 2) {
        const [a, b] = [...down.values()]
        pinch = Math.hypot(a.x - b.x, a.y - b.y)
      }
    }
    const onMove = (e: PointerEvent) => {
      const last = down.get(e.pointerId)
      if (!last) return
      const now = { x: e.clientX, y: e.clientY }
      if (down.size >= 2) {
        // Two fingers: pinch to zoom around their middle, and move together to look around
        const prev = [...down.values()]
        down.set(e.pointerId, now)
        const [a, b] = [...down.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        const mid = offset((a.x + b.x) / 2, (a.y + b.y) / 2)
        if (pinch > 0) zoomAt(d / pinch, ...mid)
        pinch = d
        const pm = { x: (prev[0].x + prev[1].x) / 2, y: (prev[0].y + prev[1].y) / 2 }
        panBy((a.x + b.x) / 2 - pm.x, (a.y + b.y) / 2 - pm.y)
        dragging = true
        view.dragUntil = performance.now() + 250
        return
      }
      down.set(e.pointerId, now)
      // One finger or the mouse: a real drag (not a tap) moves the view, but only while zoomed in
      if (!start || view.mul <= 1.01) return
      if (!dragging && Math.hypot(now.x - start.x, now.y - start.y) < 8) return
      dragging = true
      panBy(now.x - last.x, now.y - last.y)
      view.dragUntil = performance.now() + 250
    }
    const onUp = (e: PointerEvent) => {
      down.delete(e.pointerId)
      if (down.size < 2) pinch = 0
      if (!down.size) start = null
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [el, editing])
  return null
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

export default function Stage({ say, sky, onPet, onDelivery }: { say: (msg: string) => void; sky: string; onPet: (uid: string) => void; onDelivery: () => void }) {
  const placed = usePlaced()
  const pets = useSave((s) => s.pets)
  const waiting = useSave((s) => s.deliveries.length)
  const living = useSave((s) => s.home)
  const roomPets = useMemo(() => pets.filter((p) => p.place === 'room'), [pets])
  // Pets in the room on screen: the host's when visiting; at home yours, plus your partner's if you live together
  const partnerPets = useTogether((t) => {
    const c = coupleOf(t)
    return c && living === c.id ? t.cards[otherOf(c)]?.room?.pets : undefined
  })
  const mode = useSession((s) => s.mode)
  const visit = useSession((s) => s.visit)
  const shownPets = useMemo(() => (visit ? (visit.room.pets ?? []) : [...roomPets, ...(partnerPets ?? [])]), [visit, roomPets, partnerPets])
  // Someone else in the room: the friend you're visiting, or your partner at home. When you're both home,
  // your partner moves live; otherwise (an older version of the game on their side) they stand and wave.
  const partnerCard = useTogether((t) => {
    const c = coupleOf(t)
    return c && living === c.id && !visit ? (t.cards[otherOf(c)] ?? null) : null
  })
  const partnerLive = usePartnerHere()
  const live = partnerLive && partnerCard?.look ? partnerCard : null
  // A friend your partner is touring around your shared home, and (on a tour of a couple's home) the host's partner
  const visitor = useVisitor()
  const housemate = useTour((t) => (t.phase === 'touring' && !t.hosting && t.extra?.look ? t.extra : null))
  const partner = !live && partnerCard && isOnline(partnerCard) && partnerCard.look ? partnerCard : null
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
      if (s.ghost || justDragged()) return
      if (s.mode === 'edit') {
        blip()
        setSession((st) => ({ ...st, selected: st.selected === p.uid ? null : p.uid }))
      } else goUse(p, placed, say)
    },
    [placed, say],
  )

  return (
    <Canvas shadows dpr={[1, 3]} style={{ touchAction: 'none' }} gl={{ antialias: true, alpha: true }} onPointerMissed={() => mode === 'edit' && !ghost && setSession((s) => ({ ...s, selected: null }))}>
      <Camera editing={mode === 'edit'} />
      <ZoomInput editing={mode === 'edit'} />
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
            if (justDragged()) return
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
        {touring && <Remote id={touring.id} profile={touring.look!} name={touring.name} at={them} />}
        {live && <Remote id={live.id} profile={live.look!} name={live.name} at={partnerAt} />}
        {!visit && visitor?.look && <Remote id={visitor.id} profile={visitor.look} name={visitor.name} at={visitorAt} />}
        {housemate && <Remote id={housemate.id} profile={housemate.look!} name={housemate.name} at={them2} />}
        {/* Your pets live at home; the courier waits at your door while a pet is waiting */}
        <Pets
          pets={shownPets}
          placed={placed}
          onTap={(uid) => {
            if (mode !== 'play' || justDragged()) return
            // Your own pets open their card; anyone else's just say hello
            if (roomPets.some((p) => p.uid === uid)) return onPet(uid)
            const other = shownPets.find((p) => p.uid === uid)
            if (!other) return
            // Living together, you can pet your partner's pets too (once a day per pet, shared)
            if (partnerPets?.some((p) => p.uid === uid)) {
              const n = careForPartnerPet('petted', other)
              return say(n ? `You petted ${other.name}! +${n} 💗` : `${other.name} was already petted today 💞`)
            }
            say(`${other.name} the ${speciesOf(other).name} says hi 🐾`)
          }}
        />
        {!visit && mode === 'play' && waiting > 0 && <Courier count={waiting} onTap={() => !justDragged() && onDelivery()} />}
      </Suspense>
      {mode === 'edit' && ghost && <Placer />}
    </Canvas>
  )
}
