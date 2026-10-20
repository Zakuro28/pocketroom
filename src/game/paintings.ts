/**
 * Paintings for the walls. Each one is drawn in code onto its canvas (no image files), so new ones are a few
 * lines each. `wide` paintings take two wall cells, the rest one.
 */

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void
export type Painting = { id: string; name: string; price: number; wide?: boolean; frame: string; draw: Draw }

const sky = (g: CanvasRenderingContext2D, h: number, w: number, stops: string[]) => {
  const grad = g.createLinearGradient(0, 0, 0, h)
  stops.forEach((c, k) => grad.addColorStop(k / (stops.length - 1), c))
  g.fillStyle = grad
  g.fillRect(0, 0, w, h)
}
const circle = (g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) => {
  g.fillStyle = color
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
}
/** A filled hill or wave: a smooth line across the picture, filled down to the bottom */
const ridge = (g: CanvasRenderingContext2D, w: number, h: number, base: number, amp: number, waves: number, color: string, phase = 0) => {
  g.fillStyle = color
  g.beginPath()
  g.moveTo(0, h)
  for (let x = 0; x <= w; x += 4) g.lineTo(x, base + Math.sin((x / w) * Math.PI * waves + phase) * amp)
  g.lineTo(w, h)
  g.fill()
}
const stars = (g: CanvasRenderingContext2D, w: number, h: number, n: number, color = '#fff6c9') => {
  g.fillStyle = color
  for (let k = 0; k < n; k++) g.fillRect((k * 73) % w, (k * 37) % h, k % 4 ? 2 : 3, k % 4 ? 2 : 3)
}
const flower = (g: CanvasRenderingContext2D, x: number, y: number, r: number, petal: string, middle: string) => {
  for (let k = 0; k < 6; k++) circle(g, x + Math.cos((k / 6) * Math.PI * 2) * r, y + Math.sin((k / 6) * Math.PI * 2) * r, r * 0.75, petal)
  circle(g, x, y, r * 0.6, middle)
}
const stem = (g: CanvasRenderingContext2D, x: number, top: number, bottom: number, color = '#4f8a4a') => {
  g.strokeStyle = color
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(x, bottom)
  g.lineTo(x, top)
  g.stroke()
}
const tree = (g: CanvasRenderingContext2D, x: number, base: number, size: number, color: string) => {
  g.fillStyle = color
  for (let k = 0; k < 3; k++) {
    const y = base - k * size * 0.45
    g.beginPath()
    g.moveTo(x - size * (0.5 - k * 0.1), y)
    g.lineTo(x + size * (0.5 - k * 0.1), y)
    g.lineTo(x, y - size * 0.7)
    g.fill()
  }
}
const heart = (g: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) => {
  g.fillStyle = color
  g.beginPath()
  g.moveTo(x, y + s * 0.9)
  g.bezierCurveTo(x - s * 1.4, y, x - s * 0.7, y - s, x, y - s * 0.35)
  g.bezierCurveTo(x + s * 0.7, y - s, x + s * 1.4, y, x, y + s * 0.9)
  g.fill()
}

