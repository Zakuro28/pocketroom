import { Box3, BufferGeometry, Color, ConeGeometry, Group, Mesh, MeshStandardMaterial, TorusGeometry, Vector3 } from 'three'
import { RoundedBoxGeometry } from 'three-stdlib'
import type { ColorMutation, Species } from '../game/pets'
import { snapshot } from './thumbs'

/**
 * Pets are built from chunky rounded blocks, like the characters. One builder per body shape (four legs, rodent,
 * hopper, bird, lizard...), and each species adds its ears, tail, markings and extras on top.
 * Models are plain three.js groups, so the same model draws in the room and in the reel's thumbnails.
 * Facing +z, standing on y = 0, scaled to be 1 tall.
 */

export type PetLook = { sp: Species; coat: number; color: ColorMutation | null }

const geos = new Map<string, BufferGeometry>()
const mats = new Map<string, MeshStandardMaterial>()

function geo(w: number, h: number, d: number) {
  const k = `${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`
  let g = geos.get(k)
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.28)
    geos.set(k, g)
  }
  return g
}

function mat(color: string) {
  let m = mats.get(color)
  if (!m) {
    m = new MeshStandardMaterial({ color, roughness: 0.85 })
    mats.set(color, m)
  }
  return m
}

const shade = (hex: string, amt: number) => {
  const c = new Color(hex)
  return `#${c.lerp(new Color(amt < 0 ? '#000000' : '#ffffff'), Math.abs(amt)).getHexString()}`
}

type Paint = { main: string; second: string; dark: string; eye: string; nose: string; mark: string }

function paintOf({ sp, coat, color }: PetLook): Paint {
  const [main, second] = sp.coats[coat % sp.coats.length]
  const p: Paint = { main, second, dark: shade(main, -0.35), eye: '#1d1716', nose: '#3a2a28', mark: shade(main, -0.55) }
  if (color === 'leucism') return { ...p, main: '#f3efe8', second: '#ffffff', dark: '#e3ddd3', mark: '#e6e0d6' }
  if (color === 'albinism') return { ...p, main: '#fbfaf7', second: '#ffffff', dark: '#eeeae4', mark: '#f1ede7', eye: '#e04d68', nose: '#f2a4b1' }
  if (color === 'melanism') return { ...p, main: '#1f1c1d', second: '#2e2a2b', dark: '#151314', mark: '#0e0c0d' }
  return p
}

type B = { g: Group; p: Paint; sp: Species }

/** A rounded block: size, color, position, and an optional turn */
function box(b: B | Group, w: number, h: number, d: number, color: string, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
  const m = new Mesh(geo(w, h, d), mat(color))
  m.position.set(x, y, z)
  m.rotation.set(rx, ry, rz)
  m.castShadow = true
  ;('g' in b ? b.g : b).add(m)
  return m
}

function cone(b: B, r: number, h: number, color: string, x: number, y: number, z: number, rx = 0, rz = 0) {
  const m = new Mesh(new ConeGeometry(r, h, 6), mat(color))
  m.position.set(x, y, z)
  m.rotation.set(rx, 0, rz)
  m.castShadow = true
  b.g.add(m)
}

/** Two eyes with a light glint, on a face at depth z */
function eyes(b: B, x: number, y: number, z: number, size = 0.07) {
  for (const sx of [-1, 1]) {
    box(b, size, size * 1.15, size * 0.5, b.p.eye, sx * x, y, z)
    box(b, size * 0.32, size * 0.32, size * 0.2, '#ffffff', sx * x + size * 0.16, y + size * 0.2, z + size * 0.22)
  }
}

