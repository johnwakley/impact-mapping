import type { ImpactMap, MapNode, NodeKind } from '../types.ts'
import { KIND_ORDER } from './schema.ts'

export function nodeAt(map: ImpactMap, id: string): MapNode | undefined {
  return map.nodes[id]
}

export function childrenOf(map: ImpactMap, id: string): MapNode[] {
  const node = map.nodes[id]
  if (!node) return []
  return node.children.map((cid) => map.nodes[cid]).filter(Boolean) as MapNode[]
}

/** Depth is derivable from kind — the tree is strictly typed by level. */
export function depthOf(node: MapNode): number {
  return KIND_ORDER.indexOf(node.kind)
}

/** Root-first list of ancestors, not including `id` itself. */
export function ancestors(map: ImpactMap, id: string): MapNode[] {
  const out: MapNode[] = []
  let cur = map.nodes[id]?.parent
  while (cur) {
    const node = map.nodes[cur]
    if (!node) break
    out.unshift(node)
    cur = node.parent
  }
  return out
}

/** Every descendant id of `id`, pre-order, not including `id` itself. */
export function descendants(map: ImpactMap, id: string): string[] {
  const out: string[] = []
  const stack = [...(map.nodes[id]?.children ?? [])]
  while (stack.length) {
    const cur = stack.shift()!
    if (!map.nodes[cur]) continue
    out.push(cur)
    stack.unshift(...map.nodes[cur].children)
  }
  return out
}

export function isDescendant(map: ImpactMap, ancestorId: string, id: string): boolean {
  let cur = map.nodes[id]?.parent
  while (cur) {
    if (cur === ancestorId) return true
    cur = map.nodes[cur]?.parent ?? null
  }
  return false
}

/** Pre-order walk of the whole tree. */
export function walk(
  map: ImpactMap,
  visit: (node: MapNode, depth: number) => void,
  from = map.rootId,
  depth = 0,
): void {
  const node = map.nodes[from]
  if (!node) return
  visit(node, depth)
  for (const cid of node.children) walk(map, visit, cid, depth + 1)
}

/** Ids that should be rendered, honouring collapsed branches. Pre-order. */
export function visibleIds(map: ImpactMap): string[] {
  const out: string[] = []
  const push = (id: string) => {
    const node = map.nodes[id]
    if (!node) return
    out.push(id)
    if (node.collapsed) return
    for (const cid of node.children) push(cid)
  }
  push(map.rootId)
  return out
}

export function siblingsOf(map: ImpactMap, id: string): string[] {
  const parentId = map.nodes[id]?.parent
  if (!parentId) return [map.rootId]
  return map.nodes[parentId]?.children ?? []
}

export function countByKind(map: ImpactMap): Record<NodeKind, number> {
  const counts: Record<NodeKind, number> = {
    goal: 0,
    actor: 0,
    impact: 0,
    deliverable: 0,
  }
  walk(map, (node) => {
    counts[node.kind] += 1
  })
  return counts
}

export interface Assumption {
  goal: string
  actor: string
  impact: string
  deliverable: string
  obstructing: boolean
}

/**
 * Every deliverable is a bet: "if we build this, that actor changes behaviour,
 * which moves the goal". Reading the chain back as a sentence is the fastest way
 * to notice that a branch does not actually hold together.
 */
export function assumptionFor(map: ImpactMap, id: string): Assumption | null {
  const node = map.nodes[id]
  if (!node || node.kind !== 'deliverable') return null
  const chain = ancestors(map, id)
  const goal = chain.find((n) => n.kind === 'goal')
  const actor = chain.find((n) => n.kind === 'actor')
  const impact = chain.find((n) => n.kind === 'impact')
  if (!goal || !actor || !impact || impact.kind !== 'impact') return null
  return {
    goal: goal.title || 'the goal',
    actor: actor.title || 'this actor',
    impact: impact.title || 'this behaviour',
    deliverable: node.title || 'this deliverable',
    obstructing: impact.direction === 'obstruct',
  }
}

/** Which node should take selection once `id` is deleted. */
export function selectionAfterDelete(map: ImpactMap, id: string): string {
  const parentId = map.nodes[id]?.parent
  if (!parentId) return map.rootId
  const sibs = map.nodes[parentId]?.children ?? []
  const idx = sibs.indexOf(id)
  const next = sibs[idx + 1] ?? sibs[idx - 1]
  return next ?? parentId
}
