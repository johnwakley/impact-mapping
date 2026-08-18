import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ImpactMap, MapNode } from '../types.ts'
import { KIND_META, KIND_ORDER } from './schema.ts'
import { layoutMap } from './layout.ts'
import { goalProgress } from './metric.ts'
import { findDropTarget } from './drop.ts'
import { fromJson, toCsv, toJson, toMarkdown } from './io.ts'
import {
  SAMPLE_SPECS,
  allSampleMaps,
  sampleMap,
  withMissingSamples,
  withoutRetiredSamples,
} from './sample.ts'
import { ancestors, assumptionFor, countByKind, descendants, visibleIds } from './tree.ts'

/**
 * These cover the parts a browser cannot easily assert: that the tree stays a
 * legal impact map, that the layout never overlaps two cards in a column, and
 * that an exported file comes back as the same map.
 *
 *   node --test src/model/
 */

/**
 * Tests derive the nodes they need from the tree's shape rather than naming ids
 * from whichever example ships first. Content changes; structure does not.
 */
function ofKind<K extends MapNode['kind']>(
  map: ImpactMap,
  kind: K,
): Extract<MapNode, { kind: K }>[] {
  return Object.values(map.nodes).filter(
    (n): n is Extract<MapNode, { kind: K }> => n.kind === kind,
  )
}

function deliverableUnder(map: ImpactMap, direction: 'support' | 'obstruct') {
  return ofKind(map, 'deliverable').find((d) => {
    const parent = d.parent ? map.nodes[d.parent] : undefined
    return parent?.kind === 'impact' && parent.direction === direction
  })
}

function collapse(map: ImpactMap, id: string): ImpactMap {
  const next = structuredClone(map)
  next.nodes[id].collapsed = true
  return next
}

describe('sample map', () => {
  const map = sampleMap()

  it('is a well-formed tree', () => {
    assert.equal(map.nodes[map.rootId].kind, 'goal')
    assert.equal(map.nodes[map.rootId].parent, null)
    for (const node of Object.values(map.nodes)) {
      for (const childId of node.children) {
        assert.ok(map.nodes[childId], `missing child ${childId}`)
        assert.equal(map.nodes[childId].parent, node.id)
      }
    }
  })

  it('only nests legal levels', () => {
    for (const node of Object.values(map.nodes)) {
      const expected = KIND_META[node.kind].childKind
      for (const childId of node.children) {
        assert.equal(map.nodes[childId].kind, expected)
      }
    }
  })

  it('reaches every level', () => {
    const counts = countByKind(map)
    for (const kind of KIND_ORDER) assert.ok(counts[kind] > 0, `no ${kind}`)
  })

  it('carries at least one obstruction', () => {
    const obstructing = Object.values(map.nodes).filter(
      (n): n is Extract<MapNode, { kind: 'impact' }> =>
        n.kind === 'impact' && n.direction === 'obstruct',
    )
    assert.ok(obstructing.length >= 1)
  })
})

