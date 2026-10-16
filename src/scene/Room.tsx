import { useMemo } from 'react'
import { CELL, DOOR, ROOM, WALL_H, WINDOWS } from '../game/grid'
import { useFloor, useWall } from '../game/store'
import { FLOORS, WALLS } from '../game/surfaces'
import { surfaceTexture } from './textures'

const W = ROOM.w * CELL
const D = ROOM.d * CELL
const T = 0.12 // wall thickness
const BASE = 0.28 // the slab under the floor, seen at the front edges

/** The studio shell: a thick floor slab, two back walls with wallpaper, two windows and the front door */
export default function Room({ sky, onFloorTap }: { sky: string; onFloorTap: (x: number, z: number) => void }) {
  const floorId = useFloor()
  const wallId = useWall()
  const floorTex = useMemo(() => {
    const t = surfaceTexture(FLOORS.find((f) => f.id === floorId) ?? FLOORS[0]).clone()
    t.repeat.set(W, D)
    t.needsUpdate = true
    return t
  }, [floorId])
  const wallSurface = WALLS.find((w) => w.id === wallId) ?? WALLS[0]
  const wallTexL = useMemo(() => {
    const t = surfaceTexture(wallSurface).clone()
    t.repeat.set(D * 1.5, WALL_H * 1.5)
    t.needsUpdate = true
    return t
  }, [wallSurface])
  const wallTexR = useMemo(() => {
    const t = surfaceTexture(wallSurface).clone()
    t.repeat.set(W * 1.5, WALL_H * 1.5)
    t.needsUpdate = true
    return t
  }, [wallSurface])

  return (
    <group>
      {/* Floor and the slab under it */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[W / 2, 0, D / 2]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          onFloorTap(e.point.x, e.point.z)
        }}
      >
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={floorTex} roughness={0.85} />
      </mesh>
      <mesh position={[W / 2 - T / 2, -BASE / 2 - 0.001, D / 2 - T / 2]}>
        <boxGeometry args={[W + T, BASE, D + T]} />
        <meshStandardMaterial color="#8b6a55" roughness={1} />
      </mesh>

      {/* Left wall (along z) and right wall (along x) */}
      <mesh position={[-T / 2, WALL_H / 2, D / 2 - T / 2]} receiveShadow>
        <boxGeometry args={[T, WALL_H, D + T]} />
        <meshStandardMaterial attach="material-0" map={wallTexL} roughness={0.95} />
        <meshStandardMaterial attach="material-1" color="#e7dccb" />
        <meshStandardMaterial attach="material-2" color="#efe5d4" />
        <meshStandardMaterial attach="material-3" color="#efe5d4" />
        <meshStandardMaterial attach="material-4" color="#e7dccb" />
        <meshStandardMaterial attach="material-5" color="#e7dccb" />
      </mesh>
      <mesh position={[W / 2, WALL_H / 2, -T / 2]} receiveShadow>
        <boxGeometry args={[W, WALL_H, T]} />
        <meshStandardMaterial attach="material-0" color="#e7dccb" />
        <meshStandardMaterial attach="material-1" color="#e7dccb" />
        <meshStandardMaterial attach="material-2" color="#efe5d4" />
        <meshStandardMaterial attach="material-3" color="#efe5d4" />
        <meshStandardMaterial attach="material-4" map={wallTexR} roughness={0.95} />
        <meshStandardMaterial attach="material-5" color="#e7dccb" />
      </mesh>
      {/* Skirting boards */}
      <mesh position={[0.012, 0.04, D / 2]}>
        <boxGeometry args={[0.024, 0.08, D]} />
        <meshStandardMaterial color="#fbf6ee" />
      </mesh>
      <mesh position={[W / 2, 0.04, 0.012]}>
        <boxGeometry args={[W, 0.08, 0.024]} />
        <meshStandardMaterial color="#fbf6ee" />
      </mesh>

      {/* Windows on the right wall show the sky outside */}
      {WINDOWS.map((w) => {
        const len = (w.to - w.from) * CELL
        const cx = (w.from * CELL + w.to * CELL) / 2
        return (
          <group key={w.from} position={[cx, 1.05, 0.015]}>
            <mesh>
              <boxGeometry args={[len + 0.12, 0.92, 0.03]} />
              <meshStandardMaterial color="#fbf6ee" />
            </mesh>
            <mesh position-z={0.02}>
              <planeGeometry args={[len, 0.8]} />
              <meshBasicMaterial color={sky} toneMapped={false} />
            </mesh>
            <mesh position-z={0.03}>
              <boxGeometry args={[0.04, 0.8, 0.02]} />
              <meshStandardMaterial color="#fbf6ee" />
            </mesh>
            <mesh position={[0, -0.47, 0.06]}>
              <boxGeometry args={[len + 0.2, 0.05, 0.12]} />
              <meshStandardMaterial color="#fbf6ee" />
            </mesh>
          </group>
        )
      })}

      {/* Front door on the left wall */}
      <group position={[0.02, 0, ((DOOR.from + DOOR.to) / 2) * CELL]}>
        <mesh position-y={0.62}>
          <boxGeometry args={[0.04, 1.24, (DOOR.to - DOOR.from) * CELL * 0.62 + 0.12]} />
          <meshStandardMaterial color="#fbf6ee" />
        </mesh>
        <mesh position={[0.025, 0.58, 0]}>
          <boxGeometry args={[0.03, 1.14, (DOOR.to - DOOR.from) * CELL * 0.62]} />
          <meshStandardMaterial color="#b9835a" roughness={0.8} />
        </mesh>
        <mesh position={[0.05, 0.58, 0.22]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshStandardMaterial color="#e8b84a" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
    </group>
  )
}
