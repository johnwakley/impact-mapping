import type { CSSProperties, ReactElement } from 'react'
import type {
  ActorKind,
  DeliverableStatus,
  ImpactDirection,
  MapNode,
} from '../types.ts'
import {
  ACTOR_KIND_LABEL,
  CONFIDENCE_LABEL,
  CONFIDENCE_ORDER,
  EFFORT_ORDER,
  KIND_META,
  KIND_ORDER,
  STATUS_LABEL,
  STATUS_ORDER,
} from '../model/schema.ts'
import { ancestors, assumptionFor, countByKind, descendants } from '../model/tree.ts'
import { missingLevels } from '../model/io.ts'
import { useActiveMap, useSelectedNode, useStore } from '../store.ts'
import { ArrowDown, ArrowUp, Plus, Trash } from './icons.tsx'

function num(value: string): number | undefined {
  const parsed = Number(value)
  return value.trim() === '' || Number.isNaN(parsed) ? undefined : parsed
}

/* ------------------------------------------------------------- overview -- */

function Overview(): ReactElement {
  const map = useActiveMap()
  const select = useStore((s) => s.select)
  const counts = countByKind(map)
  const missing = missingLevels(map)

  const statuses = STATUS_ORDER.map((status) => ({
    status,
    count: Object.values(map.nodes).filter(
      (n) => n.kind === 'deliverable' && n.status === status,
    ).length,
  })).filter((row) => row.count > 0)

  return (
    <div className="inspector__scroll">
      <div className="field__label">Map</div>
      <div style={{ fontSize: 16, fontWeight: 650, marginBottom: 16 }}>{map.name}</div>

      {KIND_ORDER.map((kind) => (
        <div key={kind} className="legend__row">
          <span
            className="legend__swatch"
            style={{ background: `var(--${kind})` }}
            aria-hidden="true"
          />
          <span className="legend__name">{KIND_META[kind].plural}</span>
          <span className="legend__count">{counts[kind]}</span>
        </div>
      ))}

      {statuses.length > 0 && (
        <>
          <div className="section">Deliverables by status</div>
          {statuses.map(({ status, count }) => (
            <div key={status} className="legend__row">
              <span className="legend__name" style={{ flexBasis: 90 }}>
                {STATUS_LABEL[status]}
              </span>
              <span className="legend__count">{count}</span>
            </div>
          ))}
        </>
      )}

      {missing.length > 0 && (
        <>
          <div className="section">Incomplete</div>
          <div className="note">
            This map has no {missing.join(' and ')} yet. A branch only earns its
            keep once it reaches a deliverable — until then it is a question, not a plan.
          </div>
        </>
      )}

      <div className="section">Reading the map</div>
      <div className="note">
        Every path from the goal to a deliverable is one sentence:{' '}
        <strong>in order to</strong> hit the goal, <strong>this actor</strong> will
        behave differently, <strong>if we</strong> ship this. Select a deliverable to
        read its sentence back.
      </div>

      <button
        type="button"
        className="btn btn--outline"
        style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
        onClick={() => select(map.rootId)}
      >
        Select the goal
      </button>
    </div>
  )
}

/* ----------------------------------------------------------- per-kind --- */

function GoalFields({ node }: { node: Extract<MapNode, { kind: 'goal' }> }): ReactElement {
  const update = useStore((s) => s.updateNode)
  return (
    <>
      <div className="section">Measure</div>
      <label className="field">
        <span className="field__label">Metric</span>
        <input
          className="input"
          value={node.metric ?? ''}
          placeholder="Weekly active teams"
          onChange={(e) => update(node.id, { metric: e.target.value }, `metric:${node.id}`)}
        />
      </label>
      <div className="grid-2">
        <label className="field">
          <span className="field__label">Baseline</span>
          <input
            className="input"
            inputMode="decimal"
            value={node.baseline ?? ''}
            onChange={(e) =>
              update(node.id, { baseline: num(e.target.value) }, `baseline:${node.id}`)
            }
          />
        </label>
        <label className="field">
          <span className="field__label">Target</span>
          <input
            className="input"
            inputMode="decimal"
            value={node.target ?? ''}
            onChange={(e) =>
              update(node.id, { target: num(e.target.value) }, `target:${node.id}`)
            }
          />
        </label>
        <label className="field">
          <span className="field__label">Current</span>
          <input
            className="input"
            inputMode="decimal"
            value={node.current ?? ''}
            onChange={(e) =>
              update(node.id, { current: num(e.target.value) }, `current:${node.id}`)
            }
          />
        </label>
        <label className="field">
          <span className="field__label">Unit</span>
          <input
            className="input"
            value={node.unit ?? ''}
            placeholder="teams"
            onChange={(e) => update(node.id, { unit: e.target.value }, `unit:${node.id}`)}
          />
        </label>
      </div>
      <label className="field">
        <span className="field__label">Deadline</span>
        <input
          className="input"
          type="date"
          value={node.deadline ?? ''}
          onChange={(e) => update(node.id, { deadline: e.target.value || undefined })}
        />
        <p className="field__hint">
          A goal without a date and a number is a wish. Both belong here.
        </p>
      </label>
    </>
  )
}