function ears(b: B, kind: string | undefined, x: number, y: number, z: number, s = 1) {
  const { main, dark, second } = b.p
  for (const sx of [-1, 1]) {
    if (kind === 'point') box(b, 0.12 * s, 0.17 * s, 0.05, main, sx * x, y + 0.07 * s, z, 0, 0, -sx * 0.25)
    else if (kind === 'round') box(b, 0.12 * s, 0.1 * s, 0.05, main, sx * x, y + 0.04 * s, z)
    else if (kind === 'big') {
      box(b, 0.18 * s, 0.26 * s, 0.04, main, sx * (x + 0.03), y + 0.11 * s, z, 0, 0, -sx * 0.4)
      box(b, 0.1 * s, 0.17 * s, 0.02, second, sx * (x + 0.03), y + 0.1 * s, z + 0.025, 0, 0, -sx * 0.4)
    } else if (kind === 'tuft') {
      box(b, 0.12 * s, 0.18 * s, 0.05, main, sx * x, y + 0.08 * s, z, 0, 0, -sx * 0.2)
      box(b, 0.03 * s, 0.09 * s, 0.03, dark, sx * (x + 0.02), y + 0.21 * s, z, 0, 0, -sx * 0.2)
    } else if (kind === 'flop') box(b, 0.09 * s, 0.2 * s, 0.06, dark, sx * (x + 0.07), y - 0.08 * s, z, 0, 0, sx * 0.15)
    else if (kind === 'long') {
      box(b, 0.09 * s, 0.36 * s, 0.05, main, sx * x * 0.7, y + 0.17 * s, z - 0.02, -0.15, 0, -sx * 0.12)
      box(b, 0.045 * s, 0.26 * s, 0.02, '#f6b8c2', sx * x * 0.7, y + 0.17 * s, z + 0.01, -0.15, 0, -sx * 0.12)
    }
  }
}

/** A tail hinged at the back of the body: `pitch` above 0 raises its tip */
function hinge(b: B, z: number, y: number, pitch: number) {
  const g = new Group()
  g.position.set(0, y, z)
  g.rotation.x = pitch
  b.g.add(g)
  return g
}

function tail(b: B, kind: string | undefined, z: number, y: number) {
  const { main, second, dark } = b.p
  switch (kind) {
    case 'short':
      return box(b, 0.11, 0.11, 0.1, main, 0, y, z - 0.03)
    case 'long':
      return box(hinge(b, z + 0.03, y, 0.6), 0.07, 0.07, 0.55, main, 0, 0, -0.27)
    case 'bushy': {
      const h = hinge(b, z + 0.04, y, 0.8)
      box(h, 0.2, 0.2, 0.42, main, 0, 0, -0.2)
      return box(h, 0.17, 0.17, 0.13, second, 0, 0, -0.42)
    }
    case 'ringed': {
      const h = hinge(b, z + 0.04, y, 0.8)
      for (let i = 0; i < 4; i++) box(h, 0.19, 0.19, 0.11, i % 2 ? dark : main, 0, 0, -0.06 - i * 0.11)
      return
    }
    case 'thick':
      return box(hinge(b, z + 0.06, y - 0.06, -0.35), 0.16, 0.16, 0.55, main, 0, 0, -0.27)
    case 'flat':
      return box(hinge(b, z + 0.04, y - 0.1, -0.25), 0.3, 0.06, 0.34, '#4a3a33', 0, 0, -0.17)
    case 'curl': {
      const m = new Mesh(new TorusGeometry(0.06, 0.022, 6, 12), mat(main))
      m.position.set(0, y + 0.05, z - 0.06)
      m.rotation.set(0, Math.PI / 2, 0)
      b.g.add(m)
      return
    }
  }
}

// ---- Body shapes ----