describe('every built-in map', () => {
  const maps = allSampleMaps()

  it('ships one map per spec, with unique ids', () => {
    assert.equal(maps.length, SAMPLE_SPECS.length)
    assert.ok(maps.length >= 4, 'expected at least four worked examples')
    const ids = maps.map((map) => map.id)
    assert.equal(new Set(ids).size, ids.length, 'map ids must be unique')
    const names = maps.map((map) => map.name)
    assert.equal(new Set(names).size, names.length, 'map names must be unique')
  })

  for (const map of maps) {
    describe(map.name, () => {
      it('is a well-formed tree rooted in a goal', () => {
        assert.equal(map.nodes[map.rootId].kind, 'goal')
        assert.equal(map.nodes[map.rootId].parent, null)
        for (const node of Object.values(map.nodes)) {
          for (const childId of node.children) {
            assert.ok(map.nodes[childId], `missing child ${childId}`)
            assert.equal(map.nodes[childId].parent, node.id)
          }
        }
      })

      it('only nests legal levels', () => {
        for (const node of Object.values(map.nodes)) {
          const expected = KIND_META[node.kind].childKind
          for (const childId of node.children) {
            assert.equal(map.nodes[childId].kind, expected)
          }
        }
      })

      it('reaches a deliverable down every branch', () => {
        for (const node of Object.values(map.nodes)) {
          if (node.kind === 'deliverable') continue
          assert.ok(node.children.length > 0, `"${node.title}" is a dead end`)
        }
      })

      it('gives every node a title', () => {
        for (const node of Object.values(map.nodes)) {
          assert.ok(node.title.trim().length > 0, `untitled ${node.kind}`)
        }
      })

      it('sets a measurable goal', () => {
        const root = map.nodes[map.rootId]
        assert.equal(root.kind, 'goal')
        if (root.kind !== 'goal') return
        assert.ok(root.metric, 'goal has no metric')
        assert.ok(root.target !== undefined, 'goal has no target')
        assert.ok(root.deadline, 'goal has no deadline')
        assert.ok(goalProgress(root).measurable, 'goal progress is not measurable')
      })

      it('lays out without overlapping a column', () => {
        const layout = layoutMap(map)
        for (const kind of KIND_ORDER) {
          const stack = Object.entries(layout.placements)
            .filter(([id]) => map.nodes[id].kind === kind)
            .map(([, place]) => place)
            .sort((a, b) => a.y - b.y)
          for (let i = 1; i < stack.length; i += 1) {
            assert.ok(stack[i].y >= stack[i - 1].y + stack[i - 1].height)
          }
        }
      })

      it('round-trips through export and import', () => {
        const restored = fromJson(toJson(map))
        assert.deepEqual(
          Object.keys(restored.nodes).sort(),
          Object.keys(map.nodes).sort(),
        )
      })
    })
  }

  it('carries at least one obstruction across the set', () => {
    const obstructions = maps.flatMap((map) =>
      Object.values(map.nodes).filter(
        (n) => n.kind === 'impact' && n.direction === 'obstruct',
      ),
    )
    assert.ok(obstructions.length >= 3, 'examples should show obstructing actors')
  })
})

describe('layout', () => {
  const map = sampleMap()
  const layout = layoutMap(map)

  it('pins every node to its own column', () => {
    for (const [id, place] of Object.entries(layout.placements)) {
      const column = layout.columns[KIND_ORDER.indexOf(map.nodes[id].kind)]
      assert.equal(place.x, column.x)
      assert.equal(place.width, column.width)
    }
  })

  it('never overlaps two cards in the same column', () => {
    for (const kind of KIND_ORDER) {
      const stack = Object.entries(layout.placements)
        .filter(([id]) => map.nodes[id].kind === kind)
        .map(([, place]) => place)
        .sort((a, b) => a.y - b.y)
      for (let i = 1; i < stack.length; i += 1) {
        assert.ok(
          stack[i].y >= stack[i - 1].y + stack[i - 1].height,
          `${kind} cards overlap at y=${stack[i].y}`,
        )
      }
    }
  })

  it('keeps a parent inside the span of its children', () => {
    for (const node of Object.values(map.nodes)) {
      if (!node.children.length) continue
      const parent = layout.placements[node.id]
      const first = layout.placements[node.children[0]]
      const last = layout.placements[node.children[node.children.length - 1]]
      const centre = parent.y + parent.height / 2
      assert.ok(centre >= first.y - 1, `${node.title} sits above its children`)
      assert.ok(centre <= last.y + last.height + 1, `${node.title} sits below its children`)
    }
  })

  it('drops collapsed branches out of the layout', () => {
    const actorId = map.nodes[map.rootId].children[0]
    const hidden = descendants(map, actorId)
    const collapsed = layoutMap(collapse(map, actorId))
    assert.ok(hidden.length > 0)
    for (const id of hidden) assert.equal(collapsed.placements[id], undefined)
    assert.ok(collapsed.placements[actorId])
  })
})

