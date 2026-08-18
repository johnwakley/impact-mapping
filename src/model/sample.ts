import type { ImpactMap, MapNode, NodeKind } from '../types.ts'

/**
 * The maps loaded on first run.
 *
 * They are deliberately opinionated, and chosen to pull in different directions:
 * a product growth goal, a turnaround, a public-service goal whose deliverables
 * are mostly not software, and an internal platform goal. Between them they
 * cover the things people get wrong first — goals that are really solutions,
 * impacts that are really features, and the fact that a map is supposed to hold
 * the actors working *against* you too.
 */

interface Spec {
  id: string
  kind: NodeKind
  title: string
  notes?: string
  extra?: Record<string, unknown>
  children?: Spec[]
}

interface SampleSpec {
  id: string
  name: string
  spec: Spec
}

/* ------------------------------------------------- 1. product growth ---- */

const WEEKLY_ACTIVE_TEAMS: Spec = {
  id: 'goal',
  kind: 'goal',
  title: 'Grow weekly active teams from 400 to 1,000 by 31 December',
  extra: {
    metric: 'Weekly active teams',
    unit: 'teams',
    baseline: 400,
    current: 520,
    target: 1000,
    deadline: '2026-12-31',
  },
  notes: 'A team counts as active if two or more members opened the app in the same week.',
  children: [
    {
      id: 'a-admins',
      kind: 'actor',
      title: 'Team admins',
      extra: { actorKind: 'user' },
      children: [
        {
          id: 'i-invite',
          kind: 'impact',
          title: 'Invite the rest of their team during the first session',
          extra: { direction: 'support' },
          children: [
            {
              id: 'd-bulk',
              kind: 'deliverable',
              title: 'Bulk invite by email domain',
              extra: { status: 'building', effort: 'M', confidence: 'high' },
            },
            {
              id: 'd-checklist',
              kind: 'deliverable',
              title: 'Invite step in the onboarding checklist',
              extra: { status: 'shipped', effort: 'S', confidence: 'high' },
              notes: 'Shipped in June. Lifted first-week invites from 18% to 34% of new workspaces.',
            },
            {
              id: 'd-directory',
              kind: 'deliverable',
              title: 'Import from Slack or Google Workspace directory',
              extra: { status: 'idea', effort: 'L', confidence: 'low' },
            },
          ],
        },
        {
          id: 'i-upgrade',
          kind: 'impact',
          title: 'Upgrade the plan without talking to sales',
          extra: { direction: 'support' },
          children: [
            {
              id: 'd-selfserve',
              kind: 'deliverable',
              title: 'Self-serve plan upgrade',
              extra: { status: 'planned', effort: 'M', confidence: 'medium' },
            },
            {
              id: 'd-nudge',
              kind: 'deliverable',
              title: 'Usage nudge when a workspace hits its seat limit',
              extra: { status: 'idea', effort: 'S', confidence: 'medium' },
            },
          ],
        },
      ],
    },
    {
      id: 'a-ics',
      kind: 'actor',
      title: 'Individual contributors',
      extra: { actorKind: 'user' },
      children: [
        {
          id: 'i-daily',
          kind: 'impact',
          title: 'Open the app daily rather than weekly',
          extra: { direction: 'support' },
          children: [
            {
              id: 'd-digest',
              kind: 'deliverable',
              title: 'Daily digest of what changed',
              extra: { status: 'shipped', effort: 'S', confidence: 'medium' },
            },
            {
              id: 'd-push',
              kind: 'deliverable',
              title: 'Mobile push for @mentions',
              extra: { status: 'planned', effort: 'M', confidence: 'medium' },
            },
          ],
        },
        {
          id: 'i-sso',
          kind: 'impact',
          title: 'Give up during setup when asked to configure SSO',
          extra: { direction: 'obstruct' },
          notes: 'Seen in 6 of 11 onboarding sessions. Biggest single drop-off in the funnel.',
          children: [
            {
              id: 'd-defer',
              kind: 'deliverable',
              title: 'Defer SSO until the fifth seat',
              extra: { status: 'planned', effort: 'S', confidence: 'high' },
            },
            {
              id: 'd-guided',
              kind: 'deliverable',
              title: 'Guided setup for the four commonest identity providers',
              extra: { status: 'idea', effort: 'L', confidence: 'low' },
            },
          ],
        },
      ],
    },
    {
      id: 'a-it',
      kind: 'actor',
      title: 'Customer IT reviewers',
      extra: { actorKind: 'customer' },
      children: [
        {
          id: 'i-approve',
          kind: 'impact',
          title: 'Approve the tool without a three-week security review',
          extra: { direction: 'support' },
          children: [
            {
              id: 'd-trust',
              kind: 'deliverable',
              title: 'Public trust page with the SOC 2 report',
              extra: { status: 'building', effort: 'M', confidence: 'high' },
            },
            {
              id: 'd-questionnaire',
              kind: 'deliverable',
              title: 'Pre-filled standard security questionnaire',
              extra: { status: 'idea', effort: 'S', confidence: 'medium' },
            },
          ],
        },
      ],
    },
    {
      id: 'a-support',
      kind: 'actor',
      title: 'Our support team',
      extra: { actorKind: 'internal' },
      children: [
        {
          id: 'i-escalate',
          kind: 'impact',
          title: 'Resolve setup tickets without escalating to engineering',
          extra: { direction: 'support' },
          children: [
            {
              id: 'd-diagnostics',
              kind: 'deliverable',
              title: 'Self-serve workspace diagnostics page',
              extra: { status: 'idea', effort: 'M', confidence: 'low' },
            },
          ],
        },
      ],
    },
  ],
}

