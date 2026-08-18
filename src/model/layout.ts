import type { ImpactMap, MapNode, NodeKind } from '../types.ts'
import { KIND_ORDER, NODE_WIDTH } from './schema.ts'

/**
 * Tidy-tree layout, computed synchronously so the canvas never renders a frame
 * with stale positions.
 *
 * React Flow deliberately ships no layout engine. For a general graph you would
 * reach for elk/dagre, but an impact map is a strict four-level tree, and a tree
 * wants the classic two-rule algorithm: leaves stack in reading order, parents
 * centre on the span of their children. ~60 lines, deterministic, and it keeps
 * every level pinned to its own column — which matters here, because the columns
 * *are* the method (Why / Who / How / What).
 */

const COL_GAP = 96
const V_GAP = 14
/** Breathing room after a whole subtree, so branches read as groups. */
const EXTRA_AFTER: Record<NodeKind, number> = {
  goal: 0,
  actor: 32,
  impact: 12,
  deliverable: 0,
}

const PAD_X = 15
const ACCENT_W = 5
/** The card's right border. The left one is dropped in favour of the accent bar. */
const BORDER_W = 1
/**
 * Our greedy wrap and the browser's line breaker agree to within about a pixel,
 * and a borderline line we get wrong costs real text: the card is sized for
 * the lines we predicted, and anything extra is clipped. So bias the
 * measurement narrow. Predicting one line too many costs a little whitespace;
 * predicting one too few loses a sentence.
 */
const WRAP_SAFETY = 2
const PAD_Y = 13
const META_H = 15
const META_GAP = 7
const TITLE_LINE_H = 20
const BADGE_GAP = 9
const BADGE_H = 22
const METRIC_GAP = 9
const METRIC_H = 40
const NOTE_GAP = 7
const NOTE_LINE_H = 17

export const MAX_TITLE_LINES = 5
export const MAX_NOTE_LINES = 3

export const TITLE_FONT =
  '600 15px ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const NOTE_FONT =
  '400 12.5px ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export const TITLE_LINE_HEIGHT = TITLE_LINE_H

/** Usable text width inside a card of `kind` — layout and the editor must agree. */
export function textWidthFor(kind: NodeKind): number {
  return NODE_WIDTH[kind] - ACCENT_W - PAD_X * 2 - BORDER_W - WRAP_SAFETY
}

let ctx: CanvasRenderingContext2D | null = null
function measureCtx(): CanvasRenderingContext2D | null {
  if (ctx) return ctx
  if (typeof document === 'undefined') return null
  ctx = document.createElement('canvas').getContext('2d')
  return ctx
}

const lineCache = new Map<string, number>()

/** Greedy word wrap, counting the lines a string needs at `font` in `maxWidth`. */
export function countLines(text: string, maxWidth: number, font: string, max: number): number {
  const trimmed = text.trim()
  if (!trimmed) return 1
  const key = `${font}|${maxWidth}|${trimmed}`
  const hit = lineCache.get(key)
  if (hit !== undefined) return hit

  const c = measureCtx()
  let lines: number
  if (!c) {
    // SSR / no canvas: fall back to an average-character-width estimate.
    const perLine = Math.max(1, Math.floor(maxWidth / 7.6))
    lines = Math.ceil(trimmed.length / perLine)
  } else {
    c.font = font
    lines = 1
    let width = 0
    const spaceW = c.measureText(' ').width
    for (const word of trimmed.split(/\s+/)) {
      const w = c.measureText(word).width
      if (width === 0) {
        width = w
      } else if (width + spaceW + w <= maxWidth) {
        width += spaceW + w
      } else {
        lines += 1
        width = w
      }
      // A single word longer than the line wraps on its own.
      while (width > maxWidth) {
        lines += 1
        width -= maxWidth
      }
    }
  }

  const clamped = Math.min(lines, max)
  lineCache.set(key, clamped)
  return clamped
}

function hasBadges(node: MapNode): boolean {
  switch (node.kind) {
    case 'goal':
      return Boolean(node.deadline)
    case 'actor':
      return true
    case 'impact':
      return node.direction === 'obstruct'
    case 'deliverable':
      return true
  }
}

function hasMetric(node: MapNode): boolean {
  return node.kind === 'goal' && (Boolean(node.metric) || node.target !== undefined)
}

export function nodeWidth(node: MapNode): number {
  return NODE_WIDTH[node.kind]
}

export function nodeHeight(node: MapNode): number {
  // Must be `textWidthFor` and not a second copy of the arithmetic: the height
  // budget and the wrap that fills it have to be measured against the same width.
  const textWidth = textWidthFor(node.kind)
  const titleLines = countLines(
    node.title || ' ',
    textWidth,
    TITLE_FONT,
    MAX_TITLE_LINES,
  )
  let h = PAD_Y * 2 + META_H + META_GAP + titleLines * TITLE_LINE_H
  if (hasMetric(node)) h += METRIC_GAP + METRIC_H
  if (node.notes?.trim()) {
    h +=
      NOTE_GAP +
      countLines(node.notes, textWidth, NOTE_FONT, MAX_NOTE_LINES) * NOTE_LINE_H
  }
  if (hasBadges(node)) h += BADGE_GAP + BADGE_H
  return Math.round(h)
}

export interface Placement {
  x: number
  y: number
  width: number
  height: number
}

export interface Column {
  kind: NodeKind
  x: number
  width: number
}

export interface Layout {
  placements: Record<string, Placement>
  columns: Column[]
  minY: number
  maxY: number
}

/** x offset of each column, from the cumulative widths of the columns before it. */
function columnPositions(): Column[] {
  const cols: Column[] = []
  let x = 0
  for (const kind of KIND_ORDER) {
    cols.push({ kind, x, width: NODE_WIDTH[kind] })
    x += NODE_WIDTH[kind] + COL_GAP
  }
  return cols
}

export function layoutMap(map: ImpactMap): Layout {
  const columns = columnPositions()
  const placements: Record<string, Placement> = {}
  let cursor = 0

  const shift = (id: string, dy: number): void => {
    const p = placements[id]
    if (p) p.y += dy
    for (const cid of map.nodes[id]?.children ?? []) shift(cid, dy)
  }

  const place = (id: string): void => {
    const node = map.nodes[id]
    if (!node) return
    const width = nodeWidth(node)
    const height = nodeHeight(node)
    const x = columns[KIND_ORDER.indexOf(node.kind)]?.x ?? 0
    const kids = node.collapsed ? [] : node.children.filter((cid) => map.nodes[cid])

    let y: number
    if (kids.length === 0) {
      y = cursor
    } else {
      const top = cursor
      for (const cid of kids) place(cid)
      const first = placements[kids[0]]
      const last = placements[kids[kids.length - 1]]
      const centre = (first.y + first.height / 2 + (last.y + last.height / 2)) / 2
      y = centre - height / 2
      if (y < top) {
        // The parent card is taller than its children's span; push the subtree
        // down rather than let the parent overlap the branch above it.
        const dy = top - y
        for (const cid of kids) shift(cid, dy)
        y = top
      }
    }

    placements[id] = { x, y, width, height }
    cursor = Math.max(cursor, y + height) + V_GAP + EXTRA_AFTER[node.kind]
  }

  place(map.rootId)

  let minY = Infinity
  let maxY = -Infinity
  for (const p of Object.values(placements)) {
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y + p.height)
  }
  if (!Number.isFinite(minY)) {
    minY = 0
    maxY = 0
  }

  return { placements, columns, minY, maxY }
}