describe('visibility', () => {
  const map = sampleMap()

  it('hides descendants of a collapsed node', () => {
    const actorId = map.nodes[map.rootId].children[0]
    const visible = new Set(visibleIds(collapse(map, actorId)))
    assert.ok(visible.has(actorId))
    for (const id of descendants(map, actorId)) assert.ok(!visible.has(id))
  })
})

describe('json round trip', () => {
  const map = sampleMap()

  it('restores the same structure', () => {
    const restored = fromJson(toJson(map))
    assert.equal(restored.rootId, map.rootId)
    assert.deepEqual(Object.keys(restored.nodes).sort(), Object.keys(map.nodes).sort())
    for (const id of Object.keys(map.nodes)) {
      assert.equal(restored.nodes[id].title, map.nodes[id].title)
      assert.deepEqual(restored.nodes[id].children, map.nodes[id].children)
      assert.equal(restored.nodes[id].parent, map.nodes[id].parent)
    }
  })

  it('repairs a dangling child reference', () => {
    const broken = structuredClone(map)
    broken.nodes[broken.rootId].children.push('does-not-exist')
    const restored = fromJson(JSON.stringify({ format: 'impact-map', version: 1, map: broken }))
    assert.ok(!restored.nodes[restored.rootId].children.includes('does-not-exist'))
  })

  it('drops nodes that nothing points at', () => {
    const orphaned = structuredClone(map)
    orphaned.nodes['stray'] = {
      id: 'stray',
      kind: 'actor',
      title: 'Detached',
      parent: null,
      children: [],
      actorKind: 'user',
    }
    const restored = fromJson(
      JSON.stringify({ format: 'impact-map', version: 1, map: orphaned }),
    )
    assert.equal(restored.nodes['stray'], undefined)
  })

  it('rejects files that are not impact maps', () => {
    assert.throws(() => fromJson('{"format":"something-else"}'), /not an impact map/)
    assert.throws(() => fromJson('nonsense'), /not valid JSON/)
  })
})

describe('exports', () => {
  const map = sampleMap()

  it('writes one CSV row per deliverable', () => {
    const deliverables = Object.values(map.nodes).filter((n) => n.kind === 'deliverable')
    const lines = toCsv(map).split('\n')
    assert.equal(lines.length, deliverables.length + 1)
    assert.match(lines[0], /^Goal,Actor,/)
  })

  it('carries the whole chain on every CSV row', () => {
    const goalTitle = map.nodes[map.rootId].title
    const actorTitles = ofKind(map, 'actor').map((a) => a.title)
    const rows = toCsv(map).split('\n').slice(1)
    assert.ok(rows.length > 0)
    for (const row of rows) {
      assert.ok(row.includes(goalTitle), `row lost its goal: ${row}`)
      assert.ok(
        actorTitles.some((title) => row.includes(title)),
        `row lost its actor: ${row}`,
      )
    }
  })

  it('writes every actor and deliverable into the markdown', () => {
    const md = toMarkdown(map)
    for (const node of Object.values(map.nodes)) {
      if (node.kind === 'actor' || node.kind === 'deliverable') {
        assert.ok(md.includes(node.title), `markdown missing "${node.title}"`)
      }
    }
  })
})