function quad(b: B) {
  const { sp, p } = b
  const L = sp.long ?? 1
  const Lg = sp.legs ?? 1
  const bl = 0.95 * L
  const bh = 0.46
  const bw = 0.48
  const legH = 0.32 * Lg
  const by = legH + bh / 2
  const patch = sp.mark === 'patch'
  // Body, belly, legs
  box(b, bw, bh, bl, p.main, 0, by, 0)
  box(b, bw * 0.8, 0.1, bl * 0.75, p.second, 0, legH + 0.04, 0.02)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(b, 0.14, legH + 0.06, 0.14, patch ? p.second : sp.mark === 'stripe' && sp.id !== 'skunk' ? p.dark : p.main, sx * 0.15, (legH + 0.06) / 2, sz * (bl / 2 - 0.13))
  // Head and face
  const hs = 0.4
  const hz = bl / 2 + 0.06
  const hy = by + bh * 0.42
  box(b, hs, hs * 0.92, hs * 0.9, p.main, 0, hy, hz)
  const snout = sp.id === 'pig' ? 0.12 : sp.ears === 'point' || ['wolf', 'fox', 'dog', 'fossa', 'muskDeer', 'reindeer', 'lamb', 'arcticFox', 'fennecFox', 'aardwolf'].includes(sp.id) ? 0.17 : 0.1
  const face = hz + hs * 0.45
  if (sp.mark === 'mask') box(b, hs + 0.01, 0.12, 0.04, p.dark, 0, hy + 0.04, face - 0.005)
  if (patch) for (const sx of [-1, 1]) box(b, 0.12, 0.13, 0.04, p.second, sx * 0.1, hy + 0.04, face)
  box(b, 0.24, 0.17, snout + 0.05, sp.id === 'pig' ? shade(p.main, -0.08) : p.second, 0, hy - 0.08, face + snout / 2 - 0.01)
  box(b, sp.id === 'pig' ? 0.16 : 0.09, 0.06, 0.04, sp.id === 'pig' ? shade(p.main, -0.2) : p.nose, 0, hy - 0.04, face + snout + 0.02)
  eyes(b, 0.1, hy + 0.05, face + 0.01)
  ears(b, sp.ears, 0.13, hy + hs * 0.45, hz - 0.05)
  tail(b, sp.tail, -bl / 2, by + 0.08)
  // Markings
  if (sp.mark === 'stripes')
    for (let i = 0; i < 4; i++) {
      const z = bl / 2 - 0.2 - (i * (bl - 0.3)) / 3.5
      box(b, bw + 0.02, bh * 0.55, 0.05, p.mark, 0, by + 0.02, z)
      box(b, bw * 0.6, 0.03, 0.05, p.mark, 0, by + bh / 2 + 0.005, z)
    }
  if (sp.mark === 'spots')
    for (let i = 0; i < 9; i++) {
      const sx = i % 2 ? 1 : -1
      box(b, 0.035, 0.08, 0.08, p.mark, sx * (bw / 2 + 0.005), by + ((i * 37) % 3) * 0.08 - 0.04, bl / 2 - 0.12 - ((i * 53) % 7) * (bl / 8))
    }
  if (sp.mark === 'stripe') box(b, sp.id === 'skunk' ? 0.12 : bw * 0.8, 0.04, bl * 0.95, p.second, 0, by + bh / 2 + 0.01, 0)
  if (patch) {
    box(b, bw + 0.02, bh + 0.02, 0.22, p.second, 0, by, bl / 2 - 0.2)
    b.g.traverse((m) => {
      // Panda ears are black too
      if (m instanceof Mesh && m.position.y > hy + hs * 0.4) m.material = mat(p.second)
    })
  }
  // Extras
  if (sp.extra === 'mane') {
    box(b, hs * 1.75, hs * 1.65, 0.3, shade(p.main, -0.42), 0, hy + 0.02, hz - 0.1)
    box(b, hs * 1.2, 0.2, 0.42, shade(p.main, -0.42), 0, hy - hs * 0.5, hz - 0.18)
  }
  if (sp.extra === 'antlers')
    for (const sx of [-1, 1]) {
      box(b, 0.04, 0.3, 0.04, '#d8c3a0', sx * 0.12, hy + hs * 0.45 + 0.15, hz - 0.05, 0, 0, -sx * 0.3)
      box(b, 0.12, 0.04, 0.04, '#d8c3a0', sx * 0.2, hy + hs * 0.45 + 0.22, hz - 0.05, 0, 0, -sx * 0.5)
      box(b, 0.04, 0.14, 0.04, '#d8c3a0', sx * 0.08, hy + hs * 0.45 + 0.3, hz, 0, 0, sx * 0.3)
    }
  if (sp.extra === 'scales') for (let i = 0; i < 5; i++) box(b, bw + 0.04, 0.12, 0.2, shade(p.main, i % 2 ? -0.15 : 0.05), 0, by + bh / 2 - 0.02, bl / 2 - 0.12 - i * (bl / 5.2))
}