/* --------------------------------------------------- 2. the turnaround -- */

/**
 * An imagining, not a historical document: the map Jobs might have drawn on
 * returning to Apple in 1997. The facts around it are real — the $150M
 * Microsoft investment and patent settlement announced at Macworld Boston that
 * August, the end of the Mac OS licensing programme, the four-square product
 * grid, Think Different, and the FY1997 loss of just over a billion dollars.
 *
 * It is here because it shows the technique doing something a feature list
 * cannot: putting Microsoft and the clone makers — actors Apple did not control
 * and could not out-build — on the same page as the products.
 */
const APPLE_1997: Spec = {
  id: 'ap-goal',
  kind: 'goal',
  title: 'Turn a $1.04B annual loss into a profit by the end of FY1998',
  extra: {
    metric: 'Annual net income',
    unit: '$M',
    baseline: -1040,
    target: 100,
    deadline: '1998-09-30',
  },
  notes: 'Ninety days of cash left. Everything on this map earns its place by moving that number, or it comes off.',
  children: [
    {
      id: 'ap-a-creatives',
      kind: 'actor',
      title: 'Creative professionals',
      notes: 'Design studios and publishers — nearly the only customers still choosing us on purpose.',
      extra: { actorKind: 'user' },
      children: [
        {
          id: 'ap-i-stay',
          kind: 'impact',
          title: 'Stay on the Mac instead of moving the studio to Windows NT',
          extra: { direction: 'support' },
          notes: 'They will not stay out of loyalty. They will stay for the machine that runs Photoshop fastest.',
          children: [
            {
              id: 'ap-d-g3',
              kind: 'deliverable',
              title: 'Power Mac G3 — beat the Pentium II on the benchmarks they actually run',
              extra: { status: 'building', effort: 'L', confidence: 'high' },
            },
            {
              id: 'ap-d-adobe',
              kind: 'deliverable',
              title: 'Get Adobe and Quark to commit to Mac versions in writing',
              extra: { status: 'planned', effort: 'M', confidence: 'medium' },
            },
          ],
        },
        {
          id: 'ap-i-tell',
          kind: 'impact',
          title: 'Tell their clients the Mac is finished',
          extra: { direction: 'obstruct' },
          notes: 'One art director telling a room that Apple is done costs us more than a bad review.',
          children: [
            {
              id: 'ap-d-seed',
              kind: 'deliverable',
              title: 'Put working G3s in the hands of the twenty loudest studios first',
              extra: { status: 'planned', effort: 'S', confidence: 'medium' },
            },
          ],
        },
      ],
    },
    {
      id: 'ap-a-microsoft',
      kind: 'actor',
      title: 'Microsoft',
      notes: 'The company that can end us by cancelling a single product. Treat that as a fact rather than an insult.',
      extra: { actorKind: 'competitor' },
      children: [
        {
          id: 'ap-i-office',
          kind: 'impact',
          title: 'Keep shipping Office for the Mac, and drop the patent suit',
          extra: { direction: 'support' },
          notes: 'We do not have to win this fight to survive. We have to stop having it.',
          children: [
            {
              id: 'ap-d-150',
              kind: 'deliverable',
              title: '$150M non-voting investment and a five-year patent cross-licence',
              extra: { status: 'shipped', effort: 'M', confidence: 'high' },
              notes: 'Announced at Macworld Boston, August 1997. The hall booed. The only number that matters went up.',
            },
            {
              id: 'ap-d-ie',
              kind: 'deliverable',
              title: 'Make Internet Explorer the default browser on the Mac',
              extra: { status: 'shipped', effort: 'S', confidence: 'high' },
              notes: 'The price of the sentence above it.',
            },
          ],
        },
      ],
    },
    {
      id: 'ap-a-clones',
      kind: 'actor',
      title: 'Mac clone makers',
      notes: 'Power Computing, UMAX, Motorola. Licensed to build Macs, and rather good at it.',
      extra: { actorKind: 'competitor' },
      children: [
        {
          id: 'ap-i-clone',
          kind: 'impact',
          title: 'Undercut our own hardware with cheaper licensed Macs',
          extra: { direction: 'obstruct' },
          notes: 'The licensing programme grows the platform and starves the company. We cannot afford both.',
          children: [
            {
              id: 'ap-d-licence',
              kind: 'deliverable',
              title: 'End the Mac OS licensing programme',
              extra: { status: 'shipped', effort: 'M', confidence: 'high' },
            },
            {
              id: 'ap-d-power',
              kind: 'deliverable',
              title: 'Buy out Power Computing’s licence and customer list',
              extra: { status: 'shipped', effort: 'L', confidence: 'high' },
            },
          ],
        },
      ],
    },
    {
      id: 'ap-a-engineers',
      kind: 'actor',
      title: 'Our own engineers',
      extra: { actorKind: 'internal' },
      children: [
        {
          id: 'ap-i-focus',
          kind: 'impact',
          title: 'Work on four products instead of fifteen',
          extra: { direction: 'support' },
          children: [
            {
              id: 'ap-d-grid',
              kind: 'deliverable',
              title: 'The grid: consumer and pro, desktop and portable. Four boxes, four machines',
              extra: { status: 'building', effort: 'L', confidence: 'high' },
            },
            {
              id: 'ap-d-cancel',
              kind: 'deliverable',
              title: 'Cancel Newton, eMate, OpenDoc, Cyberdog and the printer line',
              extra: { status: 'planned', effort: 'M', confidence: 'high' },
              notes: 'Every one of these has people who love it. That is what makes it hard, not what makes it wrong.',
            },
          ],
        },
      ],
    },
    {
      id: 'ap-a-firsttime',
      kind: 'actor',
      title: 'First-time home buyers',
      notes: 'People buying a computer to get on the internet, who have never bought one before.',
      extra: { actorKind: 'customer' },
      children: [
        {
          id: 'ap-i-first',
          kind: 'impact',
          title: 'Choose a Mac as their first internet computer',
          extra: { direction: 'support' },
          children: [
            {
              id: 'ap-d-imac',
              kind: 'deliverable',
              title: 'iMac: on the internet in two steps, out of the box',
              extra: { status: 'planned', effort: 'XL', confidence: 'medium' },
              notes: 'One model, one price, one cable. If it needs explaining, it is not finished.',
            },
            {
              id: 'ap-d-usb',
              kind: 'deliverable',
              title: 'Drop the floppy drive; ship USB and a modem as standard',
              extra: { status: 'planned', effort: 'M', confidence: 'low' },
              notes: 'Every reviewer will hate this. Every buyer will be online in ten minutes.',
            },
            {
              id: 'ap-d-store',
              kind: 'deliverable',
              title: 'Sell direct from an online store',
              extra: { status: 'idea', effort: 'M', confidence: 'medium' },
            },
          ],
        },
      ],
    },
    {
      id: 'ap-a-doubters',
      kind: 'actor',
      title: 'Everyone who thinks Apple is already dead',
      notes: 'Buyers, developers and the press, all reading the same obituary.',
      extra: { actorKind: 'user' },
      children: [
        {
          id: 'ap-i-risk',
          kind: 'impact',
          title: 'Stop treating buying a Mac as a risk',
          extra: { direction: 'support' },
          children: [
            {
              id: 'ap-d-think',
              kind: 'deliverable',
              title: 'Think Different — say what we are for, not what we are faster than',
              extra: { status: 'building', effort: 'M', confidence: 'medium' },
            },
            {
              id: 'ap-d-ontime',
              kind: 'deliverable',
              title: 'Ship on the date we announced, four quarters running',
              extra: { status: 'planned', effort: 'XL', confidence: 'low' },
              notes: 'The cheapest advertising available, and the hardest to fake.',
            },
          ],
        },
      ],
    },
  ],
}