export const PAINTINGS: Painting[] = [
  {
    id: 'artSunsetHills',
    name: 'Sunset Hills',
    price: 600,
    wide: true,
    frame: '#8a5a3b',
    draw: (g, w, h) => {
      sky(g, h, w, ['#ffcf8a', '#f59a7a', '#c96b8f'])
      circle(g, w * 0.7, h * 0.55, h * 0.18, '#fff1b8')
      ridge(g, w, h, h * 0.62, h * 0.06, 2, '#8c6a9e')
      ridge(g, w, h, h * 0.75, h * 0.07, 3, '#5f4b7c', 1)
    },
  },
  {
    id: 'artStarryNight',
    name: 'Starry Night',
    price: 900,
    wide: true,
    frame: '#2b2a30',
    draw: (g, w, h) => {
      sky(g, h, w, ['#141a4a', '#28306a', '#3b4a8f'])
      stars(g, w, h * 0.7, 60)
      for (let k = 0; k < 5; k++) {
        g.strokeStyle = `rgba(160,190,255,${0.25 + k * 0.05})`
        g.lineWidth = 4
        g.beginPath()
        g.arc(w * (0.2 + k * 0.16), h * 0.35, 18 + k * 3, 0, Math.PI * 1.4)
        g.stroke()
      }
      circle(g, w * 0.85, h * 0.22, h * 0.1, '#ffe27a')
      ridge(g, w, h, h * 0.82, h * 0.05, 3, '#10132e')
    },
  },
  {
    id: 'artOceanWaves',
    name: 'Ocean Waves',
    price: 700,
    wide: true,
    frame: '#f5f2ec',
    draw: (g, w, h) => {
      sky(g, h, w, ['#cfeaf7', '#9fd4ef'])
      for (let k = 0; k < 5; k++) ridge(g, w, h, h * (0.45 + k * 0.12), h * 0.04, 6, ['#5bb8d6', '#3c8cf0', '#2f6fc0', '#26508f', '#1d3a6b'][k], k)
      circle(g, w * 0.18, h * 0.2, h * 0.08, '#ffffff')
    },
  },
  {
    id: 'artMountainLake',
    name: 'Mountain Lake',
    price: 800,
    wide: true,
    frame: '#6b4430',
    draw: (g, w, h) => {
      sky(g, h, w, ['#bfe3ff', '#e8f6ff'])
      g.fillStyle = '#7d8fa8'
      g.beginPath()
      g.moveTo(0, h * 0.62)
      g.lineTo(w * 0.3, h * 0.18)
      g.lineTo(w * 0.55, h * 0.62)
      g.lineTo(w * 0.7, h * 0.3)
      g.lineTo(w, h * 0.62)
      g.fill()
      g.fillStyle = '#ffffff'
      g.beginPath()
      g.moveTo(w * 0.24, h * 0.29)
      g.lineTo(w * 0.3, h * 0.18)
      g.lineTo(w * 0.36, h * 0.29)
      g.fill()
      g.fillStyle = '#5bb8d6'
      g.fillRect(0, h * 0.62, w, h * 0.38)
      for (let x = 10; x < w; x += 22) tree(g, x, h * 0.66, 18, '#2f5a3a')
    },
  },
  {
    id: 'artCherryBlossom',
    name: 'Cherry Blossom',
    price: 500,
    frame: '#3a2a22',
    draw: (g, w, h) => {
      g.fillStyle = '#fff4f2'
      g.fillRect(0, 0, w, h)
      g.strokeStyle = '#4a3328'
      g.lineWidth = 8
      g.beginPath()
      g.moveTo(w * 0.1, h)
      g.quadraticCurveTo(w * 0.3, h * 0.5, w * 0.85, h * 0.25)
      g.stroke()
      for (let k = 0; k < 14; k++) flower(g, w * (0.25 + ((k * 37) % 60) / 100), h * (0.15 + ((k * 23) % 45) / 100), 7, '#ffb3c7', '#e8608a')
    },
  },
  {
    id: 'artSunflower',
    name: 'Sunflower',
    price: 450,
    frame: '#c99a5b',
    draw: (g, w, h) => {
      g.fillStyle = '#5bb8d6'
      g.fillRect(0, 0, w, h)
      stem(g, w / 2, h * 0.45, h)
      flower(g, w / 2, h * 0.38, w * 0.13, '#ffcf3a', '#7a4f33')
    },
  },
  {
    id: 'artMoonPhases',
    name: 'Moon Phases',
    price: 650,
    wide: true,
    frame: '#1d1d24',
    draw: (g, w, h) => {
      g.fillStyle = '#1b1f3b'
      g.fillRect(0, 0, w, h)
      stars(g, w, h, 30)
      for (let k = 0; k < 5; k++) {
        const x = w * (0.12 + k * 0.19)
        circle(g, x, h / 2, h * 0.14, '#f6efcf')
        circle(g, x + (k - 2) * h * 0.08, h / 2, h * 0.14 * (k === 2 ? 0 : 1), '#1b1f3b')
      }
    },
  },
  {
    id: 'artCircles',
    name: 'Happy Circles',
    price: 400,
    frame: '#f5f2ec',
    draw: (g, w, h) => {
      g.fillStyle = '#f4ead7'
      g.fillRect(0, 0, w, h)
      ;[
        ['#ef5e57', 0.3, 0.3, 0.22],
        ['#f2d36b', 0.65, 0.4, 0.18],
        ['#5bb8d6', 0.4, 0.7, 0.2],
        ['#7bc96f', 0.75, 0.75, 0.12],
      ].forEach(([c, x, y, r]) => circle(g, w * (x as number), h * (y as number), w * (r as number), c as string))
    },
  },
  {
    id: 'artColorBlocks',
    name: 'Color Blocks',
    price: 400,
    frame: '#2b2a30',
    draw: (g, w, h) => {
      const cols = ['#ef5e57', '#f4ead7', '#3c5fd6', '#f2d36b', '#f4ead7', '#2b2a30']
      for (let k = 0; k < 6; k++) {
        g.fillStyle = cols[k]
        g.fillRect((k % 2) * (w / 2), Math.floor(k / 2) * (h / 3), w / 2, h / 3)
      }
      g.fillStyle = '#2b2a30'
      g.fillRect(w / 2 - 3, 0, 6, h)
      g.fillRect(0, h / 3 - 3, w, 6)
      g.fillRect(0, (2 * h) / 3 - 3, w, 6)
    },
  },
  {
    id: 'artRainbow',
    name: 'Rainbow',
    price: 500,
    frame: '#ffffff',
    draw: (g, w, h) => {
      g.fillStyle = '#eaf6ff'
      g.fillRect(0, 0, w, h)
      ;['#ef5e57', '#f29e4c', '#f2d36b', '#7bc96f', '#5bb8d6', '#a77bf0'].forEach((c, k) => {
        g.strokeStyle = c
        g.lineWidth = 12
        g.beginPath()
        g.arc(w / 2, h * 0.78, w * 0.4 - k * 12, Math.PI, 0)
        g.stroke()
      })
      circle(g, w * 0.15, h * 0.8, 18, '#ffffff')
      circle(g, w * 0.85, h * 0.8, 18, '#ffffff')
    },
  },
  {
    id: 'artCactus',
    name: 'Desert Cactus',
    price: 450,
    frame: '#c4a77d',
    draw: (g, w, h) => {
      sky(g, h, w, ['#ffd9a8', '#f7b98a'])
      g.fillStyle = '#e8c48f'
      g.fillRect(0, h * 0.75, w, h * 0.25)
      g.fillStyle = '#4f8a4a'
      g.fillRect(w * 0.45, h * 0.3, w * 0.1, h * 0.5)
      g.fillRect(w * 0.3, h * 0.45, w * 0.08, h * 0.2)
      g.fillRect(w * 0.3, h * 0.58, w * 0.2, w * 0.06)
      g.fillRect(w * 0.62, h * 0.38, w * 0.08, h * 0.2)
      g.fillRect(w * 0.5, h * 0.52, w * 0.2, w * 0.06)
      circle(g, w * 0.78, h * 0.2, h * 0.07, '#fff1b8')
    },
  },
  {
    id: 'artPineForest',
    name: 'Pine Forest',
    price: 700,
    wide: true,
    frame: '#5a3a24',
    draw: (g, w, h) => {
      sky(g, h, w, ['#dff1e6', '#b7d9c4'])
      for (let k = 0; k < 9; k++) tree(g, w * (0.06 + k * 0.11), h * 0.95, 34 + (k % 3) * 10, k % 2 ? '#2f5a3a' : '#3f7a4a')
    },
  },
  {
    id: 'artCityNight',
    name: 'City at Night',
    price: 900,
    wide: true,
    frame: '#2b2a30',
    draw: (g, w, h) => {
      sky(g, h, w, ['#1b1f3b', '#3b2f6a', '#c96b8f'])
      stars(g, w, h * 0.4, 20)
      for (let k = 0; k < 12; k++) {
        const bw = w / 12
        const bh = h * (0.3 + ((k * 37) % 40) / 100)
        g.fillStyle = '#16152a'
        g.fillRect(k * bw, h - bh, bw - 2, bh)
        g.fillStyle = '#ffd86b'
        for (let y = h - bh + 6; y < h - 6; y += 10) for (let x = k * bw + 3; x < (k + 1) * bw - 6; x += 7) if ((x + y + k) % 3) g.fillRect(x, y, 3, 4)
      }
    },
  },
  {
    id: 'artHeart',
    name: 'Big Heart',
    price: 400,
    frame: '#f28bb8',
    draw: (g, w, h) => {
      g.fillStyle = '#fff1f5'
      g.fillRect(0, 0, w, h)
      heart(g, w / 2, h * 0.48, w * 0.28, '#ef5e78')
    },
  },
  {
    id: 'artCat',
    name: 'Cat Portrait',
    price: 600,
    frame: '#8a5a3b',
    draw: (g, w, h) => {
      g.fillStyle = '#cfe3f3'
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#f29e4c'
      g.beginPath()
      g.moveTo(w * 0.28, h * 0.4)
      g.lineTo(w * 0.32, h * 0.2)
      g.lineTo(w * 0.45, h * 0.34)
      g.moveTo(w * 0.72, h * 0.4)
      g.lineTo(w * 0.68, h * 0.2)
      g.lineTo(w * 0.55, h * 0.34)
      g.fill()
      circle(g, w / 2, h * 0.52, w * 0.27, '#f29e4c')
      circle(g, w * 0.4, h * 0.48, 6, '#2b2233')
      circle(g, w * 0.6, h * 0.48, 6, '#2b2233')
      circle(g, w / 2, h * 0.57, 4, '#e8608a')
      g.fillStyle = '#7a8a99'
      g.fillRect(0, h * 0.82, w, h * 0.18)
    },
  },
  {
    id: 'artLemons',
    name: 'Lemons',
    price: 450,
    frame: '#f5f2ec',
    draw: (g, w, h) => {
      g.fillStyle = '#3c5fd6'
      g.fillRect(0, 0, w, h)
      for (let k = 0; k < 6; k++) {
        const x = w * (0.22 + (k % 3) * 0.28)
        const y = h * (0.3 + Math.floor(k / 3) * 0.4)
        g.fillStyle = '#ffd85a'
        g.beginPath()
        g.ellipse(x, y, w * 0.11, w * 0.08, 0.4, 0, Math.PI * 2)
        g.fill()
        circle(g, x + w * 0.06, y - w * 0.07, 5, '#4f8a4a')
      }
    },
  },
  {
    id: 'artTulips',
    name: 'Tulips',
    price: 500,
    frame: '#ffffff',
    draw: (g, w, h) => {
      g.fillStyle = '#fbf3e4'
      g.fillRect(0, 0, w, h)
      ;['#ef5e57', '#f28bb8', '#f2d36b', '#a77bf0'].forEach((c, k) => {
        const x = w * (0.2 + k * 0.2)
        stem(g, x, h * 0.4, h * 0.9)
        g.fillStyle = c
        g.beginPath()
        g.moveTo(x - 14, h * 0.3)
        g.lineTo(x - 14, h * 0.42)
        g.quadraticCurveTo(x, h * 0.5, x + 14, h * 0.42)
        g.lineTo(x + 14, h * 0.3)
        g.lineTo(x + 6, h * 0.36)
        g.lineTo(x, h * 0.28)
        g.lineTo(x - 6, h * 0.36)
        g.fill()
      })
    },
  },
  {
    id: 'artAurora',
    name: 'Northern Lights',
    price: 1200,
    wide: true,
    frame: '#1d1d24',
    draw: (g, w, h) => {
      sky(g, h, w, ['#0e1430', '#1a2a50'])
      stars(g, w, h * 0.6, 40)
      ;['rgba(123,224,200,0.55)', 'rgba(167,123,240,0.45)', 'rgba(91,184,214,0.5)'].forEach((c, k) => {
        g.strokeStyle = c
        g.lineWidth = 16
        g.beginPath()
        for (let x = 0; x <= w; x += 6) g.lineTo(x, h * (0.25 + k * 0.1) + Math.sin(x / 30 + k) * 12)
        g.stroke()
      })
      ridge(g, w, h, h * 0.82, h * 0.04, 4, '#0a0d1e')
    },
  },
  {
    id: 'artGoldenWave',
    name: 'Golden Wave',
    price: 8000,
    wide: true,
    frame: '#e8b84a',
    draw: (g, w, h) => {
      sky(g, h, w, ['#fff4d6', '#f6e3a0'])
      for (let k = 0; k < 4; k++) ridge(g, w, h, h * (0.4 + k * 0.15), h * 0.08, 3, ['#e8b84a', '#d9a93b', '#b8862a', '#8a6420'][k], k * 0.8)
      circle(g, w * 0.8, h * 0.25, h * 0.1, '#ffffff')
    },
  },
  {
    id: 'artGildedSun',
    name: 'Gilded Sun',
    price: 9000,
    frame: '#e8b84a',
    draw: (g, w, h) => {
      g.fillStyle = '#1d2a6b'
      g.fillRect(0, 0, w, h)
      g.strokeStyle = '#f4d35e'
      g.lineWidth = 5
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2
        g.beginPath()
        g.moveTo(w / 2 + Math.cos(a) * w * 0.2, h / 2 + Math.sin(a) * w * 0.2)
        g.lineTo(w / 2 + Math.cos(a) * w * 0.4, h / 2 + Math.sin(a) * w * 0.4)
        g.stroke()
      }
      circle(g, w / 2, h / 2, w * 0.17, '#f4d35e')
    },
  },
]

export const PAINTING: Record<string, Painting> = Object.fromEntries(PAINTINGS.map((p) => [p.id, p]))

/** Size of a painting as a model: width, height, depth (a wide one spans two wall cells) */
export const paintingSize = (p: Painting): [number, number, number] => (p.wide ? [0.95, 0.52, 0.04] : [0.45, 0.56, 0.04])
