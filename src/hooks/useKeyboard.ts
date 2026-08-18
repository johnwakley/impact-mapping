import { useEffect, useRef } from 'react'
import type { Placement } from '../model/layout.ts'
import { visibleIds } from '../model/tree.ts'
import { useStore } from '../store.ts'

const TEXT_ENTRY = /^(INPUT|TEXTAREA|SELECT)$/

/**
 * Whole-map keyboard driving. Up/down move within a *column* rather than within
 * a sibling list, because that is what the eye does on an impact map — you scan
 * a level, not a branch.
 */
export function useKeyboard(placements: Record<string, Placement>, enabled: boolean): void {
  const placementsRef = useRef(placements)
  placementsRef.current = placements
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!enabledRef.current) return
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || TEXT_ENTRY.test(target.tagName))) return

      const s = useStore.getState()
      if (s.editingId) return

      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) s.redo()
        else s.undo()
        return
      }
      if (mod && key === 'y') {
        e.preventDefault()
        s.redo()
        return
      }
      if (mod) return

      const map = s.maps[s.activeId]
      const id = s.selectedId
      const node = id ? map.nodes[id] : undefined
      if (!id || !node) return

      const column = (): string[] =>
        visibleIds(map)
          .filter((other) => map.nodes[other].kind === node.kind)
          .sort(
            (a, b) =>
              (placementsRef.current[a]?.y ?? 0) - (placementsRef.current[b]?.y ?? 0),
          )

      const step = (delta: number): void => {
        const list = column()
        const next = list[list.indexOf(id) + delta]
        if (next) s.select(next)
      }

      switch (e.key) {
        case 'Tab':
          e.preventDefault()
          s.addChild(id)
          break
        case 'Enter':
          e.preventDefault()
          if (!s.addSibling(id)) s.addChild(id)
          break
        case 'F2':
          e.preventDefault()
          s.beginEditing(id)
          break
        case ' ':
          e.preventDefault()
          s.toggleCollapse(id)
          break
        case 'Backspace':
        case 'Delete':
          e.preventDefault()
          s.deleteNode(id)
          break
        case 'ArrowUp':
          e.preventDefault()
          if (e.altKey) s.moveWithinSiblings(id, -1)
          else step(-1)
          break
        case 'ArrowDown':
          e.preventDefault()
          if (e.altKey) s.moveWithinSiblings(id, 1)
          else step(1)
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (node.parent) s.select(node.parent)
          break
        case 'ArrowRight': {
          e.preventDefault()
          if (!node.children.length) break
          if (node.collapsed) s.toggleCollapse(id)
          s.select(node.children[0])
          break
        }
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