/* ------------------------------------------- 3. a goal that goes down --- */

const HANDOVER: Spec = {
  id: 'ho-goal',
  kind: 'goal',
  title: 'Cut ambulance handovers taking over 30 minutes from 41% to under 10% before next winter',
  extra: {
    metric: 'Handovers over 30 minutes',
    unit: '%',
    baseline: 41,
    current: 38,
    target: 10,
    deadline: '2027-03-31',
  },
  notes: 'Note that almost nothing on this map is software. Deliverables are whatever changes the behaviour.',
  children: [
    {
      id: 'ho-a-crews',
      kind: 'actor',
      title: 'Ambulance crews',
      extra: { actorKind: 'internal' },
      children: [
        {
          id: 'ho-i-back',
          kind: 'impact',
          title: 'Hand over and get back on the road inside 15 minutes',
          extra: { direction: 'support' },
          children: [
            {
              id: 'ho-d-enroute',
              kind: 'deliverable',
              title: 'Crews book the handover slot en route, not on arrival',
              extra: { status: 'building', effort: 'M', confidence: 'high' },
            },
            {
              id: 'ho-d-onescreen',
              kind: 'deliverable',
              title: 'One handover screen instead of three systems',
              extra: { status: 'planned', effort: 'M', confidence: 'medium' },
            },
          ],
        },
        {
          id: 'ho-i-corridor',
          kind: 'impact',
          title: 'Queue in the corridor because there is nowhere to put the patient',
          extra: { direction: 'obstruct' },
          notes: 'Crews are not the cause here. They are where the problem becomes visible.',
          children: [
            {
              id: 'ho-d-cohort',
              kind: 'deliverable',
              title: 'Cohort area with one nurse for up to six waiting patients',
              extra: { status: 'shipped', effort: 'L', confidence: 'high' },
            },
          ],
        },
      ],
    },
    {
      id: 'ho-a-nurses',
      kind: 'actor',
      title: 'Emergency department nurses',
      extra: { actorKind: 'internal' },
      children: [
        {
          id: 'ho-i-triage',
          kind: 'impact',
          title: 'Start triage before the patient is off the trolley',
          extra: { direction: 'support' },
          children: [
            {
              id: 'ho-d-prealert',
              kind: 'deliverable',
              title: 'Structured pre-alert sent from the ambulance',
              extra: { status: 'building', effort: 'M', confidence: 'medium' },
            },
            {
              id: 'ho-d-script',
              kind: 'deliverable',
              title: 'Rewrite the handover script to match the one crews already use',
              extra: { status: 'idea', effort: 'S', confidence: 'medium' },
            },
          ],
        },
      ],
    },
    {
      id: 'ho-a-discharge',
      kind: 'actor',
      title: 'Ward discharge coordinators',
      notes: 'The queue at the front door is made of beds that did not empty at the back.',
      extra: { actorKind: 'internal' },
      children: [
        {
          id: 'ho-i-midday',
          kind: 'impact',
          title: 'Free beds before midday instead of after five',
          extra: { direction: 'support' },
          children: [
            {
              id: 'ho-d-lounge',
              kind: 'deliverable',
              title: 'Discharge lounge staffed from 8am',
              extra: { status: 'planned', effort: 'M', confidence: 'high' },
            },
            {
              id: 'ho-d-board',
              kind: 'deliverable',
              title: 'Predicted discharge date on every ward board',
              extra: { status: 'building', effort: 'M', confidence: 'medium' },
            },
            {
              id: 'ho-d-pharmacy',
              kind: 'deliverable',
              title: 'Pharmacy takes discharge prescriptions first, not last',
              extra: { status: 'idea', effort: 'S', confidence: 'high' },
            },
          ],
        },
      ],
    },
    {
      id: 'ho-a-social',
      kind: 'actor',
      title: 'Social care placement teams',
      extra: { actorKind: 'partner' },
      children: [
        {
          id: 'ho-i-placement',
          kind: 'impact',
          title: 'Agree a placement within 24 hours of a patient being medically fit',
          extra: { direction: 'support' },
          children: [
            {
              id: 'ho-d-sharedlist',
              kind: 'deliverable',
              title: 'One shared list of medically-fit patients across health and council',
              extra: { status: 'idea', effort: 'L', confidence: 'low' },
            },
          ],
        },
      ],
    },
    {
      id: 'ho-a-execs',
      kind: 'actor',
      title: 'Hospital executives',
      extra: { actorKind: 'internal' },
      children: [
        {
          id: 'ho-i-measure',
          kind: 'impact',
          title: 'Judge the department on handover time, not only the four-hour target',
          extra: { direction: 'support' },
          notes: 'What gets read out at 8:30 every morning is what gets fixed.',
          children: [
            {
              id: 'ho-d-boardround',
              kind: 'deliverable',
              title: 'Handover time on the daily board round, above the four-hour figure',
              extra: { status: 'planned', effort: 'S', confidence: 'medium' },
            },
          ],
        },
      ],
    },
  ],
}