describe('assumptions', () => {
  const map = sampleMap()

  it('reads a deliverable back as its full chain', () => {
    const deliverable = deliverableUnder(map, 'support')
    assert.ok(deliverable, 'the first example needs a supporting branch')
    const bet = assumptionFor(map, deliverable.id)
    assert.ok(bet)
    const chain = ancestors(map, deliverable.id)
    assert.equal(bet.goal, map.nodes[map.rootId].title)
    assert.equal(bet.actor, chain.find((n) => n.kind === 'actor')?.title)
    assert.equal(bet.impact, chain.find((n) => n.kind === 'impact')?.title)
    assert.equal(bet.deliverable, deliverable.title)
    assert.equal(bet.obstructing, false)
  })

  it('flags a chain hanging off an obstruction', () => {
    const deliverable = deliverableUnder(map, 'obstruct')
    assert.ok(deliverable, 'the first example needs an obstructing branch')
    assert.equal(assumptionFor(map, deliverable.id)?.obstructing, true)
  })

  it('has nothing to say about non-deliverables', () => {
    assert.equal(assumptionFor(map, ofKind(map, 'actor')[0].id), null)
    assert.equal(assumptionFor(map, map.rootId), null)
  })

  it('walks up to the goal through one node per level', () => {
    const deliverable = ofKind(map, 'deliverable')[0]
    const trail = ancestors(map, deliverable.id)
    assert.deepEqual(
      trail.map((n) => n.kind),
      ['goal', 'actor', 'impact'],
    )
    assert.equal(trail[0].id, map.rootId)
  })
})

describe('drop targeting', () => {
  const map = sampleMap()
  const layout = layoutMap(map)
  const dragged = ofKind(map, 'deliverable')[0]
  const elsewhere = ofKind(map, 'impact').filter((i) => i.id !== dragged.parent)

  it('lands a deliverable in the branch it was dropped into', () => {
    const target = elsewhere[0]
    const place = layout.placements[target.id]
    const found = findDropTarget(map, layout, dragged, {
      x: place.x,
      y: place.y + place.height / 2,
    })
    assert.equal(found?.parentId, target.id)
  })

  it('will not hang a deliverable off a goal', () => {
    const root = layout.placements[map.rootId]
    const found = findDropTarget(map, layout, dragged, { x: root.x, y: root.y })
    assert.equal(map.nodes[found!.parentId].kind, 'impact')
  })

  it('has nowhere to put the goal itself', () => {
    assert.equal(findDropTarget(map, layout, map.nodes[map.rootId], { x: 0, y: 0 }), null)
  })

  it('picks an insertion index from the drop height', () => {
    const target = elsewhere.find((i) => i.children.length >= 2)
    assert.ok(target, 'need an impact with two deliverables to test ordering')
    const firstChild = layout.placements[target.children[0]]
    const found = findDropTarget(map, layout, dragged, {
      x: firstChild.x,
      y: firstChild.y,
    })
    assert.equal(found?.parentId, target.id)
    assert.equal(found?.index, 0)
  })
})

describe('seeding a returning browser', () => {
  it('adds the maps a browser is missing', () => {
    const only = sampleMap()
    const seeded = withMissingSamples({ [only.id]: only }, [only.id])
    assert.equal(seeded.added, SAMPLE_SPECS.length - 1)
    assert.equal(Object.keys(seeded.maps).length, SAMPLE_SPECS.length)
    for (const spec of SAMPLE_SPECS) assert.ok(seeded.maps[spec.id], `missing ${spec.id}`)
  })

  it('never overwrites a built-in map the user has edited', () => {
    const edited = sampleMap()
    edited.name = 'My renamed copy'
    edited.nodes[edited.rootId].title = 'A goal I rewrote myself'

    const seeded = withMissingSamples({ [edited.id]: edited }, [edited.id])
    assert.equal(seeded.maps[edited.id].name, 'My renamed copy')
    assert.equal(
      seeded.maps[edited.id].nodes[edited.rootId].title,
      'A goal I rewrote myself',
    )
  })

  it('keeps existing order and appends the new maps after it', () => {
    const only = sampleMap()
    const seeded = withMissingSamples({ [only.id]: only }, [only.id])
    assert.equal(seeded.order[0], only.id)
    assert.equal(seeded.order.length, SAMPLE_SPECS.length)
    assert.equal(new Set(seeded.order).size, seeded.order.length)
  })

  it('is a no-op once everything is present', () => {
    const all = Object.fromEntries(allSampleMaps().map((map) => [map.id, map]))
    const order = Object.keys(all)
    const seeded = withMissingSamples(all, order)
    assert.equal(seeded.added, 0)
    assert.deepEqual(seeded.order, order)
  })

  it('leaves maps the user made alone', () => {
    const mine = { ...sampleMap(), id: 'mine-1', name: 'Mine' }
    const seeded = withMissingSamples({ 'mine-1': mine }, ['mine-1'])
    assert.equal(seeded.maps['mine-1'].name, 'Mine')
    assert.equal(seeded.order[0], 'mine-1')
    assert.equal(seeded.added, SAMPLE_SPECS.length)
  })
})