function rodent(b: B) {
  const { sp, p } = b
  box(b, 0.62, 0.5, 0.74, p.main, 0, 0.27, -0.04)
  box(b, 0.5, 0.2, 0.5, p.second, 0, 0.14, 0.1)
  box(b, 0.46, 0.4, 0.36, p.main, 0, 0.36, 0.3)
  box(b, 0.22, 0.15, 0.1, p.second, 0, 0.29, 0.48)
  box(b, 0.07, 0.05, 0.04, sp.id === 'hedgehog' || sp.id === 'porcupine' ? p.nose : '#f2a0ad', 0, 0.32, 0.53)
  eyes(b, 0.11, 0.42, 0.49, 0.065)
  ears(b, sp.ears, 0.14, 0.52, 0.26, 0.9)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(b, 0.1, 0.06, 0.12, p.second, sx * 0.18, 0.03, sz * 0.22)
  if (sp.mark === 'patch') {
    box(b, 0.3, 0.3, 0.3, p.mark, 0.16, 0.34, -0.12)
    box(b, 0.24, 0.24, 0.2, p.second, -0.18, 0.4, 0.05)
  }
  if (sp.mark === 'stripe') box(b, 0.08, 0.04, 0.9, p.mark, 0, 0.54, 0.05)
  if (sp.extra === 'quills')
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2
      const ring = i % 3
      cone(b, 0.045, 0.2, ring ? p.dark : shade(p.main, 0.4), Math.cos(a) * (0.22 - ring * 0.05), 0.42 + ring * 0.08, -0.05 + Math.sin(a) * 0.3, -0.6 + Math.sin(a) * 0.4, -Math.cos(a) * 0.6)
    }
  if (sp.tail === 'long') box(b, 0.04, 0.04, 0.5, '#f2b2bc', 0, 0.12, -0.6, 0.2)
  if (sp.tail === 'bushy') {
    box(b, 0.22, 0.34, 0.18, p.main, 0, 0.42, -0.46, -0.35)
    box(b, 0.19, 0.14, 0.15, p.second, 0, 0.62, -0.52, -0.35)
  }
}

function hopper(b: B) {
  const { sp, p } = b
  const big = sp.size > 0.4
  box(b, 0.46, 0.58, 0.52, p.main, 0, 0.42, -0.04, -0.25)
  box(b, 0.32, 0.36, 0.1, p.second, 0, 0.4, 0.2, -0.25)
  for (const sx of [-1, 1]) {
    box(b, 0.17, 0.3, 0.3, p.main, sx * 0.2, 0.17, -0.12)
    box(b, 0.12, 0.07, big ? 0.42 : 0.3, p.dark, sx * 0.2, 0.035, big ? 0.04 : 0)
    box(b, 0.07, 0.2, 0.08, p.main, sx * 0.13, 0.42, 0.22, -0.4)
  }
  const hy = 0.86
  box(b, 0.36, 0.32, 0.36, p.main, 0, hy, 0.12)
  box(b, 0.2, 0.14, 0.12, p.second, 0, hy - 0.07, 0.31)
  box(b, 0.07, 0.05, 0.04, sp.id.includes('Hare') || sp.id === 'rabbit' ? '#f2a0ad' : p.nose, 0, hy - 0.03, 0.37)
  eyes(b, 0.09, hy + 0.04, 0.3, 0.06)
  ears(b, sp.ears, 0.1, hy + 0.14, 0.08, sp.id === 'jerboa' ? 1.1 : 1)
  if (sp.tail === 'thick') box(b, 0.16, 0.14, 0.62, p.main, 0, 0.12, -0.52, 0.25)
  else if (sp.tail === 'long') {
    box(b, 0.04, 0.04, 0.7, p.main, 0, 0.18, -0.6, 0.1)
    box(b, 0.1, 0.1, 0.12, '#ffffff', 0, 0.12, -0.95)
  } else box(b, 0.14, 0.14, 0.12, p.second, 0, 0.3, -0.33)
}