function ActorFields({
  node,
}: {
  node: Extract<MapNode, { kind: 'actor' }>
}): ReactElement {
  const update = useStore((s) => s.updateNode)
  return (
    <label className="field">
      <span className="field__label">Kind of actor</span>
      <select
        className="select"
        value={node.actorKind}
        onChange={(e) => update(node.id, { actorKind: e.target.value as ActorKind })}
      >
        {(Object.keys(ACTOR_KIND_LABEL) as ActorKind[]).map((kind) => (
          <option key={kind} value={kind}>
            {ACTOR_KIND_LABEL[kind]}
          </option>
        ))}
      </select>
    </label>
  )
}

function ImpactFields({
  node,
}: {
  node: Extract<MapNode, { kind: 'impact' }>
}): ReactElement {
  const update = useStore((s) => s.updateNode)
  return (
    <div className="field">
      <span className="field__label">Direction</span>
      <div className="segmented">
        {(['support', 'obstruct'] as ImpactDirection[]).map((direction) => (
          <button
            key={direction}
            type="button"
            aria-pressed={node.direction === direction}
            onClick={() => update(node.id, { direction })}
          >
            {direction === 'support' ? '↑ Supports' : '⚠ Obstructs'}
          </button>
        ))}
      </div>
      <p className="field__hint">
        Obstructions belong on the map. A branch you must remove is as much a plan as
        one you must build.
      </p>
    </div>
  )
}

