import type {
  ActorKind,
  Confidence,
  DeliverableStatus,
  Effort,
  ImpactDirection,
  MapNode,
  NodeKind,
} from '../types.ts'

/** Reading order of the four levels, left to right. */
export const KIND_ORDER: readonly NodeKind[] = [
  'goal',
  'actor',
  'impact',
  'deliverable',
]

interface KindMeta {
  label: string
  plural: string
  /** The question this level answers — the column header on the canvas. */
  question: string
  /** Longer prompt, shown in the inspector and the legend. */
  prompt: string
  /** What a new child of this node must be. `null` means this level is a leaf. */
  childKind: NodeKind | null
  placeholder: string
  /** Nudge shown in the inspector to keep people off the usual mistakes. */
  watchOut: string
}

export const KIND_META: Record<NodeKind, KindMeta> = {
  goal: {
    label: 'Goal',
    plural: 'Goals',
    question: 'Why?',
    prompt: 'The measurable business objective we are chasing.',
    childKind: 'actor',
    placeholder: 'Increase weekly active teams from 400 to 1,000 by Q4',
    watchOut:
      'A goal is a measurable outcome, never a solution. "Build a mobile app" is a deliverable wearing a goal costume.',
  },
  actor: {
    label: 'Actor',
    plural: 'Actors',
    question: 'Who?',
    prompt: 'Who can produce the effect — or get in the way of it?',
    childKind: 'impact',
    placeholder: 'Team admins',
    watchOut:
      'Name real people or roles, specifically enough that you could go and talk to one. "Users" is rarely specific enough.',
  },
  impact: {
    label: 'Impact',
    plural: 'Impacts',
    question: 'How?',
    prompt: "How should this actor's behaviour change?",
    childKind: 'deliverable',
    placeholder: 'Invite the rest of their team in the first session',
    watchOut:
      'An impact is a change in someone’s behaviour, not a change in the software. If it starts with "add" or "build", it belongs one column to the right.',
  },
  deliverable: {
    label: 'Deliverable',
    plural: 'Deliverables',
    question: 'What?',
    prompt: 'What could we do to support that change?',
    childKind: null,
    placeholder: 'Bulk invite by email domain',
    watchOut:
      'Deliverables are the most disposable part of the map. Each one is a bet on the impact above it — ship the smallest thing that settles the bet.',
  },
}

export const ACTOR_KIND_LABEL: Record<ActorKind, string> = {
  user: 'User',
  customer: 'Customer / buyer',
  internal: 'Internal team',
  partner: 'Partner',
  competitor: 'Competitor',
  regulator: 'Regulator',
}

export const ACTOR_KIND_ICON: Record<ActorKind, string> = {
  user: '\u{1F464}',
  customer: '\u{1F4B3}',
  internal: '\u{1F3E2}',
  partner: '\u{1F91D}',
  competitor: '\u{2694}\u{FE0F}',
  regulator: '\u{2696}\u{FE0F}',
}

export const IMPACT_DIRECTION_LABEL: Record<ImpactDirection, string> = {
  support: 'Supports the goal',
  obstruct: 'Obstructs the goal',
}

export const STATUS_LABEL: Record<DeliverableStatus, string> = {
  idea: 'Idea',
  planned: 'Planned',
  building: 'Building',
  shipped: 'Shipped',
  dropped: 'Dropped',
}

export const STATUS_ORDER: readonly DeliverableStatus[] = [
  'idea',
  'planned',
  'building',
  'shipped',
  'dropped',
]

export const EFFORT_ORDER: readonly Effort[] = ['S', 'M', 'L', 'XL']

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  low: 'Low — a guess worth testing cheaply',
  medium: 'Medium — some evidence',
  high: 'High — we have seen this work',
}

export const CONFIDENCE_ORDER: readonly Confidence[] = ['low', 'medium', 'high']

/** Fixed card width per column, in px. Columns line up because widths do. */
export const NODE_WIDTH: Record<NodeKind, number> = {
  goal: 300,
  actor: 240,
  impact: 300,
  deliverable: 280,
}

export function newId(): string {
  return crypto.randomUUID()
}

/** Create an empty node of `kind` parented to `parent`. */
export function createNode(kind: NodeKind, parent: string | null, title = ''): MapNode {
  const base = { id: newId(), title, children: [], notes: undefined }
  switch (kind) {
    case 'goal':
      return { ...base, kind, parent: null }
    case 'actor':
      return { ...base, kind, parent, actorKind: 'user' }
    case 'impact':
      return { ...base, kind, parent, direction: 'support' }
    case 'deliverable':
      return { ...base, kind, parent, status: 'idea' }
  }
}
