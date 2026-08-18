/**
 * Domain model for an impact map.
 *
 * An impact map is a strict four-level tree. Each level answers one question,
 * and every level has genuinely different semantics — which is why nodes are a
 * discriminated union rather than a bag of generic "mind map" nodes.
 *
 *   Goal        Why?    the measurable business objective (exactly one per map)
 *   Actor       Who?    who can produce or obstruct the effect
 *   Impact      How?    how that actor's behaviour should change
 *   Deliverable What?   what we could do to support (or block) that change
 */

export type NodeKind = 'goal' | 'actor' | 'impact' | 'deliverable'

export type ActorKind =
  | 'user'
  | 'customer'
  | 'internal'
  | 'partner'
  | 'competitor'
  | 'regulator'

/** Impacts either help the goal or work against it. Obstructions are first-class. */
export type ImpactDirection = 'support' | 'obstruct'

export type DeliverableStatus =
  | 'idea'
  | 'planned'
  | 'building'
  | 'shipped'
  | 'dropped'

export type Effort = 'S' | 'M' | 'L' | 'XL'

/** How sure are we that this deliverable actually produces the impact above it? */
export type Confidence = 'low' | 'medium' | 'high'

interface NodeBase {
  id: string
  title: string
  notes?: string
  /** Ordered child ids. Order is meaningful — it is the reading order of the map. */
  children: string[]
  parent: string | null
  collapsed?: boolean
}

export interface GoalNode extends NodeBase {
  kind: 'goal'
  parent: null
  /** What we are actually moving, e.g. "weekly active teams". */
  metric?: string
  unit?: string
  baseline?: number
  current?: number
  target?: number
  /** ISO date (yyyy-mm-dd). */
  deadline?: string
}

export interface ActorNode extends NodeBase {
  kind: 'actor'
  actorKind: ActorKind
}

export interface ImpactNode extends NodeBase {
  kind: 'impact'
  direction: ImpactDirection
}

export interface DeliverableNode extends NodeBase {
  kind: 'deliverable'
  status: DeliverableStatus
  effort?: Effort
  confidence?: Confidence
}

export type MapNode = GoalNode | ActorNode | ImpactNode | DeliverableNode

export interface ImpactMap {
  id: string
  name: string
  rootId: string
  nodes: Record<string, MapNode>
  createdAt: string
  updatedAt: string
}

/** The serialised file format written by "Export JSON". */
export interface ImpactMapFile {
  format: 'impact-map'
  version: 1
  map: ImpactMap
}
