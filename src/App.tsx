import { ReactFlowProvider } from '@xyflow/react'
import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { Canvas } from './components/Canvas.tsx'
import { Inspector } from './components/Inspector.tsx'
import { Toolbar } from './components/Toolbar.tsx'
import { Toasts } from './components/Toasts.tsx'
import { MapsDialog, ShortcutsDialog } from './components/Dialogs.tsx'
import { useStore } from './store.ts'

type DialogName = 'maps' | 'shortcuts' | null

export function App(): ReactElement {
  const inspectorOpen = useStore((s) => s.inspectorOpen)
  const [dialog, setDialog] = useState<DialogName>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return
      }
      if (e.key === '?') {
        e.preventDefault()
        setDialog((d) => (d === 'shortcuts' ? null : 'shortcuts'))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <ReactFlowProvider>
      <div className="app">
        <Toolbar
          onOpenMaps={() => setDialog('maps')}
          onOpenShortcuts={() => setDialog('shortcuts')}
        />
        <div className="app__body">
          <Canvas />
          {inspectorOpen && <Inspector />}
        </div>
      </div>

      {dialog === 'maps' && <MapsDialog onClose={() => setDialog(null)} />}
      {dialog === 'shortcuts' && <ShortcutsDialog onClose={() => setDialog(null)} />}
      <Toasts />
    </ReactFlowProvider>
  )
}
