import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  ActorNode,
  DeliverableNode,
  DeliverableStatus,
  GoalNode,
  ImpactMap,
  ImpactNode,
  MapNode,
} from './types.ts'
import { KIND_META, createNode, newId } from './model/schema.ts'
import { descendants, isDescendant, selectionAfterDelete } from './model/tree.ts'
import { allSampleMaps, withMissingSamples } from './model/sample.ts'
import { localMapStorage } from './model/storage.ts'

/** Shape version of the persisted blob. See `migrate` below before changing it. */
const PERSIST_VERSION = 1

/**
 * Bumped when built-in example maps are added. Anyone with saved work gets the
 * new ones seeded in once, without touching maps they made or edited.
 */
const SEED_VERSION = 2

type Editable<T> = Partial<Omit<T, 'id' | 'kind' | 'parent' | 'children'>>
export type NodePatch = Editable<GoalNode> &
  Editable<ActorNode> &
  Editable<ImpactNode> &
  Editable<DeliverableNode>

const HISTORY_LIMIT = 80
/** Consecutive edits to the same field inside this window collapse into one undo step. */
const COALESCE_MS = 700

interface Store {
  maps: Record<string, ImpactMap>
  order: string[]
  activeId: string

  /** Which generation of built-in examples this browser has been given. */
  seedVersion: number

  selectedId: string | null
  editingId: string | null
  inspectorOpen: boolean
  statusFilter: DeliverableStatus[] | null

  past: ImpactMap[]
  future: ImpactMap[]

  active: () => ImpactMap

  select: (id: string | null) => void
  beginEditing: (id: string) => void
  endEditing: () => void
  setInspectorOpen: (open: boolean) => void
  setStatusFilter: (statuses: DeliverableStatus[] | null) => void

  addChild: (parentId: string) => string | null
  addSibling: (id: string) => string | null
  updateNode: (id: string, patch: NodePatch, coalesceKey?: string) => void
  deleteNode: (id: string) => void
  moveWithinSiblings: (id: string, delta: number) => void
  reparent: (id: string, newParentId: string, index?: number) => boolean
  toggleCollapse: (id: string) => void
  setAllCollapsed: (collapsed: boolean) => void

  undo: () => void
  redo: () => void

  /** Re-add any built-in example maps that are missing. Returns how many. */
  addExampleMaps: () => number
  newMap: (name?: string) => string
  adoptMap: (map: ImpactMap) => string
  duplicateMap: (id: string) => string
  renameMap: (id: string, name: string) => void
  deleteMap: (id: string) => void
  setActiveMap: (id: string) => void
}

function blankMap(name = 'Untitled map'): ImpactMap {
  const root = createNode('goal', null) as GoalNode
  const now = new Date().toISOString()
  return {
    id: newId(),
    name,
    rootId: root.id,
    nodes: { [root.id]: root },
    createdAt: now,
    updatedAt: now,
  }
}