function bird(b: B) {
  const { sp, p } = b
  const L = sp.long ?? 1
  const legH = 0.22 * (sp.legs ?? 1)
  const owl = sp.extra === 'owl'
  const beakColor = ['chicken', 'duck', 'goose', 'stork'].includes(sp.id) ? p.second : owl ? '#5a5250' : sp.id === 'kiwiBird' ? '#d9c39a' : '#f0a43a'
  const by = legH + 0.22
  box(b, 0.46, 0.44, 0.56 * L, p.main, 0, by, 0)
  for (const sx of [-1, 1]) {
    box(b, 0.06, 0.3, 0.42 * L, shade(p.main, -0.12), sx * 0.25, by + 0.02, -0.04)
    box(b, 0.04, legH, 0.04, beakColor === '#5a5250' ? '#c9a05a' : beakColor, sx * 0.1, legH / 2, 0.02)
    box(b, 0.1, 0.03, 0.12, beakColor === '#5a5250' ? '#c9a05a' : beakColor, sx * 0.1, 0.015, 0.06)
  }
  const hs = owl ? 0.4 : 0.3
  const hz = owl ? 0.12 : 0.24 * L
  const hy = by + (owl ? 0.3 : 0.28 + (L > 1.1 ? 0.12 : 0))
  if (L > 1.1 && !owl) box(b, 0.14, 0.26, 0.14, p.main, 0, by + 0.2, 0.22 * L)
  box(b, hs, hs, hs, sp.id === 'lovebird' ? p.second : p.main, 0, hy, hz)
  const face = hz + hs / 2
  const beakLen = sp.id === 'kiwiBird' ? 0.3 : sp.id === 'stork' ? 0.32 : sp.id === 'duck' || sp.id === 'goose' ? 0.16 : 0.1
  box(b, sp.id === 'duck' || sp.id === 'goose' ? 0.16 : 0.08, 0.06, beakLen, beakColor, 0, hy - (owl ? 0.06 : 0.03), face + beakLen / 2 - 0.02, sp.id === 'kiwiBird' ? 0.35 : 0)
  if (owl) {
    for (const sx of [-1, 1]) box(b, 0.13, 0.13, 0.02, '#f2c23a', sx * 0.09, hy + 0.04, face + 0.005)
    eyes(b, 0.09, hy + 0.04, face + 0.02, 0.06)
  } else eyes(b, 0.09, hy + 0.04, face, 0.055)
  if (sp.extra === 'comb') for (let i = 0; i < 3; i++) box(b, 0.05, 0.09, 0.07, '#e2443a', 0, hy + hs / 2 + 0.03, hz + 0.08 - i * 0.07)
  if (sp.extra === 'crest') for (let i = -1; i <= 1; i++) box(b, 0.015, 0.15, 0.015, shade(p.main, -0.2), i * 0.04, hy + hs / 2 + 0.07, hz - 0.02, 0, 0, i * 0.3)
  if (sp.tail === 'fan')
    for (let i = -4; i <= 4; i++) {
      const a = (i / 4) * 1.1
      box(b, 0.12, 0.85, 0.03, p.second, Math.sin(a) * 0.42, by + 0.25 + Math.cos(a) * 0.42, -0.36, 0, 0, -a)
      box(b, 0.07, 0.07, 0.02, '#1b3f8f', Math.sin(a) * 0.72, by + 0.25 + Math.cos(a) * 0.72, -0.34, 0, 0, -a)
    }
  else box(b, 0.3, 0.08, 0.2, shade(p.main, -0.12), 0, by + 0.1, -0.33 * L, 0.4)
  if (sp.mark === 'spots') for (let i = 0; i < 8; i++) box(b, 0.05, 0.05, 0.05, p.second, ((i * 29) % 5) * 0.08 - 0.16, by + 0.18, ((i * 41) % 6) * 0.08 - 0.22)
}

