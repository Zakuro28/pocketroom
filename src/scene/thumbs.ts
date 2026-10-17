import { AmbientLight, Box3, DirectionalLight, Group, OrthographicCamera, Scene, Sphere, Vector3, WebGLRenderer, type Object3D } from 'three'
import { GLTFLoader } from 'three-stdlib'
import { paintModel } from './paint'

/**
 * Sharp pictures of 3D things for the shop, the pet cards and the reel. One hidden renderer draws each
 * picture once at a high resolution (so it stays crisp on phones and when zoomed in) and keeps it.
 */

/** Pixels per side; cards show them at 70–160 px, so this stays sharp at 2–3× screen density */
const SIZE = 384

let renderer: WebGLRenderer | null = null
const cache = new Map<string, string>()

/** Draw an object from the front-right, three-quarters above, fitted to the picture */
export function snapshot(key: string, obj: Object3D, view: [number, number, number] = [2.2, 1.6, 3]): string {
  const hit = cache.get(key)
  if (hit) return hit
  try {
    renderer ??= new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(1)
    renderer.setSize(SIZE, SIZE)
    const scene = new Scene()
    scene.add(new AmbientLight('#fff4e6', 1.5))
    const sun = new DirectionalLight('#ffffff', 1.6)
    sun.position.set(2, 4, 3)
    scene.add(sun)
    const holder = new Group()
    holder.add(obj)
    scene.add(holder)
    // Fit by the bounding sphere so any shape fills the picture without being cut off
    const sphere = new Box3().setFromObject(holder).getBoundingSphere(new Sphere())
    holder.position.sub(sphere.center)
    const r = sphere.radius * 1.04
    const cam = new OrthographicCamera(-r, r, r, -r, 0.01, 100)
    cam.position.copy(new Vector3(...view).normalize().multiplyScalar(r * 4))
    cam.lookAt(0, 0, 0)
    renderer.render(scene, cam)
    const url = renderer.domElement.toDataURL('image/png')
    cache.set(key, url)
    holder.remove(obj)
    return url
  } catch {
    return ''
  }
}

// ---- Furniture pictures (the models load once, then each painted version is drawn once) ----

const loader = new GLTFLoader()
const models = new Map<string, Promise<Object3D>>()
const load = (model: string) => {
  let p = models.get(model)
  if (!p) {
    p = loader.loadAsync(`/models/${model}.glb`).then((g) => g.scene)
    models.set(model, p)
  }
  return p
}

/** A sharp picture of a piece of furniture, in its special colors */
export async function itemThumb(model: string, paint?: Record<string, string>): Promise<string> {
  const key = `item|${model}|${JSON.stringify(paint ?? {})}`
  const hit = cache.get(key)
  if (hit) return hit
  const scene = await load(model)
  return snapshot(key, paintModel(scene, paint), [1.6, 1.25, 1.6])
}

/** A picture already drawn, if any (so it shows straight away without a flicker) */
export const cachedItemThumb = (model: string, paint?: Record<string, string>) => cache.get(`item|${model}|${JSON.stringify(paint ?? {})}`)
