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

/* ------------------------------------------ 1. subscriber acquisition -- */

/**
 * Netflix in 2001, planning the run at the IPO. Grounded in the public record:
 * the $19.95 unlimited plan that dropped late fees and due dates, the regional
 * distribution centres built for next-day delivery, Cinematch, the studio
 * revenue-sharing deals, and roughly 456,000 subscribers at the end of 2001
 * against 600,000 by the May 2002 listing.
 *
 * Worth reading for the Blockbuster branch: the strongest deliverable on the map
 * is not a feature, it is a business model the competitor cannot copy without
 * cannibalising a sixth of its own profit.
 */
const NETFLIX: Spec = {
  id: 'nf-goal',
  kind: 'goal',
  title: 'Grow paid subscribers from 300,000 to one million by the end of 2002',
  extra: {
    metric: 'Paid subscribers',
    unit: 'subscribers',
    baseline: 300000,
    current: 456000,
    target: 1000000,
    deadline: '2002-12-31',
  },
  notes: 'Subscribers, not revenue. Every other number we care about follows this one.',
  children: [
    {
      id: 'nf-a-owners',
      kind: 'actor',
      title: 'People who own a DVD player and have never rented online',
      notes: 'Every DVD player sold is a household with a machine and nothing to play on it.',
      extra: { actorKind: 'customer' },
      children: [
        {
          id: 'nf-i-try',
          kind: 'impact',
          title: 'Try the service without feeling they have signed up for anything',
          extra: { direction: 'support' },
          children: [
            {
              id: 'nf-d-trial',
              kind: 'deliverable',
              title: 'Two-week free trial, cancelled from the website in one click',
              extra: { status: 'shipped', effort: 'S', confidence: 'high' },
            },
            {
              id: 'nf-d-bundle',
              kind: 'deliverable',
              title: 'Bundle a trial in the box with new Toshiba and Sony players',
              extra: { status: 'shipped', effort: 'M', confidence: 'high' },
              notes: 'Reaches the household at the one moment it owns a player and no discs.',
            },
          ],
        },
        {
          id: 'nf-i-wait',
          kind: 'impact',
          title: 'Assume renting by post means waiting a week for the film',
          extra: { direction: 'obstruct' },
          notes: 'The objection is not the price. It is that the film turns up after they stopped wanting it.',
          children: [
            {
              id: 'nf-d-centres',
              kind: 'deliverable',
              title: 'Open regional distribution centres until most subscribers get next-day delivery',
              extra: { status: 'building', effort: 'XL', confidence: 'high' },
            },
          ],
        },
      ],
    },
    {
      id: 'nf-a-subs',
      kind: 'actor',
      title: 'Subscribers we already have',
      extra: { actorKind: 'user' },
      children: [
        {
          id: 'nf-i-queue',
          kind: 'impact',
          title: 'Keep the queue full, so a disc is always in the post',
          extra: { direction: 'support' },
          notes: 'A subscriber with an empty queue has already cancelled. They just have not told us yet.',
          children: [
            {
              id: 'nf-d-queue',
              kind: 'deliverable',
              title: 'The queue: choose films now, receive them as slots free up',
              extra: { status: 'shipped', effort: 'M', confidence: 'high' },
            },
            {
              id: 'nf-d-cinematch',
              kind: 'deliverable',
              title: 'Cinematch — recommend from what they rated, not from what is new',
              extra: { status: 'building', effort: 'L', confidence: 'medium' },
              notes: 'Also steers demand towards the back catalogue we already own outright.',
            },
          ],
        },
        {
          id: 'nf-i-tell',
          kind: 'impact',
          title: 'Tell their friends the late fee is gone',
          extra: { direction: 'support' },
          children: [
            {
              id: 'nf-d-refer',
              kind: 'deliverable',
              title: 'Refer a friend, both get a free month',
              extra: { status: 'planned', effort: 'S', confidence: 'medium' },
            },
          ],
        },
      ],
    },
    {
      id: 'nf-a-blockbuster',
      kind: 'actor',
      title: 'Blockbuster',
      notes: 'Nine thousand stores, and a large share of its profit coming from late fees.',
      extra: { actorKind: 'competitor' },
      children: [
        {
          id: 'nf-i-copy',
          kind: 'impact',
          title: 'Launch an unlimited plan and undercut us from the stores',
          extra: { direction: 'obstruct' },
          children: [
            {
              id: 'nf-d-selection',
              kind: 'deliverable',
              title: 'Win on selection: 11,500 titles no shop can put on a shelf',
              extra: { status: 'building', effort: 'L', confidence: 'high' },
            },
            {
              id: 'nf-d-model',
              kind: 'deliverable',
              title: 'Keep the model one they cannot copy cheaply',
              extra: { status: 'shipped', effort: 'M', confidence: 'medium' },
              notes: 'Our advantage is not the discs. It is that matching us costs them their late fees.',
            },
          ],
        },
      ],
    },
    {
      id: 'nf-a-studios',
      kind: 'actor',
      title: 'The studios',
      extra: { actorKind: 'partner' },
      children: [
        {
          id: 'nf-i-revshare',
          kind: 'impact',
          title: 'License titles on a revenue share rather than $100 a copy',
          extra: { direction: 'support' },
          notes: 'Buying inventory outright is what caps how many copies of a new release we can stock.',
          children: [
            {
              id: 'nf-d-deals',
              kind: 'deliverable',
              title: 'Revenue-sharing deals with Warner, Columbia and Universal',
              extra: { status: 'building', effort: 'L', confidence: 'medium' },
            },
          ],
        },
      ],
    },
    {
      id: 'nf-a-ops',
      kind: 'actor',
      title: 'Our own warehouse teams',
      extra: { actorKind: 'internal' },
      children: [
        {
          id: 'nf-i-turnaround',
          kind: 'impact',
          title: 'Turn a returned disc around the same day it arrives',
          extra: { direction: 'support' },
          children: [
            {
              id: 'nf-d-sorting',
              kind: 'deliverable',
              title: 'Automated sorting and same-day dispatch at every centre',
              extra: { status: 'planned', effort: 'L', confidence: 'medium' },
            },
            {
              id: 'nf-d-nearest',
              kind: 'deliverable',
              title: 'Ship from the centre nearest the subscriber, not the one holding the disc',
              extra: { status: 'idea', effort: 'M', confidence: 'medium' },
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

/* ------------------------------------------------ 4. the pre-IPO year -- */

/**
 * An outside-in reconstruction, built only from public reporting in August 2026:
 * a run-rate of roughly $65B at the end of July, up from about $9B at the end of
 * 2025; second-quarter revenue above $11.5B against $787M a year earlier;
 * confidential draft paperwork filed; and investors expecting the year to close
 * somewhere between $100B and $120B.
 *
 * It is not Anthropic's plan and nothing here comes from inside the company. It
 * is on the map because a pre-IPO year is an unusually clear impact-mapping
 * problem: the growth is not in doubt, its *durability* is, and durability is
 * made of other people's behaviour.
 */
const ANTHROPIC_PRE_IPO: Spec = {
  id: 'an-goal',
  kind: 'goal',
  title: 'Close 2026 at a $100–120B run-rate, on revenue durable enough to underwrite the listing',
  extra: {
    metric: 'Annualised run-rate revenue',
    unit: '$B',
    baseline: 9,
    current: 65,
    target: 110,
    deadline: '2026-12-31',
  },
  notes: 'From public reporting only, nothing internal. Growth is not the hard part; durability is.',
  children: [
    {
      id: 'an-a-enterprise',
      kind: 'actor',
      title: 'Enterprise platform teams',
      notes: 'The people who put Claude into something their own customers depend on.',
      extra: { actorKind: 'customer' },
      children: [
        {
          id: 'an-i-commit',
          kind: 'impact',
          title: 'Commit to multi-year capacity instead of renewing month to month',
          extra: { direction: 'support' },
          notes: 'A month-to-month book of business is priced as a month-to-month book of business.',
          children: [
            {
              id: 'an-d-capacity',
              kind: 'deliverable',
              title: 'Capacity commitments with price certainty over the term',
              extra: { status: 'planned', effort: 'L', confidence: 'medium' },
            },
            {
              id: 'an-d-deprecation',
              kind: 'deliverable',
              title: 'A published deprecation policy, so a model they built on has a known lifetime',
              extra: { status: 'building', effort: 'M', confidence: 'high' },
            },
          ],
        },
        {
          id: 'an-i-second',
          kind: 'impact',
          title: 'Keep a second provider wired up so they can switch in a week',
          extra: { direction: 'obstruct' },
          notes: 'This is the whole question. A buyer who can leave in a week contracts as though they will.',
          children: [
            {
              id: 'an-d-evals',
              kind: 'deliverable',
              title: 'Help customers build evals on their own work, which travel badly to another model',
              extra: { status: 'planned', effort: 'L', confidence: 'medium' },
            },
            {
              id: 'an-d-agents',
              kind: 'deliverable',
              title: 'Agents that hold context across a long task, not single calls anyone can re-route',
              extra: { status: 'building', effort: 'XL', confidence: 'medium' },
            },
          ],
        },
      ],
    },
    {
      id: 'an-a-devs',
      kind: 'actor',
      title: 'Developers choosing what to build on',
      extra: { actorKind: 'user' },
      children: [
        {
          id: 'an-i-first',
          kind: 'impact',
          title: 'Reach for Claude first when starting something new',
          extra: { direction: 'support' },
          children: [
            {
              id: 'an-d-code',
              kind: 'deliverable',
              title: 'Claude Code — meet developers in the terminal they already live in',
              extra: { status: 'shipped', effort: 'XL', confidence: 'high' },
            },
            {
              id: 'an-d-mcp',
              kind: 'deliverable',
              title: 'MCP and the SDKs, so connecting a tool is an afternoon rather than a project',
              extra: { status: 'shipped', effort: 'L', confidence: 'high' },
            },
          ],
        },
      ],
    },
    {
      id: 'an-a-investors',
      kind: 'actor',
      title: 'Institutional investors and sell-side analysts',
      notes: 'They do not need the 2028 forecast to be certain. They need to see how it is built.',
      extra: { actorKind: 'partner' },
      children: [
        {
          id: 'an-i-underwrite',
          kind: 'impact',
          title: 'Underwrite the forecast rather than discount it',
          extra: { direction: 'support' },
          children: [
            {
              id: 'an-d-cohorts',
              kind: 'deliverable',
              title: 'Disclose net revenue retention and cohort expansion, not just the headline run-rate',
              extra: { status: 'planned', effort: 'M', confidence: 'medium' },
            },
            {
              id: 'an-d-margin',
              kind: 'deliverable',
              title: 'Show cost per task falling faster than price per token',
              extra: { status: 'planned', effort: 'L', confidence: 'medium' },
            },
            {
              id: 'an-d-concentration',
              kind: 'deliverable',
              title: 'Name the customer concentration risk before an analyst does',
              extra: { status: 'idea', effort: 'S', confidence: 'high' },
            },
          ],
        },
      ],
    },
    {
      id: 'an-a-rivals',
      kind: 'actor',
      title: 'The other frontier labs',
      extra: { actorKind: 'competitor' },
      children: [
        {
          id: 'an-i-price',
          kind: 'impact',
          title: 'Reset the price per token faster than our costs come down',
          extra: { direction: 'obstruct' },
          notes: 'A price war we win on quality and lose on margin still shows up in the filing.',
          children: [
            {
              id: 'an-d-task',
              kind: 'deliverable',
              title: 'Compete on finished tasks rather than benchmark scores',
              extra: { status: 'building', effort: 'L', confidence: 'medium' },
            },
          ],
        },
      ],
    },
    {
      id: 'an-a-safety',
      kind: 'actor',
      title: 'Our own safety and policy researchers',
      notes: 'Once the company is public, the safety record becomes a financial fact too.',
      extra: { actorKind: 'internal' },
      children: [
        {
          id: 'an-i-safetycase',
          kind: 'impact',
          title: 'Ship the safety case alongside the model rather than after it',
          extra: { direction: 'support' },
          children: [
            {
              id: 'an-d-cards',
              kind: 'deliverable',
              title: 'System cards and evaluations published with each release',
              extra: { status: 'shipped', effort: 'M', confidence: 'high' },
            },
            {
              id: 'an-d-rsp',
              kind: 'deliverable',
              title: 'Scaling commitments written so an external auditor could check them',
              extra: { status: 'building', effort: 'L', confidence: 'medium' },
            },
          ],
        },
      ],
    },
    {
      id: 'an-a-regulators',
      kind: 'actor',
      title: 'Regulators and standards bodies',
      extra: { actorKind: 'regulator' },
      children: [
        {
          id: 'an-i-sufficient',
          kind: 'impact',
          title: 'Treat our disclosures as sufficient rather than opening an inquiry mid-roadshow',
          extra: { direction: 'support' },
          children: [
            {
              id: 'an-d-prebrief',
              kind: 'deliverable',
              title: 'Brief them on the release process before the filing, not after',
              extra: { status: 'planned', effort: 'M', confidence: 'medium' },
            },
            {
              id: 'an-d-incident',
              kind: 'deliverable',
              title: 'A documented incident-reporting route that already has traffic on it',
              extra: { status: 'idea', effort: 'M', confidence: 'medium' },
            },
          ],
        },
      ],
    },
  ],
}

/* ------------------------------------------------------------ building -- */

export const SAMPLE_SPECS: readonly SampleSpec[] = [
  { id: 'sample-netflix', name: 'Netflix: a million subscribers (2001)', spec: NETFLIX },
  { id: 'sample-apple-1997', name: 'Apple: ninety days of cash (1997)', spec: APPLE_1997 },
  { id: 'sample-anthropic-ipo', name: 'Anthropic: the pre-IPO year (2026)', spec: ANTHROPIC_PRE_IPO },
  { id: 'sample-handover', name: 'Cut ambulance handover delays', spec: HANDOVER },
]

interface RetiredSample {
  id: string
  name: string
  /**
   * Remove it even if it has been edited. Only for examples that were
   * explicitly withdrawn rather than merely replaced. A retired map is always
   * matched on its shipped name as well as its id, so a copy someone renamed
   * is treated as theirs and survives either way.
   */
  force?: boolean
}

/**
 * Built-in maps that used to ship. They are cleared out on upgrade — by default
 * only while still untouched, because an example someone has edited has become
 * their map rather than ours.
 */
const RETIRED_SAMPLES: readonly RetiredSample[] = [
  { id: 'sample', name: 'Grow weekly active teams', force: true },
  { id: 'sample-first-deploy', name: 'New engineers shipping in week one' },
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
/**
 * Drop built-in maps that no longer ship. A retired map is removed only while it
 * still carries the name we shipped it under, and — unless it is marked `force` —
 * only while it has never been edited. Anything else stays, because at that
 * point it is the user's map rather than ours.
 */
export function withoutRetiredSamples(
  maps: Record<string, ImpactMap>,
  order: readonly string[],
): { maps: Record<string, ImpactMap>; order: string[]; removed: number } {
  const doomed = RETIRED_SAMPLES.filter(({ id, name, force }) => {
    const map = maps[id]
    if (!map || map.name !== name) return false
    return force === true || map.updatedAt === map.createdAt
  }).map(({ id }) => id)

  if (!doomed.length) return { maps, order: [...order], removed: 0 }

  const nextMaps = { ...maps }
  for (const id of doomed) delete nextMaps[id]
  return {
    maps: nextMaps,
    order: order.filter((id) => !doomed.includes(id)),
    removed: doomed.length,
  }
}

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
