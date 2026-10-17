import { useSyncExternalStore } from 'react'
import { Vector3 } from 'three'
import { CELL, ROOM } from '../game/grid'

/**
 * Zooming into the room: scroll the mouse wheel or pinch to zoom toward that spot, drag to look around
 * while zoomed in, or use the + / − buttons. The camera eases toward these values every frame.
 */

export const MAX_ZOOM = 6

/** The camera's screen directions in the world (it looks down from the front-right corner) */
export const SCREEN_RIGHT = new Vector3(1, 0, -1).normalize()
export const SCREEN_UP = new Vector3(-1, 2, -1).normalize()

export const view = {
  /** 1 = the whole studio fits the screen */
  mul: 1,
  /** How far the view has moved from the middle of the room */
  pan: new Vector3(),
  /** Screen pixels per world unit right now (the camera keeps this up to date) */
  zoom: 1,
  /** Pixels per world unit with the whole room in view (the camera keeps this up to date) */
  base: 1,
  /** Until when taps are ignored, because the finger or mouse was dragging the view */
  dragUntil: 0,
}

const listeners = new Set<() => void>()
const changed = () => listeners.forEach((l) => l())
/** The zoom level, for the buttons (1 = whole room) */
export const useZoom = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => void listeners.delete(l)
    },
    () => view.mul,
  )

/** Keep the view inside the room: the more you zoom in, the further you can look around */
function clampPan() {
  const reach = ((ROOM.w + ROOM.d) * CELL * 0.45) * (1 - 1 / view.mul)
  if (view.pan.length() > reach) view.pan.setLength(reach)
}

/** Zoom by a factor, keeping the spot under (dx, dy) pixels from the screen's center in place */
export function zoomAt(factor: number, dx = 0, dy = 0) {
  // Work from where the zoom is heading (not where the animation is right now), so the spot stays put
  const next = Math.min(MAX_ZOOM, Math.max(1, view.mul * factor))
  if (next === view.mul) return
  const before = view.base * view.mul
  const after = view.base * next
  view.mul = next
  const k = 1 / before - 1 / after
  view.pan.addScaledVector(SCREEN_RIGHT, dx * k).addScaledVector(SCREEN_UP, -dy * k)
  clampPan()
  changed()
}

/** Move the view by a drag of (dx, dy) pixels: the room follows the finger */
export function panBy(dx: number, dy: number) {
  view.pan.addScaledVector(SCREEN_RIGHT, -dx / view.zoom).addScaledVector(SCREEN_UP, dy / view.zoom)
  clampPan()
}

export function resetView() {
  view.mul = 1
  view.pan.set(0, 0, 0)
  changed()
}

/** True right after a drag, so letting go doesn't also walk or use furniture */
export const justDragged = () => performance.now() < view.dragUntil