/* -------------------------------------------- 4. an internal platform --- */

const FIRST_DEPLOY: Spec = {
  id: 'fd-goal',
  kind: 'goal',
  title: 'Cut the median time from offer accepted to first change in production from 23 days to 5',
  extra: {
    metric: 'Median days to first production change',
    unit: 'days',
    baseline: 23,
    current: 19,
    target: 5,
    deadline: '2027-06-30',
  },
  children: [
    {
      id: 'fd-a-new',
      kind: 'actor',
      title: 'Newly hired engineers',
      extra: { actorKind: 'internal' },
      children: [
        {
          id: 'fd-i-dayone',
          kind: 'impact',
          title: 'Get a working environment on day one without asking anyone',
          extra: { direction: 'support' },
          children: [
            {
              id: 'fd-d-onecmd',
              kind: 'deliverable',
              title: 'One command that builds and runs the whole stack',
              extra: { status: 'building', effort: 'L', confidence: 'medium' },
            },
            {
              id: 'fd-d-laptop',
              kind: 'deliverable',
              title: 'Laptop arrives configured rather than in a box',
              extra: { status: 'shipped', effort: 'M', confidence: 'high' },
            },
          ],
        },
        {
          id: 'fd-i-access',
          kind: 'impact',
          title: 'Spend the first fortnight requesting access one system at a time',
          extra: { direction: 'obstruct' },
          notes: 'Measured at 11 separate requests, each with its own approver and its own waiting.',
          children: [
            {
              id: 'fd-d-bundles',
              kind: 'deliverable',
              title: 'Access bundles by role, granted when the contract is signed',
              extra: { status: 'planned', effort: 'M', confidence: 'high' },
            },
          ],
        },
      ],
    },
    {
      id: 'fd-a-buddies',
      kind: 'actor',
      title: 'Onboarding buddies',
      extra: { actorKind: 'internal' },
      children: [
        {
          id: 'fd-i-task',
          kind: 'impact',
          title: 'Hand over a real starter task instead of inventing one on the spot',
          extra: { direction: 'support' },
          children: [
            {
              id: 'fd-d-queue',
              kind: 'deliverable',
              title: 'A standing queue of small, real, reviewable-in-a-day tasks',
              extra: { status: 'planned', effort: 'S', confidence: 'medium' },
            },
          ],
        },
      ],
    },
    {
      id: 'fd-a-security',
      kind: 'actor',
      title: 'IT and security reviewers',
      extra: { actorKind: 'internal' },
      children: [
        {
          id: 'fd-i-approve',
          kind: 'impact',
          title: 'Approve access in hours rather than in the Thursday batch',
          extra: { direction: 'support' },
          children: [
            {
              id: 'fd-d-preapproved',
              kind: 'deliverable',
              title: 'Pre-approved bundles so the happy path needs no human at all',
              extra: { status: 'planned', effort: 'M', confidence: 'medium' },
            },
            {
              id: 'fd-d-audit',
              kind: 'deliverable',
              title: 'Quarterly access review, so removing the gate does not remove the control',
              extra: { status: 'idea', effort: 'M', confidence: 'high' },
            },
          ],
        },
      ],
    },
    {
      id: 'fd-a-managers',
      kind: 'actor',
      title: 'Hiring managers',
      extra: { actorKind: 'internal' },
      children: [
        {
          id: 'fd-i-early',
          kind: 'impact',
          title: 'Start the setup at offer acceptance rather than on the first morning',
          extra: { direction: 'support' },
          children: [
            {
              id: 'fd-d-trigger',
              kind: 'deliverable',
              title: 'Checklist that fires the moment an offer is accepted',
              extra: { status: 'shipped', effort: 'S', confidence: 'high' },
            },
          ],
        },
      ],
    },
  ],
}