function lizard(b: B) {
  const { sp, p } = b
  const L = sp.long ?? 1
  const Lg = sp.legs ?? 1
  const legH = 0.12 * Lg
  const by = legH + 0.11
  const bl = 0.8 * L
  box(b, 0.36, 0.22, bl, p.main, 0, by, 0)
  box(b, 0.3, 0.06, bl * 0.8, p.second, 0, by - 0.1, 0)
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      box(b, 0.18, 0.06, 0.07, p.main, sx * 0.24, legH + 0.02, sz * bl * 0.32, 0, 0, sx * -0.5)
      box(b, 0.06, legH + 0.04, 0.06, p.main, sx * 0.32, (legH + 0.04) / 2, sz * bl * 0.32)
    }
  const hz = bl / 2 + 0.14
  box(b, 0.32, 0.18, 0.3, p.main, 0, by + 0.02, hz)
  eyes(b, 0.12, by + 0.07, hz + 0.15, 0.06)
  if (sp.id === 'skink') box(b, 0.06, 0.02, 0.08, '#3b6fd6', 0, by - 0.05, hz + 0.18)
  if (sp.tail === 'curl') {
    const m = new Mesh(new TorusGeometry(0.12, 0.05, 6, 14, Math.PI * 1.6), mat(p.main))
    m.position.set(0, by - 0.02, -bl / 2 - 0.1)
    m.rotation.set(0, Math.PI / 2, 0)
    b.g.add(m)
  } else if (sp.tail === 'thick') box(b, 0.22, 0.16, 0.36, p.main, 0, by - 0.02, -bl / 2 - 0.16)
  else for (let i = 0; i < 3; i++) box(b, 0.24 - i * 0.06, 0.14 - i * 0.03, 0.28, p.main, 0, by - 0.03 - i * 0.02, -bl / 2 - 0.12 - i * 0.24)
  if (sp.mark === 'spots') for (let i = 0; i < 10; i++) box(b, 0.05, 0.03, 0.05, p.mark, ((i * 31) % 5) * 0.06 - 0.12, by + 0.11, bl / 2 - 0.05 - ((i * 47) % 9) * (bl / 9))
  if (sp.mark === 'bands') for (let i = 0; i < 4; i++) box(b, 0.38, 0.24, 0.06, p.mark, 0, by, bl / 2 - 0.15 - i * (bl / 4))
  if (sp.extra === 'gills')
    for (const sx of [-1, 1]) for (let i = -1; i <= 1; i++) box(b, 0.04, 0.16, 0.04, p.second, sx * 0.2, by + 0.1, hz - 0.08 + i * 0.06, 0, 0, sx * (0.6 + i * 0.2))
  if (sp.extra === 'crest') for (let i = 0; i < 6; i++) cone(b, 0.03, 0.1, shade(p.main, -0.25), 0, by + 0.15, hz - 0.05 - i * (bl / 6))
  if (sp.extra === 'frill') box(b, 0.5, 0.2, 0.05, shade(p.main, -0.1), 0, by + 0.02, hz - 0.12)
}

function snake(b: B) {
  const { sp, p } = b
  const n = 9
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const x = Math.sin(t * Math.PI * 1.6) * 0.32
    const z = 0.55 - t * 1.1
    const w = 0.2 - t * 0.1
    box(b, w, w * 0.8, 0.18, sp.mark === 'bands' && i % 2 ? p.second : p.main, x, w * 0.4, z)
  }
  box(b, 0.24, 0.14, 0.24, p.main, 0, 0.1, 0.72)
  eyes(b, 0.08, 0.15, 0.84, 0.05)
  box(b, 0.02, 0.01, 0.1, '#e2443a', 0, 0.07, 0.88)
}

