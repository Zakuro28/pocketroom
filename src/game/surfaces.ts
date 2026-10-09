/** A floor or wallpaper style, drawn into a small tile that repeats */
export type Surface = { id: string; name: string; price: number; base: string; draw: (g: CanvasRenderingContext2D, s: number) => void }

const planks = (a: string, b: string, line: string) => (g: CanvasRenderingContext2D, s: number) => {
  for (let k = 0; k < 4; k++) {
    g.fillStyle = k % 2 ? a : b
    g.fillRect(0, (k * s) / 4, s, s / 4)
    g.fillStyle = line
    g.fillRect(0, (k * s) / 4, s, 2)
    g.fillRect(((k * 37) % 4) * (s / 4) + s / 8, (k * s) / 4, 2, s / 4)
  }
}
const tiles = (a: string, b: string, line: string, checker = false) => (g: CanvasRenderingContext2D, s: number) => {
  for (let x = 0; x < 2; x++)
    for (let y = 0; y < 2; y++) {
      g.fillStyle = checker && (x + y) % 2 ? b : a
      g.fillRect((x * s) / 2, (y * s) / 2, s / 2, s / 2)
    }
  g.fillStyle = line
  g.fillRect(0, 0, s, 2)
  g.fillRect(0, s / 2, s, 2)
  g.fillRect(0, 0, 2, s)
  g.fillRect(s / 2, 0, 2, s)
}
const speckle = (dot: string, n = 60) => (g: CanvasRenderingContext2D, s: number) => {
  g.fillStyle = dot
  for (let k = 0; k < n; k++) g.fillRect((k * 53) % s, (k * 97) % s, 2, 2)
}
const stripes = (a: string, w: number) => (g: CanvasRenderingContext2D, s: number) => {
  g.fillStyle = a
  for (let x = 0; x < s; x += w * 2) g.fillRect(x, 0, w, s)
}
const dots = (a: string) => (g: CanvasRenderingContext2D, s: number) => {
  g.fillStyle = a
  for (const [x, y] of [
    [0.25, 0.25],
    [0.75, 0.75],
  ]) {
    g.beginPath()
    g.arc(x * s, y * s, s / 14, 0, Math.PI * 2)
    g.fill()
  }
}
const bricks = (line: string) => (g: CanvasRenderingContext2D, s: number) => {
  g.fillStyle = line
  for (let r = 0; r < 4; r++) {
    g.fillRect(0, (r * s) / 4, s, 3)
    const off = r % 2 ? s / 4 : 0
    g.fillRect(off, (r * s) / 4, 3, s / 4)
    g.fillRect(off + s / 2, (r * s) / 4, 3, s / 4)
  }
}
const stars = (g: CanvasRenderingContext2D, s: number) => {
  g.fillStyle = '#fff6c9'
  for (let k = 0; k < 9; k++) {
    const x = (k * 71) % s
    const y = (k * 113) % s
    g.fillRect(x, y, k % 3 ? 2 : 3, k % 3 ? 2 : 3)
  }
}

export const FLOORS: Surface[] = [
  { id: 'oak', name: 'Oak Planks', price: 0, base: '#d9a66b', draw: planks('#d9a66b', '#cf9a5f', '#b98250') },
  { id: 'honey', name: 'Honey Planks', price: 300, base: '#e8bd7e', draw: planks('#e8bd7e', '#e0b273', '#c99a5b') },
  { id: 'mintCarpet', name: 'Mint Carpet', price: 350, base: '#a9dcc8', draw: speckle('#93cdb7') },
  { id: 'blushCarpet', name: 'Blush Carpet', price: 350, base: '#f1c2c8', draw: speckle('#e6adb5') },
  { id: 'whiteTile', name: 'White Tiles', price: 400, base: '#eef0f2', draw: tiles('#eef0f2', '#eef0f2', '#cfd5da') },
  { id: 'walnut', name: 'Walnut', price: 900, base: '#8a5a3b', draw: planks('#8a5a3b', '#7f5235', '#653f28') },
  { id: 'checker', name: 'Checkerboard', price: 1000, base: '#f4f1ea', draw: tiles('#f4f1ea', '#3b3f4a', '#c9c5bb', true) },
  { id: 'tatami', name: 'Tatami', price: 2800, base: '#c9c58a', draw: stripes('#bdb87c', 6) },
  { id: 'marble', name: 'Marble', price: 3000, base: '#f3f1ef', draw: speckle('#d8d3cf', 120) },
  { id: 'galaxy', name: 'Galaxy Floor', price: 9000, base: '#232650', draw: stars },
]

export const WALLS: Surface[] = [
  { id: 'cream', name: 'Cream', price: 0, base: '#f4ead7', draw: () => {} },
  { id: 'sage', name: 'Sage', price: 300, base: '#cfdcc4', draw: () => {} },
  { id: 'blush', name: 'Blush', price: 300, base: '#f3d3d3', draw: () => {} },
  { id: 'sky', name: 'Sky', price: 300, base: '#cfe3f3', draw: () => {} },
  { id: 'stripes', name: 'Candy Stripes', price: 800, base: '#f6efe2', draw: stripes('#f2d9d2', 16) },
  { id: 'polka', name: 'Polka Dots', price: 850, base: '#e9e2f6', draw: dots('#d3c6ef') },
  { id: 'brick', name: 'Brick', price: 1200, base: '#c9775a', draw: bricks('#a85f47') },
  { id: 'woodPanel', name: 'Wood Panels', price: 2600, base: '#b98557', draw: stripes('#a97648', 4) },
  { id: 'nightSky', name: 'Night Sky', price: 8000, base: '#28306a', draw: stars },
]

const swatches = new Map<string, string>()
/** A small picture of the pattern, for the shop */
export function swatch(s: Surface) {
  const hit = swatches.get(s.id)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = s.base
  g.fillRect(0, 0, 64, 64)
  s.draw(g, 64)
  const url = c.toDataURL()
  swatches.set(s.id, url)
  return url
}
