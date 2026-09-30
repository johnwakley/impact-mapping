import { useEffect, useRef } from 'react'
import { controlOwnsKey, isTextEntry } from '../model/keys.ts'
import type { FocusTarget } from '../model/keys.ts'
import type { Placement } from '../model/layout.ts'
import { visibleIds } from '../model/tree.ts'
import { useStore } from '../store.ts'

/** Describe the focused element for the pure rules in model/keys.ts. */
function describe(el: HTMLElement | null): FocusTarget {
  // A key on an icon inside a button belongs to the button.
  const control = el?.closest<HTMLElement>('button, a[href], input, textarea, select, summary, [role]') ?? el
  return {
    tag: control?.tagName ?? 'BODY',
    role: control?.getAttribute('role') ?? null,
    inputType: control instanceof HTMLInputElement ? control.type.toLowerCase() : null,
    editable: el?.isContentEditable ?? false,
    href: control instanceof HTMLAnchorElement && control.hasAttribute('href'),
  }
}

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
      const focused = describe(target)
      if (isTextEntry(focused)) return
      // Keys pressed inside a dialog belong to it. Without this, Tab in the Maps
      // dialog added a child card behind it instead of moving focus.
      if (target?.closest('[role="dialog"]')) return

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
      // A focused control keeps the keys it uses: Space and Enter press a
      // toolbar button rather than toggling or adding a card, and Tab moves
      // focus. Keys it has no use for (the arrows, Delete, F2) still drive the
      // selection, so clicking Undo does not strand the keyboard.
      if (controlOwnsKey(e.key, focused)) return

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
