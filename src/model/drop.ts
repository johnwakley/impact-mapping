import type { ImpactMap, MapNode } from '../types.ts'
import type { Layout } from './layout.ts'
import { KIND_ORDER } from './schema.ts'
import { descendants, visibleIds } from './tree.ts'

/** Vertical extent of a node together with everything under it. */
function band(map: ImpactMap, layout: Layout, id: string): [number, number] {
  let top = Infinity
  let bottom = -Infinity
  for (const nid of [id, ...descendants(map, id)]) {
    const p = layout.placements[nid]
    if (!p) continue
    top = Math.min(top, p.y)
    bottom = Math.max(bottom, p.y + p.height)
  }
  return [top, bottom]
}

export interface DropTarget {
  parentId: string
  index: number
}

/**
 * Where a dragged card should land. Candidates are only nodes one level up —
 * an impact map has no legal way to hang a deliverable off a goal — and the
 * winner is the branch whose vertical band swallows the drop point, which is
 * how the map reads to the eye anyway.
 */
export function findDropTarget(
  map: ImpactMap,
  layout: Layout,
  dragged: MapNode,
  point: { x: number; y: number },
): DropTarget | null {
  const parentKind = KIND_ORDER[KIND_ORDER.indexOf(dragged.kind) - 1]
  if (!parentKind) return null

  const candidates = visibleIds(map).filter((id) => map.nodes[id].kind === parentKind)
  if (!candidates.length) return null

  let chosen: string | null = null
  let bestDistance = Infinity
  for (const id of candidates) {
    const [top, bottom] = band(map, layout, id)
    if (point.y >= top && point.y <= bottom) {
      chosen = id
      break
    }
    const distance = point.y < top ? top - point.y : point.y - bottom
    if (distance < bestDistance) {
      bestDistance = distance
      chosen = id
    }
  }
  if (!chosen) return null

  const siblings = map.nodes[chosen].children.filter((id) => id !== dragged.id)
  let index = siblings.length
  for (let i = 0; i < siblings.length; i += 1) {
    const p = layout.placements[siblings[i]]
    if (p && point.y < p.y + p.height / 2) {
      index = i
      break
    }
  }
  return { parentId: chosen, index }
}
