import type { ImpactMap, ImpactMapFile, MapNode } from '../types.ts'
import {
  ACTOR_KIND_LABEL,
  CONFIDENCE_LABEL,
  KIND_META,
  STATUS_LABEL,
} from './schema.ts'
import { ancestors, walk } from './tree.ts'

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'impact-map'
  )
}

export function download(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ JSON -- */

export function toJson(map: ImpactMap): string {
  const file: ImpactMapFile = { format: 'impact-map', version: 1, map }
  return JSON.stringify(file, null, 2)
}

/**
 * Parse an exported file back into a map, repairing what can be repaired:
 * dangling child references are dropped and parent pointers are rebuilt from
 * the child lists, which are the authoritative structure.
 */
export function fromJson(text: string): ImpactMap {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  const file = parsed as Partial<ImpactMapFile>
  const map = file?.map as ImpactMap | undefined
  if (file?.format !== 'impact-map' || !map) {
    throw new Error('That file is not an impact map export.')
  }
  if (!map.rootId || !map.nodes || typeof map.nodes !== 'object') {
    throw new Error('The file is missing its map contents.')
  }
  const root = map.nodes[map.rootId]
  if (!root) throw new Error('The file names a root node that it does not contain.')
  if (root.kind !== 'goal') throw new Error('The root of an impact map must be a goal.')

  const nodes: Record<string, MapNode> = {}
  for (const [id, node] of Object.entries(map.nodes)) {
    nodes[id] = { ...node, id, children: [...(node.children ?? [])] }
  }
  // Keep only children that exist, and re-derive parents from the child lists.
  for (const node of Object.values(nodes)) {
    node.children = node.children.filter((cid) => nodes[cid] && cid !== node.id)
  }
  for (const node of Object.values(nodes)) node.parent = null
  for (const node of Object.values(nodes)) {
    for (const cid of node.children) nodes[cid].parent = node.id
  }
  nodes[map.rootId].parent = null

  // Drop anything no longer reachable from the root.
  const reachable = new Set<string>()
  const stack = [map.rootId]
  while (stack.length) {
    const id = stack.pop()!
    if (reachable.has(id)) continue
    reachable.add(id)
    stack.push(...nodes[id].children)
  }
  for (const id of Object.keys(nodes)) if (!reachable.has(id)) delete nodes[id]

  return {
    id: map.id || crypto.randomUUID(),
    name: map.name || 'Imported map',
    rootId: map.rootId,
    nodes,
    createdAt: map.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/* -------------------------------------------------------------- Markdown -- */

function goalMetricLine(map: ImpactMap): string | null {
  const root = map.nodes[map.rootId]
  if (root?.kind !== 'goal') return null
  const bits: string[] = []
  if (root.metric) bits.push(root.metric)
  if (root.baseline !== undefined || root.target !== undefined) {
    const unit = root.unit ? ` ${root.unit}` : ''
    bits.push(`${root.baseline ?? '?'} → ${root.target ?? '?'}${unit}`)
  }
  if (root.current !== undefined) bits.push(`currently ${root.current}`)
  if (root.deadline) bits.push(`by ${root.deadline}`)
  return bits.length ? bits.join(' · ') : null
}

export function toMarkdown(map: ImpactMap): string {
  const out: string[] = [`# ${map.name}`, '']
  const root = map.nodes[map.rootId]

  out.push(`**Goal** — ${root.title || '_(untitled)_'}`)
  const metric = goalMetricLine(map)
  if (metric) out.push('', `_${metric}_`)
  if (root.notes?.trim()) out.push('', `> ${root.notes.trim().replace(/\n/g, '\n> ')}`)
  out.push('')

  walk(map, (node) => {
    if (node.kind === 'actor') {
      out.push('', `## ${node.title || '_(untitled actor)_'}`)
      out.push(`_${ACTOR_KIND_LABEL[node.actorKind]}_`)
      if (node.notes?.trim()) out.push('', node.notes.trim())
    }
    if (node.kind === 'impact') {
      const arrow = node.direction === 'obstruct' ? '⚠ Obstructs' : '↑ Supports'
      out.push('', `### ${node.title || '_(untitled impact)_'}`)
      out.push(`_${arrow}_`)
      if (node.notes?.trim()) out.push('', node.notes.trim())
      out.push('')
    }
    if (node.kind === 'deliverable') {
      const bits = [STATUS_LABEL[node.status]]
      if (node.effort) bits.push(`effort ${node.effort}`)
      if (node.confidence) bits.push(`${node.confidence} confidence`)
      out.push(`- **${node.title || '(untitled)'}** — ${bits.join(' · ')}`)
      if (node.notes?.trim()) out.push(`  - ${node.notes.trim().replace(/\n/g, ' ')}`)
    }
  })

  out.push('', '---', '', '_Generated from an impact map (Why → Who → How → What)._')
  return out.join('\n')
}

/* ------------------------------------------------------------------- CSV -- */

function csvCell(value: string | number | undefined): string {
  const s = value === undefined ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * One row per deliverable, carrying its whole chain — the shape you want when
 * pushing the map into a backlog tool, because each row is a self-contained bet.
 */
export function toCsv(map: ImpactMap): string {
  const header = [
    'Goal',
    'Actor',
    'Actor type',
    'Impact',
    'Direction',
    'Deliverable',
    'Status',
    'Effort',
    'Confidence',
    'Notes',
  ]
  const rows: string[][] = [header]

  walk(map, (node) => {
    if (node.kind !== 'deliverable') return
    const chain = ancestors(map, node.id)
    const goal = chain.find((n) => n.kind === 'goal')
    const actor = chain.find((n) => n.kind === 'actor')
    const impact = chain.find((n) => n.kind === 'impact')
    rows.push([
      goal?.title ?? '',
      actor?.title ?? '',
      actor?.kind === 'actor' ? ACTOR_KIND_LABEL[actor.actorKind] : '',
      impact?.title ?? '',
      impact?.kind === 'impact' ? impact.direction : '',
      node.title,
      STATUS_LABEL[node.status],
      node.effort ?? '',
      node.confidence ? CONFIDENCE_LABEL[node.confidence].split(' — ')[0] : '',
      node.notes ?? '',
    ])
  })

  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}

/* ---------------------------------------------------------------- Import -- */

export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.readAsText(file)
  })
}

/** Levels a map is missing, used for the "what's incomplete" hint in the UI. */
export function missingLevels(map: ImpactMap): string[] {
  const seen = new Set<string>()
  walk(map, (node) => {
    if (node.title.trim()) seen.add(node.kind)
  })
  return (['goal', 'actor', 'impact', 'deliverable'] as const)
    .filter((kind) => !seen.has(kind))
    .map((kind) => KIND_META[kind].plural.toLowerCase())
}