/* ------------------------------------------------------------ building -- */

export const SAMPLE_SPECS: readonly SampleSpec[] = [
  { id: 'sample', name: 'Grow weekly active teams', spec: WEEKLY_ACTIVE_TEAMS },
  { id: 'sample-apple-1997', name: 'Apple: ninety days of cash (1997)', spec: APPLE_1997 },
  { id: 'sample-handover', name: 'Cut ambulance handover delays', spec: HANDOVER },
  { id: 'sample-first-deploy', name: 'New engineers shipping in week one', spec: FIRST_DEPLOY },
]

function flatten(spec: Spec, parent: string | null, out: Record<string, MapNode>): string {
  const node = {
    id: spec.id,
    kind: spec.kind,
    title: spec.title,
    notes: spec.notes,
    parent,
    children: [] as string[],
    ...spec.extra,
  } as MapNode
  out[spec.id] = node
  node.children = (spec.children ?? []).map((child) => flatten(child, spec.id, out))
  return spec.id
}

function build(definition: SampleSpec): ImpactMap {
  const nodes: Record<string, MapNode> = {}
  const rootId = flatten(definition.spec, null, nodes)
  const now = new Date().toISOString()
  return {
    id: definition.id,
    name: definition.name,
    rootId,
    nodes,
    createdAt: now,
    updatedAt: now,
  }
}

/** Every built-in map, in the order they should appear in the library. */
export function allSampleMaps(): ImpactMap[] {
  return SAMPLE_SPECS.map(build)
}

/** The first built-in map on its own. */
export function sampleMap(): ImpactMap {
  return build(SAMPLE_SPECS[0])
}

/**
 * Add any built-in maps the library is missing, leaving everything already
 * there exactly as it is — including a built-in the user has since edited.
 * Used both when seeding a returning browser and by "Examples" in the map list,
 * so the two can never drift apart.
 */
export function withMissingSamples(
  maps: Record<string, ImpactMap>,
  order: readonly string[],
): { maps: Record<string, ImpactMap>; order: string[]; added: number } {
  const missing = allSampleMaps().filter((map) => !maps[map.id])
  if (!missing.length) return { maps, order: [...order], added: 0 }
  const nextMaps = { ...maps }
  for (const map of missing) nextMaps[map.id] = map
  return {
    maps: nextMaps,
    order: [...order, ...missing.map((map) => map.id)],
    added: missing.length,
  }
}
