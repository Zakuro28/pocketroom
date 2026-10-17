import { Box3, Color, Mesh, type MeshStandardMaterial, type Object3D } from 'three'

/**
 * A copy of a furniture model, recolored for special versions or the player's fabric choice (and see-through
 * while it's being placed), centered so it turns on the spot and standing on the floor.
 */
export function paintModel(source: Object3D, paint?: Record<string, string>, fabric?: string, ghost = false) {
  const obj = source.clone(true)
  const colors: Record<string, string> = { ...paint }
  if (fabric) {
    colors.carpet = fabric
    colors.carpetDarker = `#${new Color(fabric).multiplyScalar(0.7).getHexString()}`
    colors.carpetBlue = fabric
  }
  obj.traverse((o: Object3D) => {
    if (!(o instanceof Mesh)) return
    o.castShadow = !ghost
    o.receiveShadow = !ghost
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    const next = mats.map((m: MeshStandardMaterial) => {
      const color = colors[m.name]
      if (!color && !ghost) return m
      const c = m.clone()
      if (color) c.color.set(color)
      if (ghost) {
        c.transparent = true
        c.opacity = 0.55
        c.depthWrite = false
      }
      return c
    })
    o.material = Array.isArray(o.material) ? next : next[0]
  })
  const box = new Box3().setFromObject(obj)
  obj.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2)
  return obj
}