function frog(b: B) {
  const { p } = b
  box(b, 0.56, 0.32, 0.52, p.main, 0, 0.2, 0)
  box(b, 0.46, 0.08, 0.42, p.second, 0, 0.05, 0.03)
  for (const sx of [-1, 1]) {
    box(b, 0.14, 0.14, 0.14, p.main, sx * 0.16, 0.4, 0.14)
    box(b, 0.09, 0.09, 0.04, '#1d1716', sx * 0.16, 0.42, 0.21)
    box(b, 0.03, 0.03, 0.02, '#ffffff', sx * 0.16 + 0.02, 0.45, 0.23)
    box(b, 0.14, 0.12, 0.32, p.main, sx * 0.3, 0.08, -0.1)
    box(b, 0.12, 0.04, 0.12, p.second, sx * 0.3, 0.02, 0.1)
  }
  box(b, 0.3, 0.02, 0.02, shade(p.main, -0.4), 0, 0.17, 0.27)
}

function turtle(b: B) {
  const { p } = b
  const skin = shade(p.second, -0.1)
  box(b, 0.62, 0.3, 0.74, p.main, 0, 0.28, 0)
  box(b, 0.66, 0.08, 0.78, shade(p.main, -0.25), 0, 0.13, 0)
  for (let i = 0; i < 3; i++) box(b, 0.18, 0.04, 0.18, shade(p.main, 0.15), (i - 1) * 0.2, 0.44, 0.08 - (i % 2) * 0.2)
  box(b, 0.22, 0.18, 0.24, skin, 0, 0.2, 0.46)
  eyes(b, 0.07, 0.25, 0.58, 0.05)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(b, 0.14, 0.12, 0.14, skin, sx * 0.28, 0.06, sz * 0.26)
}

function snail(b: B) {
  const { p } = b
  box(b, 0.26, 0.12, 0.84, p.second, 0, 0.06, 0.06)
  box(b, 0.2, 0.16, 0.18, p.second, 0, 0.14, 0.42)
  for (const sx of [-1, 1]) {
    box(b, 0.03, 0.2, 0.03, p.second, sx * 0.06, 0.3, 0.46)
    box(b, 0.05, 0.05, 0.05, '#1d1716', sx * 0.06, 0.41, 0.46)
  }
  box(b, 0.32, 0.5, 0.5, p.main, 0, 0.36, -0.1)
  const m = new Mesh(new TorusGeometry(0.13, 0.04, 6, 16), mat(shade(p.main, -0.3)))
  m.position.set(0, 0.38, -0.1)
  m.rotation.set(0, Math.PI / 2, 0)
  b.g.add(m)
}

function crab(b: B) {
  const { p } = b
  box(b, 0.5, 0.48, 0.5, p.second, 0, 0.4, -0.12, 0.3)
  const m = new Mesh(new TorusGeometry(0.13, 0.04, 6, 16), mat(shade(p.second, -0.25)))
  m.position.set(0.26, 0.42, -0.12)
  m.rotation.set(0, Math.PI / 2, 0)
  b.g.add(m)
  box(b, 0.4, 0.2, 0.3, p.main, 0, 0.17, 0.18)
  for (const sx of [-1, 1]) {
    box(b, 0.16, 0.14, 0.16, p.main, sx * 0.24, 0.16, 0.38)
    box(b, 0.03, 0.14, 0.03, p.main, sx * 0.08, 0.32, 0.3)
    box(b, 0.05, 0.05, 0.05, '#1d1716', sx * 0.08, 0.4, 0.3)
    for (let i = 0; i < 3; i++) box(b, 0.24, 0.04, 0.04, shade(p.main, -0.15), sx * 0.3, 0.07, 0.14 - i * 0.1, 0, 0, sx * 0.4)
  }
}