let lastCommit = { key: '', at: 0 }

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      /**
       * Every mutation goes through here: snapshot for undo, apply, re-stamp.
       * `coalesceKey` lets a burst of keystrokes land as a single undo step.
       */
      const mutate = (
        recipe: (map: ImpactMap) => void,
        coalesceKey?: string,
      ): void => {
        const state = get()
        const current = state.maps[state.activeId]
        if (!current) return

        const now = Date.now()
        const coalesce =
          coalesceKey !== undefined &&
          coalesceKey === lastCommit.key &&
          now - lastCommit.at < COALESCE_MS
        lastCommit = { key: coalesceKey ?? '', at: now }

        const next: ImpactMap = structuredClone(current)
        recipe(next)
        next.updatedAt = new Date().toISOString()

        set({
          maps: { ...state.maps, [state.activeId]: next },
          past: coalesce
            ? state.past
            : [...state.past, current].slice(-HISTORY_LIMIT),
          future: [],
        })
      }

      const seeded = allSampleMaps()
      const first = seeded[0]

      return {
        maps: Object.fromEntries(seeded.map((map) => [map.id, map])),
        order: seeded.map((map) => map.id),
        activeId: first.id,
        seedVersion: SEED_VERSION,

        selectedId: first.rootId,
        editingId: null,
        inspectorOpen: true,
        statusFilter: null,

        past: [],
        future: [],

        active: () => get().maps[get().activeId],

        select: (id) => set({ selectedId: id, editingId: null }),
        beginEditing: (id) => set({ selectedId: id, editingId: id }),
        endEditing: () => set({ editingId: null }),
        setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
        setStatusFilter: (statusFilter) => set({ statusFilter }),

        addChild: (parentId) => {
          const map = get().active()
          const parent = map.nodes[parentId]
          if (!parent) return null
          const childKind = KIND_META[parent.kind].childKind
          if (!childKind) return null
          const child = createNode(childKind, parentId)
          mutate((draft) => {
            draft.nodes[child.id] = child
            draft.nodes[parentId].children.push(child.id)
            draft.nodes[parentId].collapsed = false
          })
          set({ selectedId: child.id, editingId: child.id })
          return child.id
        },

        addSibling: (id) => {
          const map = get().active()
          const node = map.nodes[id]
          if (!node?.parent) return null
          const sibling = createNode(node.kind, node.parent)
          mutate((draft) => {
            const siblings = draft.nodes[node.parent!].children
            siblings.splice(siblings.indexOf(id) + 1, 0, sibling.id)
            draft.nodes[sibling.id] = sibling
          })
          set({ selectedId: sibling.id, editingId: sibling.id })
          return sibling.id
        },

        updateNode: (id, patch, coalesceKey) => {
          mutate((draft) => {
            const node = draft.nodes[id]
            if (node) Object.assign(node, patch)
          }, coalesceKey)
        },

        deleteNode: (id) => {
          const map = get().active()
          const node = map.nodes[id]
          if (!node || !node.parent) return // the goal is the map; it cannot be deleted
          const nextSelected = selectionAfterDelete(map, id)
          const doomed = [id, ...descendants(map, id)]
          mutate((draft) => {
            const siblings = draft.nodes[node.parent!].children
            siblings.splice(siblings.indexOf(id), 1)
            for (const doomedId of doomed) delete draft.nodes[doomedId]
          })
          set({ selectedId: nextSelected, editingId: null })
        },

        moveWithinSiblings: (id, delta) => {
          const map = get().active()
          const parentId = map.nodes[id]?.parent
          if (!parentId) return
          const siblings = map.nodes[parentId].children
          const from = siblings.indexOf(id)
          const to = from + delta
          if (to < 0 || to >= siblings.length) return
          mutate((draft) => {
            const list = draft.nodes[parentId].children
            list.splice(from, 1)
            list.splice(to, 0, id)
          })
        },

        reparent: (id, newParentId, index) => {
          const map = get().active()
          const node = map.nodes[id]
          const target = map.nodes[newParentId]
          if (!node || !target || !node.parent) return false
          // Levels are typed: a node can only move under a parent of the level above.
          if (KIND_META[target.kind].childKind !== node.kind) return false
          if (newParentId === id || isDescendant(map, id, newParentId)) return false
          mutate((draft) => {
            const from = draft.nodes[node.parent!].children
            from.splice(from.indexOf(id), 1)
            const to = draft.nodes[newParentId].children
            to.splice(index ?? to.length, 0, id)
            draft.nodes[id].parent = newParentId
            draft.nodes[newParentId].collapsed = false
          })
          return true
        },

        toggleCollapse: (id) => {
          mutate((draft) => {
            const node = draft.nodes[id]
            if (node && node.children.length) node.collapsed = !node.collapsed
          })
        },

        setAllCollapsed: (collapsed) => {
          mutate((draft) => {
            for (const node of Object.values(draft.nodes)) {
              // The goal always stays open; collapsing it hides the whole map.
              node.collapsed = node.kind === 'goal' ? false : collapsed
            }
          })
        },

        undo: () => {
          const { past, maps, activeId, future } = get()
          const previous = past[past.length - 1]
          if (!previous) return
          lastCommit = { key: '', at: 0 }
          set({
            past: past.slice(0, -1),
            future: [maps[activeId], ...future].slice(0, HISTORY_LIMIT),
            maps: { ...maps, [activeId]: previous },
            editingId: null,
          })
        },

        redo: () => {
          const { past, maps, activeId, future } = get()
          const next = future[0]
          if (!next) return
          lastCommit = { key: '', at: 0 }
          set({
            past: [...past, maps[activeId]].slice(-HISTORY_LIMIT),
            future: future.slice(1),
            maps: { ...maps, [activeId]: next },
            editingId: null,
          })
        },

        addExampleMaps: () => {
          const { maps, order } = get()
          const seeded = withMissingSamples(maps, order)
          if (!seeded.added) return 0
          set({ maps: seeded.maps, order: seeded.order })
          return seeded.added
        },

        newMap: (name) => {
          const map = blankMap(name)
          set((s) => ({
            maps: { ...s.maps, [map.id]: map },
            order: [...s.order, map.id],
            activeId: map.id,
            selectedId: map.rootId,
            editingId: map.rootId,
            past: [],
            future: [],
          }))
          return map.id
        },

        adoptMap: (map) => {
          const id = map.id && !get().maps[map.id] ? map.id : newId()
          const adopted = { ...map, id }
          set((s) => ({
            maps: { ...s.maps, [id]: adopted },
            order: [...s.order, id],
            activeId: id,
            selectedId: adopted.rootId,
            editingId: null,
            past: [],
            future: [],
          }))
          return id
        },

        duplicateMap: (id) => {
          const source = get().maps[id]
          if (!source) return id
          const copy = structuredClone(source)
          copy.id = newId()
          copy.name = `${source.name} (copy)`
          copy.createdAt = new Date().toISOString()
          copy.updatedAt = copy.createdAt
          set((s) => ({
            maps: { ...s.maps, [copy.id]: copy },
            order: [...s.order, copy.id],
            activeId: copy.id,
            selectedId: copy.rootId,
            past: [],
            future: [],
          }))
          return copy.id
        },

        renameMap: (id, name) =>
          set((s) => {
            const map = s.maps[id]
            if (!map) return s
            return { maps: { ...s.maps, [id]: { ...map, name } } }
          }),

        deleteMap: (id) =>
          set((s) => {
            if (s.order.length <= 1) return s
            const maps = { ...s.maps }
            delete maps[id]
            const order = s.order.filter((mid) => mid !== id)
            const activeId = s.activeId === id ? order[0] : s.activeId
            return {
              maps,
              order,
              activeId,
              selectedId: maps[activeId].rootId,
              past: [],
              future: [],
            }
          }),

        setActiveMap: (id) =>
          set((s) =>
            s.maps[id]
              ? {
                  activeId: id,
                  selectedId: s.maps[id].rootId,
                  editingId: null,
                  past: [],
                  future: [],
                }
              : s,
          ),
      }
    },
    {
      name: 'impact-mapping/v1',
      storage: createJSONStorage(() => localMapStorage),
      version: PERSIST_VERSION,
      // Bumping PERSIST_VERSION without teaching this function how to convert
      // the old shape throws the user's maps away, so keep the two together.
      migrate: (persisted, from) => {
        if (from === PERSIST_VERSION) return persisted
        return persisted
      },
      partialize: (s) => ({
        maps: s.maps,
        order: s.order,
        activeId: s.activeId,
        seedVersion: s.seedVersion,
        inspectorOpen: s.inspectorOpen,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Store>
        const merged: Store = { ...current, ...saved }

        // New built-in examples arrive once, and only if the user has not
        // already got (or deliberately deleted and re-seeded past) them.
        if ((merged.seedVersion ?? 0) < SEED_VERSION) {
          const seeded = withMissingSamples(merged.maps, merged.order)
          merged.maps = seeded.maps
          merged.order = seeded.order
          merged.seedVersion = SEED_VERSION
        }

        // Selection is not persisted, so point it at the restored map's goal.
        const activeId = merged.maps[merged.activeId] ? merged.activeId : merged.order[0]
        return {
          ...merged,
          activeId,
          selectedId: merged.maps[activeId]?.rootId ?? null,
          editingId: null,
          past: [],
          future: [],
        }
      },
    },
  ),
)

/** Selector helper: the node currently selected, if any. */
export function useSelectedNode(): MapNode | null {
  return useStore((s) => {
    const map = s.maps[s.activeId]
    return (s.selectedId && map?.nodes[s.selectedId]) || null
  })
}

export function useActiveMap(): ImpactMap {
  return useStore((s) => s.maps[s.activeId])
}
