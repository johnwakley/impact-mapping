# Impact Mapping

An interactive editor for [impact maps](https://www.impactmapping.org/) — Gojko Adzic's
technique for planning software around a measurable goal instead of a feature list.

A map is a strict four-level tree, and each level answers one question:

| Level | Question | What belongs there |
| --- | --- | --- |
| **Goal** | Why? | The measurable business objective. One per map. |
| **Actor** | Who? | Who can produce the effect — or obstruct it. |
| **Impact** | How? | How that actor's behaviour should change. |
| **Deliverable** | What? | What we could do to support the change. |

```bash
npm install
npm run dev            # http://localhost:5180
npm test               # model, layout, export and storage tests
npm run build          # typecheck + static site in dist/
npm run build:single   # typecheck + one self-contained file in dist-single/
```

It is a static site: no backend, no build-time or run-time network calls, no fonts
or scripts from a CDN. Maps live in the browser's `localStorage` and can be exported
to JSON, Markdown, CSV or PNG. Nothing leaves the machine.

## The built-in examples

Four worked maps load on first run, chosen to pull in different directions. Deleted
one by accident? **Maps → Examples** puts the missing ones back without touching
anything you have made or edited.

| Map | What it demonstrates |
| --- | --- |
| Netflix: a million subscribers (2001) | Customer acquisition, and a deliverable that is a business model rather than a feature |
| Apple: ninety days of cash (1997) | Actors you do not control — Microsoft and the clone makers sit on the map beside the products |
| Anthropic: the pre-IPO year (2026) | A goal whose real risk is not growth but *durability*, which is made of other people's behaviour |
| Cut ambulance handover delays | A goal that goes *down*, and deliverables that are almost all process rather than software |

Two of them are reconstructions rather than documents, and both say so on the goal card.

**Netflix** is set in 2001, planning the run at the IPO, and hangs off the public
record: the $19.95 unlimited plan that dropped late fees and due dates, the regional
distribution centres built for next-day delivery, Cinematch, the studio revenue-share
deals, and roughly 456,000 subscribers at the end of 2001 against 600,000 by the May
2002 listing. The Blockbuster branch is the one worth reading — the strongest
deliverable on the map is not a feature but a model the competitor could not copy
without cannibalising its own late fees.

**Apple** imagines the map Jobs might have drawn on returning in 1997. The things
hanging off it are real: the $150M Microsoft investment and patent settlement announced
at Macworld Boston that August, the end of the Mac OS licensing programme, the
four-square product grid, Think Different, and a fiscal 1997 loss of just over a
billion dollars.

**Anthropic** is an outside-in reconstruction built only from public reporting in
August 2026 — a run-rate of roughly $65B at the end of July, up from about $9B at the
end of 2025; second-quarter revenue above $11.5B against $787M a year earlier;
confidential draft paperwork filed; investors expecting the year to close between
$100B and $120B. **Nothing in it comes from inside the company and it is not
Anthropic's plan.** It earns its place because a pre-IPO year is an unusually clean
impact-mapping problem: the growth is not in doubt, its durability is, and durability
is made of other people's behaviour — which is exactly what the middle two columns
are for.

Statuses on all of these reflect where each item stood at the time, so a map reads as
a snapshot rather than a retrospective.

Retiring an example is deliberately conservative: when a built-in map stops shipping,
it is removed from existing browsers only while still untouched. Rename or edit one
and it stays, because at that point it is your map, not ours.

## Hosting it

Asset paths are relative (`base: './'`), so `dist/` works wherever you put it —
a domain root, a project page at `/tools/impact-mapping/`, an S3 bucket, a network
share. Nothing needs configuring per host and there are no routes, so no SPA
rewrite rules either.

| You want | Use | Notes |
| --- | --- | --- |
| A hosted page | `dist/` | Any static host. Verified from a nested subpath. |
| One file to email or double-click | `dist-single/index.html` | ~481 kB, everything inlined, opens over `file://` |

`dist/` opened directly from `file://` will render a blank page — browsers block
ES module `src=` loads on that origin. That is the whole reason `build:single`
exists; use it when the file has to travel on its own.

## Where the data lives

`localStorage`, under the key `impact-mapping/v1`, scoped to the origin serving the
page. Two consequences worth knowing:

- A map saved on `file://` will not appear on `https://…`, and vice versa — different
  origins, different stores. Move work between them with **Export → JSON**.
- Clearing site data clears your maps. There is no copy anywhere else.

The header carries a save indicator, because the three ways browser storage fails are
all silent by default: storage switched off (private windows, blocked site data), quota
exhausted, and a write that throws. `src/model/storage.ts` wraps `localStorage` to
detect all three and the indicator turns red with an explanation rather than letting
you keep typing into something that is not saving.

## Why React Flow and not a mind-map library

An impact map looks like a mind map, so [Mind Elixir](https://github.com/SSShooter/mind-elixir-core),
[jsMind](https://github.com/hizzgdev/jsmind) and friends are the obvious candidates —
and they arrive with node editing, drag-to-reparent, undo/redo and PNG export already
built. That is a real head start.

It is the wrong trade here, because an impact map is not a mind map. It is a *typed*
tree: four levels that mean different things and carry different data. A goal has a
metric, a baseline and a target. An actor has a kind. An impact has a direction —
it can obstruct the goal as easily as support it. A deliverable has a status, an
effort and a confidence, because it is a bet, not a task. Generic mind-map cores model
one node type — text plus children — and every one of those fields becomes something
you bolt on beside the library rather than inside it.

React Flow ([`@xyflow/react`](https://reactflow.dev/), MIT) renders nodes as ordinary
React components, so a typed level is just a component with its own fields, its own
badges and its own validation. `src/model/schema.ts` declares what each level means and
what may nest inside it; the store refuses illegal moves, and drag-and-drop only offers
legal parents. That constraint is the point of the tool — it is what keeps a deliverable
from being filed as an impact.

The cost is that React Flow ships no layout engine. For a general graph you would reach
for elk or dagre; for a strict tree the classic tidy-tree algorithm is ~60 lines
(`src/model/layout.ts`), runs synchronously, and pins every level to its own column —
which matters, because on an impact map the columns *are* the method.

## The model

```
src/
  types.ts              discriminated union of the four node kinds
  model/
    schema.ts           what each level means, what may nest in it, card widths
    tree.ts             traversal, visibility, the assumption chain
    layout.ts           tidy-tree layout + text measurement
    drop.ts             where a dragged card is allowed to land
    io.ts               JSON / Markdown / CSV, and import repair
    exportImage.ts      PNG of the whole map, not just the visible part
    storage.ts          localStorage wrapper that reports how saving is going
    metric.ts           goal progress, for metrics that go up or down
    sample.ts           the four worked examples loaded on first run
    model.test.ts       node:test suite over all of the above
  store.ts              zustand store, undo/redo, localStorage persistence
  components/           canvas, cards, inspector, toolbar, dialogs
```

The structure is authoritative in one place: each node holds an ordered `children` list,
and parents are derived from it on import. Positions are never stored — they are
recomputed from the tree on every render, so the map cannot drift out of tidy.

## Reading a map back

Every path from the goal to a deliverable is one sentence, and the inspector prints it:

> In order to **grow paid subscribers to one million**, **subscribers we already
> have** will **keep the queue full, so a disc is always in the post**. We are betting
> that **Cinematch** makes that happen.

If the sentence does not hold together, the branch does not either. That is the fastest
review the technique offers, so it is built into the UI rather than left to the reader.

## Keyboard

| Key | Action |
| --- | --- |
| `Tab` | Add a child one level to the right |
| `Enter` | Add a sibling below |
| `F2` / double-click | Rename |
| `Delete` | Delete the card and everything under it |
| `↑` `↓` | Previous / next card in the same column |
| `←` `→` | Jump to parent / first child |
| `⌥` `↑` `↓` | Reorder among siblings |
| `Space` | Collapse or expand the branch |
| `⌘Z` / `⇧⌘Z` | Undo / redo |
| `?` | Shortcut list |

## Exports

- **JSON** — the round-trippable format. Import repairs dangling references and
  rebuilds parent pointers rather than refusing the file.
- **Markdown** — nested outline for docs and tickets.
- **CSV** — one row per deliverable carrying its whole chain, so each row is a
  self-contained bet you can paste into a backlog tool.
- **PNG** — the whole map at its full extent, not just what is on screen.

## Not done yet

- No multi-user editing, and no persistence beyond `localStorage` — no sync, no
  cross-device, no history older than the current undo stack.
- No offline service worker. Hosted copies need the network for the first load;
  `dist-single/index.html` needs it never.
- Obstructing impacts are modelled and styled but do not yet roll up into the goal's
  progress read-out.
- Deliverables can only hang off one impact. Real programmes sometimes have one
  deliverable serving two branches; the graph library would handle it, the tree model
  currently would not.

The React Flow attribution in the corner is deliberate — the library is MIT and asks
politely that it stay.
