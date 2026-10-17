import { useEffect, useRef } from 'react'

/**
 * A row that slides sideways: swipe on phones, scroll wheel or drag with a mouse.
 * Replaces wrapping grids, which needed hovering and scrolling up and down on small screens.
 */
export function Slide({ children, className = '', label, role }: { children: React.ReactNode; className?: string; label?: string; role?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // A mouse wheel scrolls the row sideways
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    // Dragging with a mouse slides it too; a real drag doesn't count as a click
    let down: { x: number; left: number } | null = null
    let dragged = false
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      down = { x: e.clientX, left: el.scrollLeft }
      dragged = false
    }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      const dx = e.clientX - down.x
      if (Math.abs(dx) > 6) dragged = true
      if (dragged) el.scrollLeft = down.left - dx
    }
    const onUp = () => void (down = null)
    const onClick = (e: MouseEvent) => {
      if (!dragged) return
      e.preventDefault()
      e.stopPropagation()
      dragged = false
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('click', onClick, true)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('click', onClick, true)
    }
  }, [])
  return (
    <div ref={ref} className={`slide ${className}`} role={role} aria-label={label}>
      {children}
    </div>
  )
}
