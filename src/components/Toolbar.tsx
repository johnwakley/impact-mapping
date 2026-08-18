import { useReactFlow } from '@xyflow/react'
import { useRef } from 'react'
import type { ReactElement } from 'react'
import type { DeliverableStatus } from '../types.ts'
import { STATUS_LABEL, STATUS_ORDER } from '../model/schema.ts'
import { download, fromJson, readFile, slugify, toCsv, toJson, toMarkdown } from '../model/io.ts'
import { exportPng } from '../model/exportImage.ts'
import { useActiveMap, useStore } from '../store.ts'
import { toast } from '../toast.ts'
import { Menu, MenuItem, MenuSeparator } from './Menu.tsx'
import { SaveIndicator } from './SaveIndicator.tsx'
import {
  Collapse,
  Download,
  Expand,
  Filter,
  Keyboard,
  Layers,
  Redo,
  Sidebar,
  Undo,
  Upload,
} from './icons.tsx'

interface Props {
  onOpenMaps: () => void
  onOpenShortcuts: () => void
}

export function Toolbar({ onOpenMaps, onOpenShortcuts }: Props): ReactElement {
  const map = useActiveMap()
  const renameMap = useStore((s) => s.renameMap)
  const adoptMap = useStore((s) => s.adoptMap)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const setAllCollapsed = useStore((s) => s.setAllCollapsed)
  const statusFilter = useStore((s) => s.statusFilter)
  const setStatusFilter = useStore((s) => s.setStatusFilter)
  const inspectorOpen = useStore((s) => s.inspectorOpen)
  const setInspectorOpen = useStore((s) => s.setInspectorOpen)
  const { getNodes } = useReactFlow()

  const fileRef = useRef<HTMLInputElement>(null)
  const base = slugify(map.name)

  const toggleStatus = (status: DeliverableStatus): void => {
    const current = statusFilter ?? [...STATUS_ORDER]
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status]
    setStatusFilter(next.length === STATUS_ORDER.length ? null : next)
  }

  const onImport = async (file: File | undefined): Promise<void> => {
    if (!file) return
    try {
      const imported = fromJson(await readFile(file))
      adoptMap(imported)
      toast(`Imported “${imported.name}”.`)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Import failed.', 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onExportPng = async (): Promise<void> => {
    try {
      await exportPng(
        getNodes().filter((n) => n.type === 'card'),
        `${base}.png`,
      )
      toast('Exported PNG.')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'PNG export failed.', 'error')
    }
  }

  return (
    <header className="header">
      <div className="header__brand">
        Impact Mapping <small>Why · Who · How · What</small>
      </div>

      <div className="divider" />

      <input
        className="input"
        style={{ width: 260 }}
        value={map.name}
        aria-label="Map name"
        onChange={(e) => renameMap(map.id, e.target.value)}
      />

      <button type="button" className="btn" onClick={onOpenMaps} title="All maps">
        <Layers size={15} /> Maps
      </button>

      <div className="header__spacer" />

      <SaveIndicator />

      <div className="divider" />

      <div className="header__group">
        <button
          type="button"
          className="btn btn--icon"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (⌘Z)"
          aria-label="Undo"
        >
          <Undo size={15} />
        </button>
        <button
          type="button"
          className="btn btn--icon"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (⇧⌘Z)"
          aria-label="Redo"
        >
          <Redo size={15} />
        </button>
      </div>

      <div className="divider" />

      <div className="header__group">
        <button
          type="button"
          className="btn btn--icon"
          onClick={() => setAllCollapsed(true)}
          title="Collapse every branch"
          aria-label="Collapse every branch"
        >
          <Collapse size={15} />
        </button>
        <button
          type="button"
          className="btn btn--icon"
          onClick={() => setAllCollapsed(false)}
          title="Expand every branch"
          aria-label="Expand every branch"
        >
          <Expand size={15} />
        </button>
      </div>

      <Menu
        closeOnSelect={false}
        title="Filter deliverables by status"
        label={
          <>
            <Filter size={15} />
            {statusFilter ? `${statusFilter.length} of ${STATUS_ORDER.length}` : 'All'}
          </>
        }
      >
        {STATUS_ORDER.map((status) => {
          const on = !statusFilter || statusFilter.includes(status)
          return (
            <MenuItem key={status} onClick={() => toggleStatus(status)}>
              <span style={{ opacity: on ? 1 : 0.45 }}>
                {on ? '✓' : '  '} {STATUS_LABEL[status]}
              </span>
            </MenuItem>
          )
        })}
        <MenuSeparator />
        <MenuItem onClick={() => setStatusFilter(null)}>Show everything</MenuItem>
      </Menu>

      <div className="divider" />

      <button
        type="button"
        className="btn"
        onClick={() => fileRef.current?.click()}
        title="Import a map JSON file"
      >
        <Upload size={15} /> Import
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => void onImport(e.target.files?.[0])}
      />

      <Menu
        title="Export this map"
        label={
          <>
            <Download size={15} /> Export
          </>
        }
      >
        <MenuItem
          hint="round-trips"
          onClick={() => download(`${base}.json`, toJson(map), 'application/json')}
        >
          JSON
        </MenuItem>
        <MenuItem
          hint="docs & tickets"
          onClick={() => download(`${base}.md`, toMarkdown(map), 'text/markdown')}
        >
          Markdown outline
        </MenuItem>
        <MenuItem
          hint="one row per bet"
          onClick={() => download(`${base}.csv`, toCsv(map), 'text/csv')}
        >
          Deliverables CSV
        </MenuItem>
        <MenuSeparator />
        <MenuItem hint="whole map" onClick={() => void onExportPng()}>
          PNG image
        </MenuItem>
      </Menu>

      <div className="divider" />

      <button
        type="button"
        className="btn btn--icon"
        onClick={onOpenShortcuts}
        title="Keyboard shortcuts (?)"
        aria-label="Keyboard shortcuts"
      >
        <Keyboard size={15} />
      </button>
      <button
        type="button"
        className="btn btn--icon"
        onClick={() => setInspectorOpen(!inspectorOpen)}
        title={inspectorOpen ? 'Hide the inspector' : 'Show the inspector'}
        aria-label={inspectorOpen ? 'Hide the inspector' : 'Show the inspector'}
        aria-pressed={inspectorOpen}
      >
        <Sidebar size={15} />
      </button>
    </header>
  )
}
