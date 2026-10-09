import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import type { Surface } from '../game/surfaces'

const cache = new Map<string, CanvasTexture>()

/** A repeating texture for a floor or wallpaper style (made once, then reused) */
export function surfaceTexture(s: Surface) {
  const hit = cache.get(s.id)
  if (hit) return hit
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = s.base
  g.fillRect(0, 0, size, size)
  s.draw(g, size)
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  cache.set(s.id, t)
  return t
}