function DeliverableFields({
  node,
}: {
  node: Extract<MapNode, { kind: 'deliverable' }>
}): ReactElement {
  const update = useStore((s) => s.updateNode)
  const map = useActiveMap()
  const assumption = assumptionFor(map, node.id)

  return (
    <>
      <label className="field">
        <span className="field__label">Status</span>
        <select
          className="select"
          value={node.status}
          onChange={(e) =>
            update(node.id, { status: e.target.value as DeliverableStatus })
          }
        >
          {STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </label>

      <div className="field">
        <span className="field__label">Effort</span>
        <div className="segmented">
          {EFFORT_ORDER.map((effort) => (
            <button
              key={effort}
              type="button"
              aria-pressed={node.effort === effort}
              onClick={() =>
                update(node.id, { effort: node.effort === effort ? undefined : effort })
              }
            >
              {effort}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field__label">Confidence in the bet</span>
        <div className="segmented">
          {CONFIDENCE_ORDER.map((confidence) => (
            <button
              key={confidence}
              type="button"
              aria-pressed={node.confidence === confidence}
              onClick={() =>
                update(node.id, {
                  confidence: node.confidence === confidence ? undefined : confidence,
                })
              }
            >
              {confidence}
            </button>
          ))}
        </div>
        {node.confidence && (
          <p className="field__hint">{CONFIDENCE_LABEL[node.confidence]}</p>
        )}
      </div>

      {assumption && (
        <>
          <div className="section">The bet</div>
          <div className="note note--accent assumption">
            {assumption.obstructing ? (
              <>
                <em>{assumption.actor}</em> currently <em>{assumption.impact}</em>, which
                works against <em>{assumption.goal}</em>. We are betting that{' '}
                <em>{assumption.deliverable}</em> removes it.
              </>
            ) : (
              <>
                In order to <em>{assumption.goal}</em>, <em>{assumption.actor}</em> will{' '}
                <em>{assumption.impact}</em>. We are betting that{' '}
                <em>{assumption.deliverable}</em> makes that happen.
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}

/* ------------------------------------------------------------ inspector -- */

export function Inspector(): ReactElement {
  const map = useActiveMap()
  const node = useSelectedNode()
  const select = useStore((s) => s.select)
  const update = useStore((s) => s.updateNode)
  const addChild = useStore((s) => s.addChild)
  const deleteNode = useStore((s) => s.deleteNode)
  const move = useStore((s) => s.moveWithinSiblings)
  const reparent = useStore((s) => s.reparent)

  if (!node) {
    return (
      <aside className="inspector">
        <div className="inspector__head">
          <span
            className="inspector__kind"
            style={{ '--accent': 'var(--goal)' } as CSSProperties}
          >
            Overview
          </span>
        </div>
        <Overview />
      </aside>
    )
  }

  const meta = KIND_META[node.kind]
  const trail = ancestors(map, node.id)
  const parentKind = KIND_ORDER[KIND_ORDER.indexOf(node.kind) - 1]
  const parentOptions = parentKind
    ? Object.keys(map.nodes).filter((id) => map.nodes[id].kind === parentKind)
    : []
  const siblings = node.parent ? map.nodes[node.parent].children : []
  const index = siblings.indexOf(node.id)
  const subtree = descendants(map, node.id).length
  const accent =
    node.kind === 'impact' && node.direction === 'obstruct'
      ? 'var(--obstruct)'
      : `var(--${node.kind})`

  return (
    <aside className="inspector" style={{ '--accent': accent } as CSSProperties}>
      <div className="inspector__head">
        <span className="inspector__kind">{meta.label}</span>
        <span className="inspector__q">{meta.question}</span>
      </div>

      <div className="inspector__scroll">
        {trail.length > 0 && (
          <div className="breadcrumb">
            {trail.map((crumb) => (
              <span key={crumb.id}>
                <button type="button" onClick={() => select(crumb.id)}>
                  {crumb.title || KIND_META[crumb.kind].label}
                </button>
                <span aria-hidden="true"> › </span>
              </span>
            ))}
          </div>
        )}

        <label className="field">
          <span className="field__label">{meta.label}</span>
          <textarea
            className="textarea"
            value={node.title}
            placeholder={meta.placeholder}
            rows={2}
            onChange={(e) => update(node.id, { title: e.target.value }, `title:${node.id}`)}
          />
          <p className="field__hint">{meta.watchOut}</p>
        </label>

        {node.kind === 'goal' && <GoalFields node={node} />}
        {node.kind === 'actor' && <ActorFields node={node} />}
        {node.kind === 'impact' && <ImpactFields node={node} />}
        {node.kind === 'deliverable' && <DeliverableFields node={node} />}

        <label className="field">
          <span className="field__label">Notes</span>
          <textarea
            className="textarea"
            value={node.notes ?? ''}
            placeholder="Evidence, open questions, links…"
            onChange={(e) =>
              update(node.id, { notes: e.target.value }, `notes:${node.id}`)
            }
          />
        </label>

        {node.parent && (
          <>
            <div className="section">Position</div>
            <label className="field">
              <span className="field__label">Sits under</span>
              <select
                className="select"
                value={node.parent}
                onChange={(e) => reparent(node.id, e.target.value)}
              >
                {parentOptions.map((id) => (
                  <option key={id} value={id}>
                    {map.nodes[id].title || `(untitled ${map.nodes[id].kind})`}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                disabled={index <= 0}
                onClick={() => move(node.id, -1)}
              >
                <ArrowUp size={13} /> Move up
              </button>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                disabled={index < 0 || index >= siblings.length - 1}
                onClick={() => move(node.id, 1)}
              >
                <ArrowDown size={13} /> Move down
              </button>
            </div>
          </>
        )}
      </div>

      <div className="inspector__foot">
        {meta.childKind && (
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => addChild(node.id)}
          >
            <Plus size={14} /> Add {meta.childKind}
          </button>
        )}
        <span style={{ flex: 1 }} />
        {node.parent && (
          <button
            type="button"
            className="btn btn--danger"
            title={
              subtree > 0
                ? `Deletes this node and ${subtree} below it`
                : 'Delete this node'
            }
            onClick={() => {
              if (subtree > 0) {
                const ok = window.confirm(
                  `Delete “${node.title || 'this node'}” and the ${subtree} node${
                    subtree === 1 ? '' : 's'
                  } beneath it?`,
                )
                if (!ok) return
              }
              deleteNode(node.id)
            }}
          >
            <Trash size={14} /> Delete
          </button>
        )}
      </div>
    </aside>
  )
}
