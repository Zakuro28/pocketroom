import { Minus, Plus, Scan } from 'lucide-react'
import { MAX_ZOOM, resetView, useZoom, zoomAt } from '../scene/view'

/** Zoom in and out of the room, and back to the whole room */
export function ZoomButtons() {
  const zoom = useZoom()
  const btn = 'chunky grid size-10 place-items-center rounded-full bg-cream text-ink disabled:opacity-40'
  return (
    <div className="pointer-events-auto absolute top-1/2 right-3 flex -translate-y-1/2 flex-col gap-2 sm:right-5">
      <button type="button" onClick={() => zoomAt(1.5)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in" className={btn}>
        <Plus className="size-5" />
      </button>
      <button type="button" onClick={() => zoomAt(1 / 1.5)} disabled={zoom <= 1} aria-label="Zoom out" className={btn}>
        <Minus className="size-5" />
      </button>
      {zoom > 1.01 && (
        <button type="button" onClick={resetView} aria-label="Show the whole room" className={btn}>
          <Scan className="size-5" />
        </button>
      )}
    </div>
  )
}