describe('retiring an old built-in map', () => {
  /** A map exactly as the previous release shipped it: never opened, never edited. */
  function asShipped(id: string, name: string): ImpactMap {
    const stamp = '2026-01-01T00:00:00.000Z'
    return { ...sampleMap(), id, name, createdAt: stamp, updatedAt: stamp }
  }

  const RETIRED_ID = 'sample'
  const RETIRED_NAME = 'Grow weekly active teams'

  it('removes a retired map that was never touched', () => {
    const untouched = asShipped(RETIRED_ID, RETIRED_NAME)
    const result = withoutRetiredSamples({ [RETIRED_ID]: untouched }, [RETIRED_ID])
    assert.equal(result.removed, 1)
    assert.equal(result.maps[RETIRED_ID], undefined)
    assert.deepEqual(result.order, [])
  })

  it('keeps a retired map that has been edited', () => {
    const edited = asShipped(RETIRED_ID, RETIRED_NAME)
    edited.updatedAt = '2026-06-01T00:00:00.000Z'
    const result = withoutRetiredSamples({ [RETIRED_ID]: edited }, [RETIRED_ID])
    assert.equal(result.removed, 0)
    assert.ok(result.maps[RETIRED_ID], 'edited work must survive the upgrade')
    assert.deepEqual(result.order, [RETIRED_ID])
  })

  it('keeps a retired map that has been renamed', () => {
    const renamed = asShipped(RETIRED_ID, 'My version of it')
    const result = withoutRetiredSamples({ [RETIRED_ID]: renamed }, [RETIRED_ID])
    assert.equal(result.removed, 0)
    assert.equal(result.maps[RETIRED_ID].name, 'My version of it')
  })

  it('leaves maps that were never built-in alone', () => {
    const mine = { ...sampleMap(), id: 'mine', name: 'Mine' }
    const result = withoutRetiredSamples({ mine }, ['mine'])
    assert.equal(result.removed, 0)
    assert.ok(result.maps['mine'])
  })

  it('takes a previous-release library to the current one', () => {
    // What an existing browser actually holds: the two retired examples, one of
    // them edited, plus a map of the user's own.
    const untouched = asShipped(RETIRED_ID, RETIRED_NAME)
    const edited = asShipped('sample-first-deploy', 'New engineers shipping in week one')
    edited.updatedAt = '2026-06-01T00:00:00.000Z'
    const mine = { ...sampleMap(), id: 'mine', name: 'Mine' }

    const before = {
      [RETIRED_ID]: untouched,
      'sample-first-deploy': edited,
      mine,
    }
    const order = [RETIRED_ID, 'sample-first-deploy', 'mine']

    const pruned = withoutRetiredSamples(before, order)
    const after = withMissingSamples(pruned.maps, pruned.order)

    assert.equal(after.maps[RETIRED_ID], undefined, 'untouched example should go')
    assert.ok(after.maps['sample-first-deploy'], 'edited example should stay')
    assert.ok(after.maps['mine'], 'the user map should stay')
    for (const spec of SAMPLE_SPECS) {
      assert.ok(after.maps[spec.id], `current example ${spec.id} should be present`)
    }
    assert.equal(new Set(after.order).size, after.order.length)
  })
})
