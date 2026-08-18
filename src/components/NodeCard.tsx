import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { memo, useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import type { GoalNode, MapNode } from '../types.ts'
import {
  ACTOR_KIND_ICON,
  ACTOR_KIND_LABEL,
  CONFIDENCE_ORDER,
  KIND_META,
  STATUS_LABEL,
} from '../model/schema.ts'
import { goalProgress } from '../model/metric.ts'
import {
  MAX_TITLE_LINES,
  TITLE_FONT,
  TITLE_LINE_HEIGHT,
  countLines,
  textWidthFor,
} from '../model/layout.ts'
import { useStore } from '../store.ts'
import { ChevronDown, ChevronRight, Plus } from './icons.tsx'

export interface CardData extends Record<string, unknown> {
  node: MapNode
  dim: boolean
}

export type CardNode = Node<CardData, 'card'>

const STATUS_TONE: Record<string, string> = {
  idea: 'chip--muted',
  planned: 'chip--info',
  building: 'chip--warn',
  shipped: 'chip--ok',
  dropped: 'chip--muted chip--dropped',
}

function Metric({ goal }: { goal: GoalNode }): ReactElement | null {
  if (!goal.metric && goal.target === undefined) return null
  const { at, fraction, measurable } = goalProgress(goal)
  const unit = goal.unit ? ` ${goal.unit}` : ''
  return (
    <div className="metric">
      <div className="metric__row">
        <span className="metric__name">{goal.metric || 'Target'}</span>
        <span className="metric__value">
          {at.toLocaleString()} / {goal.target?.toLocaleString() ?? '?'}
          {unit}
        </span>
      </div>
      <div className="metric__track">
        <div className="metric__fill" style={{ width: `${fraction * 100}%` }} />
      </div>
      <div className="metric__pct">
        {measurable
          ? `${Math.round(fraction * 100)}% of the way from ${(
              goal.baseline ?? 0
            ).toLocaleString()}`
          : 'Set a baseline and a target'}
      </div>
    </div>
  )
}

function Badges({ node }: { node: MapNode }): ReactElement | null {
  switch (node.kind) {
    case 'goal':
      return node.deadline ? (
        <div className="node__badges">
          <span className="chip chip--accent">by {node.deadline}</span>
        </div>
      ) : null

    case 'actor':
      return (
        <div className="node__badges">
          <span className="chip chip--accent">
            <span aria-hidden="true">{ACTOR_KIND_ICON[node.actorKind]}</span>
            {ACTOR_KIND_LABEL[node.actorKind]}
          </span>
        </div>
      )

    case 'impact':
      return node.direction === 'obstruct' ? (
        <div className="node__badges">
          <span className="chip chip--danger">⚠ Obstructs the goal</span>
        </div>
      ) : null

    case 'deliverable': {
      const level = node.confidence ? CONFIDENCE_ORDER.indexOf(node.confidence) + 1 : 0
      return (
        <div className="node__badges">
          <span className={`chip ${STATUS_TONE[node.status]}`}>
            {STATUS_LABEL[node.status]}
          </span>
          {node.effort && <span className="chip chip--effort">{node.effort}</span>}
          {level > 0 && (
            <span
              className="chip chip--muted"
              title={`${node.confidence} confidence in this bet`}
            >
              <span className="dots">
                {[1, 2, 3].map((n) => (
                  <i key={n} className={n <= level ? 'on' : undefined} />
                ))}
              </span>
            </span>
          )}
        </div>
      )
    }
  }
}

function TitleEditor({ node }: { node: MapNode }): ReactElement {
  const ref = useRef<HTMLTextAreaElement>(null)
  const updateNode = useStore((s) => s.updateNode)
  const endEditing = useStore((s) => s.endEditing)
  const addSibling = useStore((s) => s.addSibling)
  const addChild = useStore((s) => s.addChild)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.select()
  }, [])

  const lines = countLines(
    node.title || ' ',
    textWidthFor(node.kind),
    TITLE_FONT,
    MAX_TITLE_LINES,
  )

  return (
    <textarea
      ref={ref}
      className="node__title-input"
      value={node.title}
      placeholder={KIND_META[node.kind].placeholder}
      spellCheck
      style={{ height: lines * TITLE_LINE_HEIGHT + 6 }}
      onChange={(e) =>
        // Coalesced so a burst of typing is one undo step, not one per keystroke.
        updateNode(node.id, { title: e.target.value }, `title:${node.id}`)
      }
      onBlur={endEditing}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') {
          e.preventDefault()
          endEditing()
        } else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          if (!addSibling(node.id)) endEditing()
        } else if (e.key === 'Tab') {
          e.preventDefault()
          if (!addChild(node.id)) endEditing()
        }
      }}
    />
  )
}

function NodeCardImpl({ data, selected }: NodeProps<CardNode>): ReactElement {
  const { node, dim } = data
  const editing = useStore((s) => s.editingId === node.id)
  const toggleCollapse = useStore((s) => s.toggleCollapse)
  const addChild = useStore((s) => s.addChild)
  const beginEditing = useStore((s) => s.beginEditing)

  const meta = KIND_META[node.kind]
  const hidden = node.collapsed ? node.children.length : 0
  const classes = [
    'node',
    `node--${node.kind}`,
    selected && 'is-selected',
    dim && 'is-dim',
    !node.title.trim() && 'is-empty',
    node.kind === 'impact' && node.direction === 'obstruct' && 'is-obstruct',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} onDoubleClick={() => beginEditing(node.id)}>
      <Handle type="target" position={Position.Left} isConnectable={false} />

      <div className="node__body">
        <div className="node__meta">
          <span>{meta.label}</span>
          <span className="node__meta-spacer" />
          {hidden > 0 && (
            <span className="node__count">
              {hidden} {hidden === 1 ? meta.childKind : `${meta.childKind}s`} hidden
            </span>
          )}
          {node.children.length > 0 && (
            <button
              type="button"
              className="node__toggle"
              title={node.collapsed ? 'Expand branch' : 'Collapse branch'}
              aria-label={node.collapsed ? 'Expand branch' : 'Collapse branch'}
              onClick={(e) => {
                e.stopPropagation()
                toggleCollapse(node.id)
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {node.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>

        {editing ? (
          <TitleEditor node={node} />
        ) : (
          <div className="node__title">{node.title || meta.placeholder}</div>
        )}

        {node.kind === 'goal' && <Metric goal={node} />}
        {node.notes?.trim() && <div className="node__notes">{node.notes}</div>}
        <Badges node={node} />
      </div>

      {meta.childKind && (
        <button
          type="button"
          className="node__add"
          title={`Add ${meta.childKind}  (Tab)`}
          aria-label={`Add ${meta.childKind}`}
          onClick={(e) => {
            e.stopPropagation()
            addChild(node.id)
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Plus size={13} />
        </button>
      )}

      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  )
}

export const NodeCard = memo(NodeCardImpl)
