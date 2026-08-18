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
} from './sample.ts'
import { ancestors, assumptionFor, countByKind, descendants, visibleIds } from './tree.ts'

/**
 * These cover the parts a browser cannot easily assert: that the tree stays a
 * legal impact map, that the layout never overlaps two cards in a column, and
 * that an exported file comes back as the same map.
 *
 *   node --test src/model/
 */

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
    const [, firstRow] = toCsv(map).split('\n')
    assert.match(firstRow, /Grow weekly active teams/)
    assert.match(firstRow, /Team admins/)
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
    const bet = assumptionFor(map, 'd-bulk')
    assert.ok(bet)
    assert.match(bet.goal, /Grow weekly active teams/)
    assert.equal(bet.actor, 'Team admins')
    assert.match(bet.impact, /Invite the rest of their team/)
    assert.equal(bet.obstructing, false)
  })

  it('flags a chain hanging off an obstruction', () => {
    const bet = assumptionFor(map, 'd-defer')
    assert.ok(bet)
    assert.equal(bet.obstructing, true)
  })

  it('has nothing to say about non-deliverables', () => {
    assert.equal(assumptionFor(map, 'a-admins'), null)
  })

  it('walks up to the goal', () => {
    const trail = ancestors(map, 'd-bulk').map((n) => n.id)
    assert.deepEqual(trail, ['goal', 'a-admins', 'i-invite'])
  })
})

describe('drop targeting', () => {
  const map = sampleMap()
  const layout = layoutMap(map)

  it('lands a deliverable in the branch it was dropped into', () => {
    const target = layout.placements['i-daily']
    const found = findDropTarget(map, layout, map.nodes['d-bulk'], {
      x: target.x,
      y: target.y + target.height / 2,
    })
    assert.equal(found?.parentId, 'i-daily')
  })

  it('will not hang a deliverable off a goal', () => {
    const root = layout.placements['goal']
    const found = findDropTarget(map, layout, map.nodes['d-bulk'], {
      x: root.x,
      y: root.y,
    })
    assert.equal(map.nodes[found!.parentId].kind, 'impact')
  })

  it('has nowhere to put the goal itself', () => {
    assert.equal(findDropTarget(map, layout, map.nodes['goal'], { x: 0, y: 0 }), null)
  })

  it('picks an insertion index from the drop height', () => {
    const first = layout.placements['d-digest']
    const found = findDropTarget(map, layout, map.nodes['d-bulk'], {
      x: first.x,
      y: first.y,
    })
    assert.equal(found?.parentId, 'i-daily')
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
