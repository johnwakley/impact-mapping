import { Fragment, useEffect, useRef } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { trapTab } from '../model/keys.ts'
import { KIND_META } from '../model/schema.ts'
import { countByKind } from '../model/tree.ts'
import { useStore } from '../store.ts'
import { toast } from '../toast.ts'
import { Close, Plus, Trash } from './icons.tsx'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface DialogProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function Dialog({ title, onClose, children, footer }: DialogProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  // Take focus on open and give it back on close, so the keyboard lands in the
  // dialog rather than staying on the toolbar button behind the overlay.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.focus()
    return () => previous?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      // aria-modal promises the page behind is inert, so Tab must not walk out
      // of the dialog into it: it wraps from the last control to the first.
      const dialog = ref.current
      if (e.key !== 'Tab' || !dialog) return
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (item) => item.getClientRects().length > 0,
      )
      const next = trapTab(items.indexOf(document.activeElement as HTMLElement), items.length, e.shiftKey)
      if (items.length === 0) e.preventDefault()
      else if (next !== null) {
        e.preventDefault()
        items[next].focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="dialog__head">
          <span>{title}</span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="btn btn--icon"
            onClick={onClose}
            aria-label="Close"
          >
            <Close size={15} />
          </button>
        </div>
        <div className="dialog__body">{children}</div>
        {footer && <div className="dialog__foot">{footer}</div>}
      </div>
    </div>
  )
}

export function MapsDialog({ onClose }: { onClose: () => void }): ReactElement {
  const maps = useStore((s) => s.maps)
  const order = useStore((s) => s.order)
  const activeId = useStore((s) => s.activeId)
  const setActiveMap = useStore((s) => s.setActiveMap)
  const newMap = useStore((s) => s.newMap)
  const duplicateMap = useStore((s) => s.duplicateMap)
  const deleteMap = useStore((s) => s.deleteMap)
  const addExampleMaps = useStore((s) => s.addExampleMaps)

  return (
    <Dialog
      title="Maps"
      onClose={onClose}
      footer={
        <>
          <span
            style={{ flex: 1, fontSize: 12, color: 'var(--text-faint)', alignSelf: 'center' }}
          >
            One goal per map — that is the method, not a limitation of the tool.
          </span>
          <button
            type="button"
            className="btn btn--outline"
            title="Put back any built-in example maps you have deleted"
            onClick={() => {
              const added = addExampleMaps()
              toast(
                added
                  ? `Added ${added} example map${added === 1 ? '' : 's'}.`
                  : 'Every example map is already here.',
              )
            }}
          >
            Examples
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              newMap()
              onClose()
            }}
          >
            <Plus size={14} /> New map
          </button>
        </>
      }
    >
      {order
        .filter((id) => maps[id])
        .map((id) => {
          const map = maps[id]
          const counts = countByKind(map)
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                className={`map-row ${id === activeId ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveMap(id)
                  onClose()
                }}
              >
                <span className="map-row__name">{map.name || 'Untitled map'}</span>
                <span className="map-row__meta">
                  {counts.actor} {KIND_META.actor.plural.toLowerCase()} ·{' '}
                  {counts.deliverable} {KIND_META.deliverable.plural.toLowerCase()} ·{' '}
                  {new Date(map.updatedAt).toLocaleDateString()}
                </span>
              </button>
              <button
                type="button"
                className="btn btn--icon"
                title="Duplicate"
                aria-label={`Duplicate ${map.name}`}
                onClick={() => duplicateMap(id)}
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                className="btn btn--icon btn--danger"
                title={order.length <= 1 ? 'The last map cannot be deleted' : 'Delete'}
                aria-label={`Delete ${map.name}`}
                disabled={order.length <= 1}
                onClick={() => {
                  if (window.confirm(`Delete “${map.name}” for good?`)) deleteMap(id)
                }}
              >
                <Trash size={14} />
              </button>
            </div>
          )
        })}
      {/* The link back to the appliedvibe.ai archive this tool is published in. */}
      <div className="maps__sep" role="separator" />
      <a
        className="map-row map-row--external"
        href="https://blog.appliedvibe.ai/"
        target="_blank"
        rel="noopener"
        aria-label="More experiments at appliedvibe.ai (opens in a new tab)"
      >
        <span className="map-row__name">More experiments at appliedvibe.ai</span>
        <span className="map-row__meta" aria-hidden="true">
          ↗
        </span>
      </a>
    </Dialog>
  )
}

const SHORTCUTS: Array<[string, Array<[ReactNode, string]>]> = [
  [
    'Building the map',
    [
      [<kbd key="tab">Tab</kbd>, 'Add a child one level to the right'],
      [<kbd key="enter">Enter</kbd>, 'Add a sibling below'],
      [<kbd key="f2">F2</kbd>, 'Rename (or double-click the card)'],
      [<kbd key="del">Delete</kbd>, 'Delete the card and everything under it'],
      [
        <>
          <kbd>⌥</kbd> <kbd>↑</kbd> <kbd>↓</kbd>
        </>,
        'Reorder among siblings',
      ],
    ],
  ],
  [
    'Moving around',
    [
      [
        <>
          <kbd>↑</kbd> <kbd>↓</kbd>
        </>,
        'Previous / next card in the same column',
      ],
      [<kbd key="left">←</kbd>, 'Jump to the parent'],
      [<kbd key="right">→</kbd>, 'Jump to the first child'],
      [<kbd key="space">Space</kbd>, 'Collapse or expand the branch'],
    ],
  ],
  [
    'Everything else',
    [
      [
        <>
          <kbd>⌘</kbd> <kbd>Z</kbd>
        </>,
        'Undo',
      ],
      [
        <>
          <kbd>⇧</kbd> <kbd>⌘</kbd> <kbd>Z</kbd>
        </>,
        'Redo',
      ],
      [<kbd key="q">?</kbd>, 'This list'],
      [<kbd key="esc">Esc</kbd>, 'Close a dialog or stop renaming'],
    ],
  ],
]

export function ShortcutsDialog({ onClose }: { onClose: () => void }): ReactElement {
  return (
    <Dialog title="Keyboard shortcuts" onClose={onClose}>
      <table className="keys">
        <tbody>
          {SHORTCUTS.map(([section, rows]) => (
            <Fragment key={section}>
              <tr>
                <th colSpan={2}>{section}</th>
              </tr>
              {rows.map(([keys, description], i) => (
                <tr key={`${section}-${i}`}>
                  <td>{keys}</td>
                  <td>{description}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      <div className="note" style={{ marginTop: 18 }}>
        The map is a tree with four typed levels, so the keyboard can do all of it:
        <strong> Tab</strong> to go deeper, <strong>Enter</strong> to add another at the
        same level. Drag a card onto another branch to reparent it — only legal moves
        stick.
      </div>
    </Dialog>
  )
}
