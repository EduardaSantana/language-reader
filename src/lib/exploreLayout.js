const RADIUS_STEP = 110
const ROOT_SPACING = 260
const CANVAS_PADDING = 70
const MIN_SEPARATION = 68
const MAX_RADIUS_ATTEMPTS = 6

function tooClose(x, y, positions) {
  for (const p of positions.values()) {
    const dx = p.x - x
    const dy = p.y - y
    if (Math.sqrt(dx * dx + dy * dy) < MIN_SEPARATION) return true
  }
  return false
}

export function layoutWeb(nodes) {
  const byParent = new Map()
  for (const n of nodes) {
    const key = n.parentId ?? 'root'
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(n)
  }
  const positions = new Map()
  const roots = byParent.get('root') ?? []

  function place(node, x, y, incomingAngle) {
    positions.set(node.id, { x, y })
    const children = byParent.get(node.id) ?? []
    if (children.length === 0) return
    const isRoot = incomingAngle == null
    const arcSpan = isRoot ? Math.PI * 2 : Math.PI * 1.3
    const arcStart = isRoot ? -Math.PI / 2 - arcSpan / 2 : incomingAngle - arcSpan / 2
    children.forEach((child, i) => {
      const angle =
        children.length === 1 ? (isRoot ? -Math.PI / 2 : incomingAngle) : arcStart + (arcSpan * i) / (children.length - 1)

      let radius = RADIUS_STEP
      let cx = x + Math.cos(angle) * radius
      let cy = y + Math.sin(angle) * radius
      let attempts = 0
      while (tooClose(cx, cy, positions) && attempts < MAX_RADIUS_ATTEMPTS) {
        attempts += 1
        radius += MIN_SEPARATION * 0.7
        cx = x + Math.cos(angle) * radius
        cy = y + Math.sin(angle) * radius
      }

      place(child, cx, cy, angle)
    })
  }

  roots.forEach((root, i) => {
    place(root, i * ROOT_SPACING, 0, null)
  })

  const xs = [...positions.values()].map((p) => p.x)
  const ys = [...positions.values()].map((p) => p.y)
  const minX = Math.min(0, ...xs)
  const minY = Math.min(0, ...ys)
  const maxX = Math.max(0, ...xs)
  const maxY = Math.max(0, ...ys)
  const offsetX = CANVAS_PADDING - minX
  const offsetY = CANVAS_PADDING - minY

  const normalized = new Map()
  for (const [id, p] of positions) {
    normalized.set(id, { x: p.x + offsetX, y: p.y + offsetY })
  }
  return {
    positions: normalized,
    width: maxX - minX + CANVAS_PADDING * 2,
    height: maxY - minY + CANVAS_PADDING * 2,
  }
}
