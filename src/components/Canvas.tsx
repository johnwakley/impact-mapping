import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow,
  type Edge,
  type NodeChange,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import type { MapNode } from '../types.ts'
import { layoutMap } from '../model/layout.ts'
import { findDropTarget } from '../model/drop.ts'
import { KIND_META, KIND_ORDER } from '../model/schema.ts'
import { countByKind, visibleIds } from '../model/tree.ts'
import { useStore, useActiveMap } from '../store.ts'
import { useKeyboard } from '../hooks/useKeyboard.ts'
import { NodeCard, type CardNode } from './NodeCard.tsx'
import { ColumnHeader, type HeaderNode } from './ColumnHeader.tsx'

type AppNode = CardNode | HeaderNode

const nodeTypes = { card: NodeCard, columnHeader: ColumnHeader }

function accentOf(node: MapNode): string {
  if (node.kind === 'impact' && node.direction === 'obstruct') return 'var(--obstruct)'
  return `var(--${node.kind})`
}

export function Canvas(): ReactElement {
  const map = useActiveMap()
  const selectedId = useStore((s) => s.selectedId)
  const statusFilter = useStore((s) => s.statusFilter)
  const select = useStore((s) => s.select)
  const reparent = useStore((s) => s.reparent)
  const { fitView } = useReactFlow()

  /** Live position of the card being dragged; layout owns every other position. */
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)

  const layout = useMemo(() => layoutMap(map), [map])
  const visible = useMemo(() => visibleIds(map), [map])
  const counts = useMemo(() => countByKind(map), [map])

  useKeyboard(layout.placements, true)

  useEffect(() => {
    const frame = requestAnimationFrame(() => fitView({ padding: 0.2, maxZoom: 1 }))
    return () => cancelAnimationFrame(frame)
  }, [map.id, fitView])

  const isDim = useCallback(
    (node: MapNode): boolean =>
      Boolean(
        statusFilter &&
          node.kind === 'deliverable' &&
          !statusFilter.includes(node.status),
      ),
    [statusFilter],
  )

  const nodes = useMemo<AppNode[]>(() => {
    const headers: AppNode[] = layout.columns.map((col) => ({
      id: `header:${col.kind}`,
      type: 'columnHeader',
      position: { x: col.x, y: layout.minY - 116 },
      data: { kind: col.kind },
      width: col.width,
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: 0,
    }))

    const cards: AppNode[] = visible.map((id) => {
      const node = map.nodes[id]
      const place = layout.placements[id]
      const dragging = drag?.id === id
      return {
        id,
        type: 'card',
        position: dragging ? { x: drag.x, y: drag.y } : { x: place.x, y: place.y },
        width: place.width,
        height: place.height,
        data: { node, dim: isDim(node) },
        selected: id === selectedId,
        draggable: Boolean(node.parent),
        zIndex: dragging ? 20 : 1,
      }
    })

    return [...headers, ...cards]
  }, [map, layout, visible, selectedId, drag, isDim])

  const edges = useMemo<Edge[]>(() => {
    const shown = new Set(visible)
    const out: Edge[] = []
    for (const id of visible) {
      const node = map.nodes[id]
      if (!node.parent || !shown.has(node.parent)) continue
      out.push({
        id: `${node.parent}->${id}`,
        source: node.parent,
        target: id,
        className: isDim(node) ? 'is-dim' : undefined,
        style: { stroke: accentOf(node), strokeOpacity: 0.55 },
      })
    }
    return out
  }, [map, visible, isDim])

  const onNodesChange = useCallback((changes: NodeChange<AppNode>[]) => {
    // Positions are derived from layout, so the only change worth applying is the
    // live drag offset — everything else re-derives from the map on the next render.
    for (const change of changes) {
      if (change.type === 'position' && change.dragging && change.position) {
        setDrag({ id: change.id, x: change.position.x, y: change.position.y })
      }
    }
  }, [])

  const onNodeDragStop = useCallback(
    (_event: unknown, dropped: AppNode) => {
      setDrag(null)
      if (dropped.type !== 'card') return
      const node = map.nodes[dropped.id]
      const place = layout.placements[dropped.id]
      if (!node || !place) return

      const point = {
        x: dropped.position.x + place.width / 2,
        y: dropped.position.y + place.height / 2,
      }
      const target = findDropTarget(map, layout, node, point)
      if (!target) return

      // A drop that lands exactly where the node already sits is not an edit.
      const siblings = map.nodes[target.parentId].children
      if (target.parentId === node.parent && siblings.indexOf(node.id) === target.index) {
        return
      }
      reparent(dropped.id, target.parentId, target.index)
    },
    [map, layout, reparent],
  )

  return (
    <div className="canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_e, node) => node.type === 'card' && select(node.id)}
        onNodeDragStart={(_e, node) => select(node.id)}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={() => select(null)}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        deleteKeyCode={null}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
        minZoom={0.12}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        colorMode="system"
        attributionPosition="bottom-center"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeStrokeWidth={0}
          nodeColor={(node) =>
            node.type === 'card'
              ? accentOf((node.data as CardNode['data']).node)
              : 'transparent'
          }
        />
        <Controls position="top-left" showInteractive={false} />
        <Panel position="bottom-left" className="panel stats">
          {KIND_ORDER.map((kind) => (
            <span key={kind} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span
                className="legend__swatch"
                style={{ background: `var(--${kind})` }}
                aria-hidden="true"
              />
              {KIND_META[kind].plural} <b>{counts[kind]}</b>
            </span>
          ))}
        </Panel>
      </ReactFlow>
    </div>
  )
}
