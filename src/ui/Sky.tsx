import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import type { Kind } from '../lib/weather'

/** The backdrop behind the room: a sky gradient, sun or moon, drifting clouds, and light rain or snow */
export default function Sky({ top, bottom, kind, night }: { top: string; bottom: string; kind: Kind; night: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()
  const falling = kind === 'rain' || kind === 'storm' || kind === 'snow'

  // A few dozen drops or flakes on one small canvas: cheap enough for phones
  useEffect(() => {
    const c = canvas.current
    if (!c || !falling || reduce) return
    const g = c.getContext('2d')!
    let raf = 0
    const resize = () => {
      c.width = c.clientWidth
      c.height = c.clientHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const snow = kind === 'snow'
    const n = kind === 'storm' ? 110 : 70
    const parts = Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 0.8 }))
    let last = performance.now()
    let flash = 0
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      g.clearRect(0, 0, c.width, c.height)
      if (kind === 'storm') {
        if (Math.random() < 0.002) flash = 1
        flash *= 0.9
        if (flash > 0.02) {
          g.fillStyle = `rgba(255,255,255,${flash * 0.35})`
          g.fillRect(0, 0, c.width, c.height)
        }
      }
      g.fillStyle = snow ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)'
      for (const p of parts) {
        p.y += dt * (snow ? 0.06 : 0.9) * p.s
        p.x += dt * (snow ? Math.sin(now / 900 + p.s * 9) * 0.01 : -0.06)
        if (p.y > 1) {
          p.y = -0.02
          p.x = Math.random() * 1.1
        }
        const x = p.x * c.width
        const y = p.y * c.height
        if (snow) {
          g.beginPath()
          g.arc(x, y, 1.5 + p.s * 1.5, 0, Math.PI * 2)
          g.fill()
        } else g.fillRect(x, y, 1.4, 12 * p.s)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [falling, kind, reduce])

  const clouds = kind === 'clear' ? 2 : kind === 'cloudy' || kind === 'fog' ? 5 : 4
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`, transition: 'background 1.2s ease' }} aria-hidden>
      {(kind === 'clear' || kind === 'cloudy') && (
        <div
          className="absolute top-[9%] right-[12%] size-20 rounded-full sm:size-28"
          style={night ? { background: '#fdf6d8', boxShadow: '0 0 60px 10px rgba(253,246,216,0.25)' } : { background: '#fff3b8', boxShadow: '0 0 80px 30px rgba(255,236,160,0.55)' }}
        />
      )}
      {night && kind === 'clear' && (
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(1.5px 1.5px at 20% 30%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 70% 15%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 45% 55%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 85% 45%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 10% 70%, #fff 50%, transparent 51%)' }} />
      )}
      {Array.from({ length: clouds }, (_, k) => (
        <div
          key={k}
          className="cloud"
          style={{
            top: `${6 + ((k * 17) % 40)}%`,
            width: `${160 + ((k * 53) % 140)}px`,
            height: `${46 + ((k * 13) % 30)}px`,
            background: night ? 'rgba(255,255,255,0.08)' : kind === 'clear' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)',
            animationDuration: `${90 + k * 35}s`,
            animationDelay: `${-k * 31}s`,
          }}
        />
      ))}
      {falling && <canvas ref={canvas} className="absolute inset-0 size-full" />}
    </div>
  )
}
