import { BoxGeometry, CanvasTexture, Group, Mesh, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from 'three'
import { PAINTING, paintingSize } from '../game/paintings'

const built = new Map<string, Group>()

/** A framed painting, facing +z like the furniture models, drawn once and then reused */
export function buildPainting(id: string): Group {
  const hit = built.get(id)
  if (hit) return hit
  const p = PAINTING[id]
  const [w, h, d] = paintingSize(p)
  const g = new Group()
  const frameMat = new MeshStandardMaterial({ color: p.frame, roughness: 0.6, name: 'frame' })
  const border = 0.035
  // Back board and the four sides of the frame
  const back = new Mesh(new BoxGeometry(w, h, d * 0.5), frameMat)
  back.position.set(0, h / 2, -d * 0.25)
  g.add(back)
  for (const [bw, bh, x, y] of [
    [w, border, 0, h - border / 2],
    [w, border, 0, border / 2],
    [border, h, -w / 2 + border / 2, h / 2],
    [border, h, w / 2 - border / 2, h / 2],
  ]) {
    const m = new Mesh(new BoxGeometry(bw, bh, d), frameMat)
    m.position.set(x, y, 0)
    g.add(m)
  }
  // The picture itself
  const px = 256
  const c = document.createElement('canvas')
  c.width = px
  c.height = Math.round((px * (h - border * 2)) / (w - border * 2))
  p.draw(c.getContext('2d')!, c.width, c.height)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  const art = new Mesh(new PlaneGeometry(w - border * 2, h - border * 2), new MeshStandardMaterial({ map: tex, roughness: 0.9, name: 'canvas' }))
  art.position.set(0, h / 2, d * 0.02)
  g.add(art)
  built.set(id, g)
  return g
}