function bat(b: B) {
  const { sp, p } = b
  box(b, 0.3, 0.36, 0.26, p.main, 0, 0.34, 0)
  box(b, 0.28, 0.24, 0.24, p.main, 0, 0.62, 0.02)
  box(b, 0.1, 0.06, 0.04, '#e8b4b8', 0, 0.58, 0.15)
  eyes(b, 0.07, 0.66, 0.14, 0.05)
  ears(b, sp.ears, 0.09, 0.72, 0.0, 0.8)
  for (const sx of [-1, 1]) {
    box(b, 0.5, 0.36, 0.03, p.second, sx * 0.38, 0.42, -0.02, 0, 0, sx * 0.2)
    box(b, 0.5, 0.04, 0.04, p.main, sx * 0.38, 0.6, -0.02, 0, 0, sx * 0.2)
    box(b, 0.06, 0.12, 0.06, p.main, sx * 0.08, 0.08, 0)
  }
  if (sp.id === 'vampireBat') for (const sx of [-1, 1]) box(b, 0.02, 0.04, 0.02, '#ffffff', sx * 0.03, 0.53, 0.15)
}

function spider(b: B) {
  const { p } = b
  box(b, 0.42, 0.34, 0.46, p.main, 0, 0.3, -0.24)
  box(b, 0.3, 0.2, 0.28, p.main, 0, 0.24, 0.14)
  eyes(b, 0.06, 0.28, 0.28, 0.04)
  for (const sx of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const z = 0.24 - i * 0.1
      box(b, 0.26, 0.05, 0.05, p.main, sx * 0.27, 0.32, z, 0, (i - 1.5) * -0.3 * sx, sx * -0.6)
      box(b, 0.05, 0.05, 0.05, p.second, sx * 0.38, 0.39, z)
      box(b, 0.05, 0.3, 0.05, p.main, sx * 0.46, 0.18, z, 0, 0, sx * 0.25)
    }
}

function seal(b: B) {
  const { p } = b
  box(b, 0.46, 0.38, 0.62, p.main, 0, 0.2, -0.05)
  box(b, 0.36, 0.3, 0.34, p.main, 0, 0.18, -0.46, 0.2)
  box(b, 0.38, 0.12, 0.5, p.second, 0, 0.06, 0.02)
  box(b, 0.34, 0.32, 0.32, p.main, 0, 0.48, 0.24)
  box(b, 0.18, 0.12, 0.08, p.second, 0, 0.42, 0.42)
  box(b, 0.06, 0.04, 0.03, p.nose, 0, 0.46, 0.46)
  eyes(b, 0.09, 0.52, 0.4, 0.07)
  for (const sx of [-1, 1]) {
    box(b, 0.24, 0.05, 0.14, shade(p.main, -0.15), sx * 0.28, 0.06, 0.12, 0, 0.4 * sx, 0)
    box(b, 0.18, 0.04, 0.2, shade(p.main, -0.15), sx * 0.12, 0.05, -0.7, 0, -0.3 * sx, 0)
  }
}

const BUILD: Record<Species['arch'], (b: B) => void> = { quad, rodent, hopper, bird, lizard, snake, frog, turtle, snail, crab, bat, spider, seal }

/** A pet model, 1 unit tall, standing on the floor and facing +z */
export function buildPet(look: PetLook): Group {
  const g = new Group()
  BUILD[look.sp.arch]({ g, p: paintOf(look), sp: look.sp })
  // Scale to exactly 1 tall and set it down at the origin
  const box3 = new Box3().setFromObject(g)
  const size = box3.getSize(new Vector3())
  const s = 1 / Math.max(0.001, size.y)
  const out = new Group()
  g.scale.setScalar(s)
  g.position.set(-((box3.min.x + box3.max.x) / 2) * s, -box3.min.y * s, -((box3.min.z + box3.max.z) / 2) * s)
  out.add(g)
  return out
}

// ---- Pictures for the reel and the pet cards ----

/** A sharp picture of a pet (drawn once, then kept) */
export const petThumb = (look: PetLook) => snapshot(`pet|${look.sp.id}|${look.coat}|${look.color ?? ''}`, buildPet(look))
